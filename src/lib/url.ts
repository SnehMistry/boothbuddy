// Cleans a URL for display: strips the protocol, "www.", and any query
// string (tracking params like utm_source are common on the company-URL
// links this renders and are pure noise to a human reader). Falls back to
// the raw string if it isn't a parseable URL.
export function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return `${host}${path}`;
  } catch {
    return url;
  }
}
