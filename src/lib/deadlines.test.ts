import { formatHumanDate } from './dates';
import { deadlineSortKey, isDueWithinDays, parseDeadline } from './deadlines';

describe('deadlineSortKey', () => {
  it('sorts missing deadlines last', () => {
    expect(deadlineSortKey(undefined)).toBe(Infinity);
  });

  it('sorts unparseable deadlines ("rolling", "ASAP") last, not dropped', () => {
    expect(deadlineSortKey('rolling')).toBe(Infinity);
    expect(deadlineSortKey('ASAP')).toBe(Infinity);
  });

  it('parses a real date into a comparable, ascending sort key', () => {
    const earlier = deadlineSortKey('2026-10-01');
    const later = deadlineSortKey('2026-11-01');
    expect(earlier).toBeLessThan(later);
  });
});

describe('isDueWithinDays', () => {
  const now = Date.parse('2026-10-01T00:00:00Z');

  it('is false for a missing deadline', () => {
    expect(isDueWithinDays(undefined, 7, now)).toBe(false);
  });

  it('is false for an unparseable deadline rather than guessing', () => {
    expect(isDueWithinDays('rolling', 7, now)).toBe(false);
  });

  it('is true for a deadline within the window', () => {
    expect(isDueWithinDays('2026-10-05', 7, now)).toBe(true);
  });

  it('is false for a deadline past the window', () => {
    expect(isDueWithinDays('2026-10-20', 7, now)).toBe(false);
  });

  it('is false for a deadline already in the past', () => {
    expect(isDueWithinDays('2026-09-01', 7, now)).toBe(false);
  });
});

describe('yearless deadlines ("November 15")', () => {
  const now = new Date(2026, 9, 11).getTime(); // Oct 11, 2026, local time

  it('means the next upcoming occurrence, not the engine default year (2001)', () => {
    expect(new Date(parseDeadline('November 15', now)).getFullYear()).toBe(2026);
  });

  it('rolls to next year once the date is well past', () => {
    expect(new Date(parseDeadline('March 1', now)).getFullYear()).toBe(2027);
  });

  it('keeps a just-missed deadline in the recent past', () => {
    expect(new Date(parseDeadline('October 1', now)).getFullYear()).toBe(2026);
  });

  it('leaves an explicit year alone', () => {
    expect(new Date(parseDeadline('November 15, 2027', now)).getFullYear()).toBe(2027);
  });

  it('counts toward "due this week" and sorts after earlier dated deadlines', () => {
    expect(isDueWithinDays('October 15', 7, now)).toBe(true);
    expect(deadlineSortKey('November 15', now)).toBeGreaterThan(deadlineSortKey('2026-11-01', now));
  });

  it('displays without an invented year', () => {
    expect(formatHumanDate('November 15')).not.toMatch(/2001/);
    expect(formatHumanDate('November 15')).toMatch(/15/);
  });
});
