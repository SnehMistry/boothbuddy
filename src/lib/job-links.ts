// Pre-filled search links shown next to every AI job suggestion. The AI
// isn't live-searching job boards, so it never supplies posting URLs
// (they'd be invented); instead these open real searches the user can
// verify in one tap.

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// "Software Engineer Intern, Summer 2027" → "Software Engineer Intern Summer 2027"
function keywords(...parts: (string | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .replace(/[,;|/()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function linkedinJobsSearchUrl(title: string, company?: string): string {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords(title, company))}`;
}

// Searches the company's own careers site for the role — a Google
// `site:` search, since every careers site's own search URL format differs.
// Falls back to a plain "<company> careers <title>" search without a site.
export function careersSearchUrl(title: string, company?: string, careersOrWebsiteUrl?: string): string {
  const host = hostOf(careersOrWebsiteUrl);
  const query = host ? `site:${host} ${keywords(title)}` : keywords(company, 'careers', title);
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
