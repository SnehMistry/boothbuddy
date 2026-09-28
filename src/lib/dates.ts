// Human-readable date formatting shared across the app — events store a
// guaranteed "YYYY-MM-DD" string (see BoothEvent['date']), while an
// AI-found job deadline is free text ("Oct 15", "rolling", no year) that
// may or may not parse. Both should read as "Sep 28, 2026", never the raw
// machine format, but a deadline that doesn't parse should still show
// as-is rather than disappearing.
export function formatHumanDate(input: string): string {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    // Built from components (not `new Date(input)`) so this doesn't shift a
    // day backward in negative-UTC-offset timezones, where parsing a bare
    // "YYYY-MM-DD" string as UTC midnight and displaying it in local time
    // rolls it back to the previous day.
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const parsed = Date.parse(input);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return input;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
