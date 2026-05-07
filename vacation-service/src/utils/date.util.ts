/**
 * Formats a Date object as a `YYYY-MM-DD` string using UTC, avoiding
 * timezone-related day shifts.
 */
export function toDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parses a `YYYY-MM-DD` string into a Date at midnight UTC.
 * Using UTC avoids DST issues when doing date arithmetic.
 */
export function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Returns the current calendar year in the local timezone. */
export function currentYear(): number {
  return new Date().getFullYear();
}
