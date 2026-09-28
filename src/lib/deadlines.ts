// AI-found deadlines are free text ("Oct 15", "rolling", no year) rather
// than a real date column (see the job_opportunities migration) — these
// are the two places that need to turn that text into something orderable/
// comparable, kept together (and tested) instead of duplicated inline in
// end-of-day.tsx and the web dashboard's stats.

// Best-effort parse for sorting a jobs list by deadline — anything that
// doesn't parse sorts to the end rather than being dropped.
export function deadlineSortKey(deadline?: string): number {
  if (!deadline) return Infinity;
  const parsed = Date.parse(deadline);
  return Number.isNaN(parsed) ? Infinity : parsed;
}

// Whether a deadline falls within the next `days` days of `now` — used for
// the "applications due this week" stat. Unparseable/missing deadlines are
// excluded rather than guessed at.
export function isDueWithinDays(deadline: string | undefined, days: number, now: number): boolean {
  if (!deadline) return false;
  const parsed = Date.parse(deadline);
  if (Number.isNaN(parsed)) return false;
  return parsed >= now && parsed <= now + days * 24 * 60 * 60 * 1000;
}
