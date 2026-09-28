// Thin wrapper around the Gemini API's generateContent endpoint. Deliberately
// plain fetch() rather than the @google/genai SDK — this is the long-stable
// REST surface (contents/parts/generationConfig), which keeps the Edge
// Function's only dependency being the network, no npm bundling to worry
// about in Deno.
//
// $0 budget rule (see PROMPT.md "$0 budget"): only free-tier models are
// used, requests are retried with backoff on 429 (rate limit) and 503
// (the model is overloaded — observed in practice, not just theoretical)
// instead of failing, and contacts are processed one at a time by the
// caller (this module has no batching/concurrency of its own).

const PRIMARY_MODEL = 'gemini-flash-latest';
// Tried only after PRIMARY_MODEL's own retries are exhausted on a 429/503 —
// a real, concrete model id (not a "-latest" alias, which isn't confirmed
// to exist for the lite variant) that's lighter/cheaper and thus more
// likely to have free capacity when the primary is overloaded.
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

// Google's pricing docs confirm a free Google Search grounding allowance
// (500 requests/day) specifically for the 2.5 series (Flash and
// Flash-Lite share that pool) — NOT for gemini-flash-latest, which
// resolves to a 3.x model with no free grounding. Whether a given API
// key/project can actually call 2.5-series models is genuinely
// undocumented (Google's own models page says access is "limited to
// users who have actively used them in the past" without saying whether
// that's enforced for new keys) — so this is an attempt, not a
// guarantee, and generateGrounded below falls back to ungrounded on the
// normal (definitely-accessible) models if it's rejected for any reason.
const GROUNDING_MODEL = 'gemini-2.5-flash';
const GROUNDING_FALLBACK_MODEL = 'gemini-2.5-flash-lite';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 3000;

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503;
}

// Thrown once retries on BOTH the primary and fallback model are exhausted
// for a 429/503 — as opposed to a plain Error, which means something else
// went wrong (bad request, no text in the response, etc.) that switching
// models wouldn't have fixed anyway. Callers/UI use this to show a friendly
// "AI is busy" message instead of a raw technical one.
export class AiBusyError extends Error {}

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiTool = { googleSearch: Record<string, never> };

// A subset of Google's Schema object (itself a subset of OpenAPI 3.0) —
// only what this app's response shapes need.
export type GeminiSchema = {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
  description?: string;
  enum?: string[];
  items?: GeminiSchema;
  properties?: Record<string, GeminiSchema>;
  required?: string[];
};

type GeminiCandidate = {
  content?: { parts?: { text?: string }[] };
  groundingMetadata?: {
    groundingChunks?: { web?: { uri?: string; title?: string } }[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  error?: { message?: string; status?: string };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries on HTTP 429 (rate limit) or 503 (model overloaded) with
// exponential backoff + jitter, against one specific model. Any other
// non-OK status throws immediately — those aren't transient, so retrying
// won't help. Tags an exhausted-retries error so callGemini (below) knows
// it's the "busy" case, not some other failure.
async function callGeminiOnModel(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
): Promise<GeminiResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(`${API_BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return (await response.json()) as GeminiResponse;
    }

    const text = await response.text();
    lastError = new Error(`Gemini ${response.status} (${model}): ${text.slice(0, 500)}`);

    if (!isRetryableStatus(response.status) || attempt === MAX_RETRIES) {
      throw lastError;
    }

    const jitter = Math.random() * 500;
    await sleep(BASE_DELAY_MS * 2 ** attempt + jitter);
  }

  // Unreachable — the loop above always returns or throws — but keeps the
  // type checker happy about a guaranteed return value.
  throw lastError ?? new Error('Gemini request failed');
}

// Tries `primaryModel` first (with its own retries above); if it's still
// 429/503 after exhausting those, falls back to `fallbackModel` before
// giving up. Doesn't fall back on other error types (bad request, access
// denied, empty response, etc.) — switching models wouldn't fix those,
// and doing it anyway would just hide the real error behind a confusing
// detour.
async function callGeminiWithFallback(
  apiKey: string,
  body: Record<string, unknown>,
  primaryModel: string,
  fallbackModel: string,
): Promise<GeminiResponse> {
  try {
    return await callGeminiOnModel(apiKey, primaryModel, body);
  } catch (primaryError) {
    const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
    if (!/^Gemini (429|503)/.test(primaryMessage)) throw primaryError;

    console.warn(`${primaryModel} busy, falling back to ${fallbackModel}:`, primaryMessage);
    try {
      return await callGeminiOnModel(apiKey, fallbackModel, body);
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new AiBusyError(
        `Google AI is busy right now — both ${primaryModel} and ${fallbackModel} are overloaded. Please try again in a bit.\n\nDetails: ${primaryMessage} | ${fallbackMessage}`,
      );
    }
  }
}

function callGemini(apiKey: string, body: Record<string, unknown>): Promise<GeminiResponse> {
  return callGeminiWithFallback(apiKey, body, PRIMARY_MODEL, FALLBACK_MODEL);
}

function extractText(response: GeminiResponse): string {
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini response had no text: ${JSON.stringify(response).slice(0, 500)}`);
  }
  return text;
}

// Structuring / vision call: strict JSON output via responseSchema. Gemini
// doesn't support combining responseSchema with tools (like googleSearch)
// on this model, which is why research (below) is a separate, unstructured
// call instead of being folded into this one.
export async function generateStructured<T>(
  apiKey: string,
  parts: GeminiPart[],
  schema: GeminiSchema,
): Promise<T> {
  const response = await callGemini(apiKey, {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });
  const text = extractText(response);
  return JSON.parse(text) as T;
}

export type GroundedResult = {
  text: string;
  grounded: boolean;
  groundingSources: { title: string; url: string }[];
};

// Research call: tries Google Search grounding first, on GROUNDING_MODEL
// specifically (see its comment above for why — that's where the free
// allowance actually is, not on PRIMARY_MODEL). Any failure (quota,
// permission/access-restricted, model doesn't support the tool, etc.)
// falls back to an ungrounded call on the normal models, clearly flagged
// via `grounded`.
export async function generateGrounded(
  apiKey: string,
  parts: GeminiPart[],
): Promise<GroundedResult> {
  try {
    const response = await callGeminiWithFallback(
      apiKey,
      {
        contents: [{ role: 'user', parts }],
        tools: [{ googleSearch: {} } satisfies GeminiTool],
      },
      GROUNDING_MODEL,
      GROUNDING_FALLBACK_MODEL,
    );
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
      .map((chunk) => ({ title: chunk.web?.title ?? '', url: chunk.web?.uri ?? '' }))
      .filter((source) => source.url);
    return { text: extractText(response), grounded: true, groundingSources: sources };
  } catch (groundedError) {
    console.warn('Grounded research failed, falling back to ungrounded:', groundedError);
    const response = await callGemini(apiKey, {
      contents: [{ role: 'user', parts }],
    });
    return { text: extractText(response), grounded: false, groundingSources: [] };
  }
}
