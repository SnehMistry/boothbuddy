// AI-found deadlines are free text ("Oct 15", "rolling", no year) rather
// than a real date column (see the job_opportunities migration) — these
// are the two places that need to turn that text into something orderable/
// comparable, kept together (and tested) instead of duplicated inline in
// end-of-day.tsx and the web dashboard's stats.

const DAY_MS = 24 * 60 * 60 * 1000;

// Parses a free-text deadline to a timestamp, or NaN. The catch: AI-found
// deadlines often have no year ("November 15"), and JS engines fill in a
// default year for those (V8 picks 2001), so a yearless deadline would
// sort first and never count as "due this week". Instead, a yearless date
// means its next occurrence — this year, unless it passed more than ~2
// months ago (then next year). The slack keeps a deadline you just missed
// showing as recently past instead of jumping a whole year ahead.
export function parseDeadline(deadline: string, now: number = Date.now()): number {
  const parsed = Date.parse(deadline);
  if (Number.isNaN(parsed) || /\b\d{4}\b/.test(deadline)) return parsed;
  const date = new Date(parsed);
  const thisYear = new Date(now).getFullYear();
  date.setFullYear(thisYear);
  if (date.getTime() < now - 60 * DAY_MS) date.setFullYear(thisYear + 1);
  return date.getTime();
}

// Best-effort parse for sorting a jobs list by deadline — anything that
// doesn't parse sorts to the end rather than being dropped.
export function deadlineSortKey(deadline?: string, now: number = Date.now()): number {
  if (!deadline) return Infinity;
  const parsed = parseDeadline(deadline, now);
  return Number.isNaN(parsed) ? Infinity : parsed;
}

// Whether a deadline falls within the next `days` days of `now` — used for
// the "applications due this week" stat. Unparseable/missing deadlines are
// excluded rather than guessed at.
export function isDueWithinDays(deadline: string | undefined, days: number, now: number): boolean {
  if (!deadline) return false;
  const parsed = parseDeadline(deadline, now);
  if (Number.isNaN(parsed)) return false;
  return parsed >= now && parsed <= now + days * DAY_MS;
}
