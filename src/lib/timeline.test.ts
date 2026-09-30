// The timeline logic lives with the Edge Functions (they're what use it),
// but it's plain TypeScript with no Deno APIs, so it's tested here.
import { describeTimeline, targetTimeline } from '../../supabase/functions/_shared/timeline';

describe('targetTimeline', () => {
  it('a December grad interns the same summer and starts early next year', () => {
    expect(targetTimeline('Fall 2027 (December 2027)')).toEqual({
      internshipSummer: 2027,
      newGradStart: 'early 2028',
    });
  });

  it('a May grad interned the summer before', () => {
    expect(targetTimeline('May 2026')).toEqual({ internshipSummer: 2025, newGradStart: 'summer/fall 2026' });
  });

  it('assumes spring when only a year is given', () => {
    expect(targetTimeline('2028')).toEqual({ internshipSummer: 2027, newGradStart: 'summer/fall 2028' });
  });

  it('returns null without a year', () => {
    expect(targetTimeline('soon')).toBeNull();
    expect(targetTimeline(undefined)).toBeNull();
  });
});

describe('describeTimeline', () => {
  it('spells out the target roles', () => {
    expect(describeTimeline(targetTimeline('Dec 2027'))).toBe(
      'Summer 2027 software/CS internships and co-ops, and new-grad roles starting early 2028',
    );
  });

  it('falls back to a generic description', () => {
    expect(describeTimeline(null)).toMatch(/summer before they graduate/);
  });
});
