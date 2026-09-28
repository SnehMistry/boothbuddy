import { formatHumanDate } from './dates';

describe('formatHumanDate', () => {
  it('formats a YYYY-MM-DD event date as a human date', () => {
    expect(formatHumanDate('2026-09-28')).toBe('Sep 28, 2026');
  });

  it('does not shift the day near a UTC-negative timezone boundary', () => {
    // A naive `new Date('2026-01-01').toLocaleDateString()` rolls back to
    // Dec 31 in any timezone behind UTC — this must not.
    expect(formatHumanDate('2026-01-01')).toBe('Jan 1, 2026');
  });

  it('reformats a parseable freeform deadline', () => {
    expect(formatHumanDate('October 15, 2026')).toBe('Oct 15, 2026');
  });

  it('falls back to the raw text for an unparseable deadline', () => {
    expect(formatHumanDate('rolling')).toBe('rolling');
    expect(formatHumanDate('ASAP')).toBe('ASAP');
  });
});
