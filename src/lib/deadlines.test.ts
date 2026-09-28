import { deadlineSortKey, isDueWithinDays } from './deadlines';

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
