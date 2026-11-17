import type { EventStatus } from './types';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatLongDate(value: string | Date): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatShortDate(value: string | Date): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatMonth(value: string | Date): string {
  return MONTHS[toDate(value).getMonth()] ?? '—';
}

export function formatDay(value: string | Date): string {
  return String(toDate(value).getDate());
}

export function formatTime12(time: string): string {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteText} ${suffix}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime12(start)} – ${formatTime12(end)}`;
}

export function daysUntil(value: string | Date): number {
  const date = toDate(value);
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isPast(value: string | Date): boolean {
  return toDate(value).getTime() < Date.now();
}

export function deadlineLabel(value: string | Date): string {
  const days = daysUntil(value);
  if (days < 0) return 'Registration closed';
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  return `Closes in ${days} days`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export type CategoryTheme = {
  badge: string;
  gradient: string;
  soft: string;
  text: string;
  ring: string;
};

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  Academic: {
    badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    soft: 'bg-emerald-50 text-emerald-700',
    text: 'text-emerald-600',
    ring: 'ring-emerald-200',
  },
  Sports: {
    badge: 'bg-orange-100 text-orange-700 ring-orange-200',
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    soft: 'bg-orange-50 text-orange-700',
    text: 'text-orange-600',
    ring: 'ring-orange-200',
  },
  Cultural: {
    badge: 'bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200',
    gradient: 'from-fuchsia-500 via-purple-500 to-violet-600',
    soft: 'bg-fuchsia-50 text-fuchsia-700',
    text: 'text-fuchsia-600',
    ring: 'ring-fuchsia-200',
  },
  'Student Government': {
    badge: 'bg-blue-100 text-blue-700 ring-blue-200',
    gradient: 'from-blue-500 via-indigo-500 to-indigo-700',
    soft: 'bg-blue-50 text-blue-700',
    text: 'text-blue-600',
    ring: 'ring-blue-200',
  },
  Organization: {
    badge: 'bg-cyan-100 text-cyan-700 ring-cyan-200',
    gradient: 'from-cyan-500 via-sky-500 to-blue-600',
    soft: 'bg-cyan-50 text-cyan-700',
    text: 'text-cyan-600',
    ring: 'ring-cyan-200',
  },
  Seminar: {
    badge: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
    gradient: 'from-indigo-500 via-violet-500 to-purple-600',
    soft: 'bg-indigo-50 text-indigo-700',
    text: 'text-indigo-600',
    ring: 'ring-indigo-200',
  },
  'Community Outreach': {
    badge: 'bg-teal-100 text-teal-700 ring-teal-200',
    gradient: 'from-teal-500 via-emerald-500 to-green-600',
    soft: 'bg-teal-50 text-teal-700',
    text: 'text-teal-600',
    ring: 'ring-teal-200',
  },
  Orientation: {
    badge: 'bg-sky-100 text-sky-700 ring-sky-200',
    gradient: 'from-sky-500 via-cyan-500 to-teal-600',
    soft: 'bg-sky-50 text-sky-700',
    text: 'text-sky-600',
    ring: 'ring-sky-200',
  },
  'Foundation Day': {
    badge: 'bg-amber-100 text-amber-700 ring-amber-200',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    soft: 'bg-amber-50 text-amber-700',
    text: 'text-amber-600',
    ring: 'ring-amber-200',
  },
};

const DEFAULT_THEME: CategoryTheme = {
  badge: 'bg-slate-100 text-slate-700 ring-slate-200',
  gradient: 'from-slate-600 via-slate-700 to-slate-900',
  soft: 'bg-slate-50 text-slate-700',
  text: 'text-slate-600',
  ring: 'ring-slate-200',
};

export function categoryTheme(category: string): CategoryTheme {
  return CATEGORY_THEMES[category] ?? DEFAULT_THEME;
}

export function statusLabel(status: EventStatus): string {
  if (status === 'published') return 'Published';
  if (status === 'draft') return 'Draft';
  return 'Cancelled';
}

export function statusBadgeClass(status: EventStatus): string {
  if (status === 'published') return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
  if (status === 'draft') return 'bg-amber-100 text-amber-700 ring-amber-200';
  return 'bg-rose-100 text-rose-700 ring-rose-200';
}

export function capacityPercent(registered: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((registered / capacity) * 100));
}

export function todayInputValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function toDateTimeInput(value: string): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
