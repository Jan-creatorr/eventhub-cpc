import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Plus, Search, Sparkles } from 'lucide-react';
import { EventCard } from '../components/EventCard';
import {
  Card,
  EmptyState,
  PageLoader,
  buttonClasses,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { apiRequest, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import type { CampusEvent, Registration } from '../lib/types';

type Timeframe = 'upcoming' | 'past' | 'all';
type StatusFilter = 'all' | 'published' | 'draft' | 'cancelled';

const TIME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function Events() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [myEventIds, setMyEventIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [timeframe, setTimeframe] = useState<Timeframe>('upcoming');
  const [status, setStatus] = useState<StatusFilter>('all');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const eventResult = await apiRequest<{ events: CampusEvent[] }>('/events');
        if (!active) return;
        setEvents(eventResult.events);

        if (!isAdmin) {
          const registrationResult = await apiRequest<{ registrations: Registration[] }>(
            '/registrations/me',
          );
          if (!active) return;
          setMyEventIds(
            new Set(
              registrationResult.registrations
                .filter((registration) => registration.status === 'registered')
                .map((registration) => registration.event.id),
            ),
          );
        }
      } catch (err) {
        if (active) setError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(events.map((event) => event.category)));
    return unique.sort();
  }, [events]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      if (category !== 'All' && event.category !== category) return false;
      if (isAdmin && status !== 'all' && event.status !== status) return false;

      const eventTime = new Date(event.eventDate).getTime();
      if (timeframe === 'upcoming' && eventTime < now) return false;
      if (timeframe === 'past' && eventTime >= now) return false;

      if (query) {
        const haystack = [
          event.title,
          event.organization,
          event.venue,
          event.category,
          event.description,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [events, category, status, timeframe, search, isAdmin]);

  if (loading) return <PageLoader label="Loading CPC events…" />;

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events, organizations, or venues…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex rounded-xl bg-slate-100 p-1">
              {TIME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimeframe(option.value)}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition sm:flex-none',
                    timeframe === option.value
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {isAdmin && (
              <Link
                to="/admin/events?new=1"
                className={buttonClasses('primary', 'sm', 'justify-center')}
              >
                <Plus className="h-4 w-4" />
                New event
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategory('All')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition',
              category === 'All'
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
            )}
          >
            All categories
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition',
                category === item
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {isAdmin && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <Sparkles className="h-3.5 w-3.5 text-slate-400" />
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset transition',
                  status === option.value
                    ? 'bg-slate-900 text-white ring-slate-900'
                    : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </Card>

      {error ? (
        <EmptyState icon={CalendarDays} title="Could not load events" description={error} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              <span className="font-bold text-slate-800">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'event' : 'events'}
              {category !== 'All' && (
                <>
                  {' '}in <span className="font-semibold text-slate-700">{category}</span>
                </>
              )}
            </p>
            {isAdmin && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-100">
                Organizer view
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No events match your filters"
              description="Try a different category, status, or search term."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCategory('All');
                    setStatus('all');
                    setTimeframe('all');
                  }}
                  className={buttonClasses('secondary', 'sm')}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  registered={myEventIds.has(event.id)}
                  showStatus={isAdmin}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
