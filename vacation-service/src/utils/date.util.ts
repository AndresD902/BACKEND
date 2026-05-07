export function toDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function currentYear(): number {
  return new Date().getFullYear();
}
