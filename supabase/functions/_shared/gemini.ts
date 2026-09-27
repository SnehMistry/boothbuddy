// Thin wrapper around the Gemini API's generateContent endpoint. Deliberately
// plain fetch() rather than the @google/genai SDK — this is the long-stable
// REST surface (contents/parts/generationConfig), which keeps the Edge
// Function's only dependency being the network, no npm bundling to worry
// about in Deno.
//
// $0 budget rule (see PROMPT.md "$0 budget"): only the free-tier Flash model
// is used, requests are retried with backoff on 429 instead of failing, and
// contacts are processed one at a time by the caller (this module has no
// batching/concurrency of its own).

const MODEL = 'gemini-flash-latest';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1000;

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

// Retries on HTTP 429 (Gemini free-tier rate limit) with exponential
// backoff + jitter. Any other non-OK status throws immediately — those
// aren't rate limits, so retrying won't help.
async function callGemini(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<GeminiResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(`${API_BASE}/models/${MODEL}:generateContent`, {
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
    lastError = new Error(`Gemini ${response.status}: ${text.slice(0, 500)}`);

    if (response.status !== 429 || attempt === MAX_RETRIES) {
      throw lastError;
    }

    const jitter = Math.random() * 250;
    await sleep(BASE_DELAY_MS * 2 ** attempt + jitter);
  }

  // Unreachable — the loop above always returns or throws — but keeps the
  // type checker happy about a guaranteed return value.
  throw lastError ?? new Error('Gemini request failed');
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
