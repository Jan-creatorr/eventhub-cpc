// Small helpers used to validate user input in one place.
// Keeping validation simple and readable is intentional for this project.

export function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8;
}

export function isValidStudentId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9-]{3,39}$/.test(value);
}

export function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function asPositiveInt(value: unknown): number | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return null;
  return number;
}
