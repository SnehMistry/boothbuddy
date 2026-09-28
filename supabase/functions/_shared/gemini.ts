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

// Tries the primary model first (with its own retries above); if it's
// still 429/503 after exhausting those, falls back to a lighter model
// before giving up. Doesn't fall back on other error types (bad request,
// empty response, etc.) — switching models wouldn't fix those, and doing
// it anyway would just hide the real error behind a confusing detour.
async function callGemini(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<GeminiResponse> {
  try {
    return await callGeminiOnModel(apiKey, PRIMARY_MODEL, body);
  } catch (primaryError) {
    const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
    if (!/^Gemini (429|503)/.test(primaryMessage)) throw primaryError;

    console.warn(`${PRIMARY_MODEL} busy, falling back to ${FALLBACK_MODEL}:`, primaryMessage);
    try {
      return await callGeminiOnModel(apiKey, FALLBACK_MODEL, body);
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new AiBusyError(
        `Google AI is busy right now — both ${PRIMARY_MODEL} and ${FALLBACK_MODEL} are overloaded. Please try again in a bit.\n\nDetails: ${primaryMessage} | ${fallbackMessage}`,
      );
    }
  }
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

// Research call: tries Google Search grounding first (free on this model's
// tier as of writing — see PROMPT.md "$0 budget" — but tier limits and
// eligibility shift, so this doesn't assume it'll succeed). Any failure
// (quota, permission, model doesn't support the tool, etc.) falls back to
// an ungrounded call on the same model, clearly flagged via `grounded`.
export async function generateGrounded(
  apiKey: string,
  parts: GeminiPart[],
): Promise<GroundedResult> {
  try {
    const response = await callGemini(apiKey, {
      contents: [{ role: 'user', parts }],
      tools: [{ googleSearch: {} } satisfies GeminiTool],
    });
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
