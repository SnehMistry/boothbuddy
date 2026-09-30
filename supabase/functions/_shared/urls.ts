// Model-suggested URLs (company website, careers page) come from the
// model's own knowledge and can be stale or made up, so each one is checked
// with a real request before it's stored. Only a clear "doesn't exist"
// (DNS failure, timeout, 404/410, 5xx) rejects a URL — many careers sites
// answer bots with 403/429, which still proves the page exists.

const TIMEOUT_MS = 6000;

export function normalizeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Resolves to the final URL after redirects if reachable, otherwise null.
export async function verifyUrl(raw: string | null | undefined): Promise<string | null> {
  const url = normalizeHttpUrl(raw);
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BoothBuddy link check)' },
    });
    await response.body?.cancel();
    if (response.status === 404 || response.status === 410 || response.status >= 500) return null;
    return response.url || url;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
