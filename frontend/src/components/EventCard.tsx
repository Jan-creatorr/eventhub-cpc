import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, MapPin } from 'lucide-react';
import type { CampusEvent } from '../lib/types';
import { cn } from '../lib/cn';
import {
  categoryTheme,
  deadlineLabel,
  formatDay,
  formatMonth,
  formatShortDate,
  formatTimeRange,
  statusBadgeClass,
  statusLabel,
} from '../lib/format';
import { Progress } from './ui';

export function EventCard({
  event,
  registered = false,
  showStatus = false,
  className,
}: {
  event: CampusEvent;
  registered?: boolean;
  showStatus?: boolean;
  className?: string;
}) {
  const theme = categoryTheme(event.category);

  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_50px_-20px_rgba(15,23,42,0.28)]',
        className,
      )}
    >
      <div className={cn('relative h-36 overflow-hidden bg-gradient-to-br', theme.gradient)}>
        <div className="bg-dots absolute inset-0 opacity-30" />
        <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/15 blur-xl" />
        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/25 backdrop-blur">
            {event.category}
          </span>
          {showStatus && (
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset',
                statusBadgeClass(event.status),
              )}
            >
              {statusLabel(event.status)}
            </span>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">
            {event.organization}
          </p>
        </div>

        <div className="absolute -bottom-5 right-4 flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-white text-center shadow-lg ring-1 ring-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wide text-brand-600">
            {formatMonth(event.eventDate)}
          </span>
          <span className="font-display text-xl font-extrabold leading-none text-slate-900">
            {formatDay(event.eventDate)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 pt-6">
        <h3 className="line-clamp-2 font-display text-base font-bold leading-snug text-slate-900 transition group-hover:text-brand-700">
          {event.title}
        </h3>

        <div className="mt-3 space-y-1.5 text-xs text-slate-500">
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{event.venue}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {formatShortDate(event.eventDate)} ·{' '}
              {formatTimeRange(event.startTime, event.endTime)}
            </span>
          </p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-500">
              {event.registeredCount} / {event.capacity} registered
            </span>
            <span className={cn('font-bold', theme.text)}>
              {Math.min(100, Math.round((event.registeredCount / event.capacity) * 100))}%
            </span>
          </div>
          <Progress value={event.registeredCount} total={event.capacity} className="mt-1.5" />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
          {registered ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Registered
            </span>
          ) : (
            <span className="truncate text-xs font-medium text-slate-500">
              {deadlineLabel(event.registrationDeadline)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600">
            View
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
