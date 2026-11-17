import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Clock,
  MapPin,
  Ticket,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageLoader,
  buttonClasses,
} from '../components/ui';
import { useToast } from '../components/toast';
import { useAuth } from '../context/AuthContext';
import { apiRequest, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import type { Registration } from '../lib/types';
import {
  categoryTheme,
  formatDay,
  formatLongDate,
  formatMonth,
  formatShortDate,
  formatTimeRange,
} from '../lib/format';

type Filter = 'all' | 'upcoming' | 'past';

type CancelRegistrationResponse = {
  message: string;
  registration: {
    id: number;
    userId: number;
    eventId: number;
    status: 'cancelled';
  };
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All tickets' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

export function MyRegistrations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<Registration | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<{ registrations: Registration[] }>('/registrations/me')
      .then((result) => {
        if (!active) return;
        setRegistrations(result.registrations);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      total: registrations.length,
      active: registrations.filter((registration) => registration.status === 'registered').length,
      upcoming: registrations.filter(
        (registration) =>
          registration.status === 'registered' &&
          new Date(registration.event.eventDate).getTime() >= now,
      ).length,
    };
  }, [registrations]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return registrations.filter((registration) => {
      if (filter === 'upcoming') {
        return (
          registration.status === 'registered' &&
          new Date(registration.event.eventDate).getTime() >= now
        );
      }
      if (filter === 'past') {
        return (
          registration.status === 'registered' &&
          new Date(registration.event.eventDate).getTime() < now
        );
      }
      return true;
    });
  }, [registrations, filter]);

  const handleCancel = async () => {
    if (!cancelTarget || cancelTarget.status !== 'registered') return;
    const target = cancelTarget;
    setWorking(true);
    try {
      const response = await apiRequest<CancelRegistrationResponse>(
        `/registrations/${target.id}`,
        { method: 'DELETE' },
      );
      const cancelled = response.registration;
      if (
        cancelled?.id === target.id &&
        cancelled.status === 'cancelled' &&
        user?.id === cancelled.userId
      ) {
        setRegistrations((current) =>
          current.filter((registration) => registration.id !== cancelled.id),
        );
      }
      toast('Your registration has been cancelled and removed from My Registrations.', 'info');
      setCancelTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <PageLoader label="Loading your tickets…" />;
  if (error) {
    return <EmptyState icon={Ticket} title="Could not load your tickets" description={error} />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        {[
          { label: 'Active tickets', value: counts.active, icon: Ticket, tone: 'bg-brand-50 text-brand-600 ring-brand-100' },
          { label: 'Upcoming events', value: counts.upcoming, icon: CalendarCheck, tone: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="flex items-center gap-3 p-5">
              <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset', stat.tone)}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-2xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
              </div>
            </Card>
          );
        })}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ring-inset transition',
              filter === item.value
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No tickets in this view"
          description="Browse upcoming CPC events and register to collect your first ticket."
          action={
            <Link to="/events" className={buttonClasses('primary', 'sm')}>
              Browse events
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((registration) => {
            const event = registration.event;
            const theme = categoryTheme(event.category);
            const eventPast = new Date(event.eventDate).getTime() < Date.now();

            return (
              <Card key={registration.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div
                    className={cn(
                      'relative flex w-full shrink-0 flex-row items-center gap-3 bg-gradient-to-br p-5 text-white sm:w-40 sm:flex-col sm:justify-center sm:gap-1',
                      theme.gradient,
                    )}
                  >
                    <div className="bg-dots pointer-events-none absolute inset-0 opacity-20" />
                    <span className="relative flex flex-col items-center sm:block">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                        {formatMonth(event.eventDate)}
                      </span>
                      <span className="font-display text-3xl font-extrabold leading-none">
                        {formatDay(event.eventDate)}
                      </span>
                    </span>
                    <span className="relative text-xs font-semibold text-white/80 sm:mt-1 sm:text-center">
                      {formatTimeRange(event.startTime, event.endTime)}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset', theme.badge)}>
                        {event.category}
                      </span>
                      {eventPast ? (
                        <Badge tone="slate">Event ended</Badge>
                      ) : (
                        <Badge tone="emerald">Registered</Badge>
                      )}
                    </div>

                    <Link
                      to={`/events/${event.id}`}
                      className="mt-2 font-display text-lg font-bold text-slate-900 transition hover:text-brand-700"
                    >
                      {event.title}
                    </Link>
                    <p className="text-xs font-medium text-slate-500">{event.organization}</p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {formatLongDate(event.eventDate)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {formatTimeRange(event.startTime, event.endTime)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {event.venue}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-slate-200 pt-3.5">
                      <div className="text-[11px] text-slate-400">
                        <p className="font-semibold text-slate-600">
                          Ticket #{String(registration.id).padStart(5, '0')}
                        </p>
                        <p>Registered {formatShortDate(registration.registeredAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/events/${event.id}`}
                          className={buttonClasses('secondary', 'sm')}
                        >
                          View event
                        </Link>
                        {registration.status === 'registered' && !eventPast && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600"
                            onClick={() => setCancelTarget(registration)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Cancel this registration?"
        description="Your ticket will be cancelled and removed from My Registrations."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={working}>
              Keep ticket
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={working}>
              Cancel registration
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          You are about to cancel your slot for{' '}
          <span className="font-semibold text-slate-900">{cancelTarget?.event.title}</span>.
          You can register again later if slots remain available.
        </p>
      </Modal>
    </div>
  );
}
