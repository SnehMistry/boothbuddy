// Turns a free-text graduation date ("Fall 2027 (December 2027)", "May
// 2026", "2028") into the recruiting timeline job suggestions should
// target — e.g. a December 2027 grad wants Summer 2027 internships and
// new-grad roles starting early 2028. Pure (no Deno APIs) so the app's
// Jest suite can unit-test it too.

const LATE_YEAR = /\b(fall|autumn|winter|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)\b/i;

export type TargetTimeline = {
  internshipSummer: number;
  newGradStart: string; // e.g. "early 2028"
};

export function targetTimeline(graduation: string | null | undefined): TargetTimeline | null {
  if (!graduation) return null;
  const years = [...graduation.matchAll(/\b(20\d\d)\b/g)].map((m) => Number(m[1]));
  if (years.length === 0) return null;
  const gradYear = years[0];

  // Graduating in the fall/winter leaves one more summer the same year;
  // graduating in the spring/summer means the last internship summer was
  // the year before, and new-grad roles start that summer/fall.
  if (LATE_YEAR.test(graduation)) {
    return { internshipSummer: gradYear, newGradStart: `early ${gradYear + 1}` };
  }
  return { internshipSummer: gradYear - 1, newGradStart: `summer/fall ${gradYear}` };
}

export function describeTimeline(timeline: TargetTimeline | null): string {
  if (!timeline) {
    return 'internships/co-ops for the summer before they graduate, and new-grad roles starting right after graduation';
  }
  return `Summer ${timeline.internshipSummer} software/CS internships and co-ops, and new-grad roles starting ${timeline.newGradStart}`;
}
