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

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'fbclid',
  'mc_cid',
  'mc_eid',
];

// Removes known marketing-tracking query params before a URL is saved, so
// the junk doesn't linger in the database (and later, a CSV export) even
// though displayUrl() already hides it on screen. Falls back to the raw
// string if it isn't a parseable URL — never throws on a scanned QR code
// or typed value that happens to not be a real URL.
export function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);
    for (const param of TRACKING_PARAMS) parsed.searchParams.delete(param);
    const query = parsed.searchParams.toString();
    return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ''}${parsed.hash}`;
  } catch {
    return url;
  }
}
