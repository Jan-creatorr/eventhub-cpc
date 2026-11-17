import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Clock,
  MapPin,
  Plus,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, errorMessage } from '../lib/api';
import type { DashboardData, Registration } from '../lib/types';
import {
  categoryTheme,
  formatLongDate,
  formatShortDate,
  formatTimeRange,
  formatMonth,
  formatDay,
  daysUntil,
} from '../lib/format';
import { Avatar, Card, EmptyState, PageLoader, Progress, buttonClasses } from '../components/ui';
import { EventCard } from '../components/EventCard';
import { cn } from '../lib/cn';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const TONES = [
  'bg-brand-50 text-brand-600 ring-brand-100',
  'bg-amber-50 text-amber-600 ring-amber-100',
  'bg-sky-50 text-sky-600 ring-sky-100',
  'bg-purple-50 text-purple-600 ring-purple-100',
];

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  index,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  index: number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset', TONES[index % TONES.length])}>
          <Icon className="h-5 w-5" />
        </span>
        <TrendingUp className="h-4 w-4 text-slate-300" />
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold text-slate-900">
        {value.toLocaleString()}
      </p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
    </Card>
  );
}

function ScheduleRow({ registration }: { registration: Registration }) {
  const event = registration.event;
  const theme = categoryTheme(event.category);
  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50"
    >
      <span className={cn('flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br text-white', theme.gradient)}>
        <span className="text-[8px] font-bold uppercase leading-none">{formatMonth(event.eventDate)}</span>
        <span className="font-display text-sm font-extrabold leading-none">{formatDay(event.eventDate)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-brand-700">
          {event.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
          <Clock className="h-3 w-3" />
          {formatTimeRange(event.startTime, event.endTime)} · {event.venue}
        </span>
      </span>
      <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 sm:inline-flex">
        Registered
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
    </Link>
  );
}

export function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<DashboardData>('/dashboard')
      .then((result) => {
        if (active) setData(result);
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
  }, []);

  if (loading) return <PageLoader label="Preparing your dashboard…" />;
  if (error) {
    return <EmptyState icon={CalendarDays} title="Could not load your dashboard" description={error} />;
  }
  if (!data) return null;

  const firstName = user?.fullName.split(' ')[0] ?? 'student';
  const myRegistrations = data.myRegistrations ?? [];
  const nextRegistration = myRegistrations[0];
  const nextTheme = nextRegistration ? categoryTheme(nextRegistration.event.category) : null;

  const adminStats = [
    { icon: Users, label: 'CPC students', value: data.stats.totalUsers ?? 0, hint: 'Active student accounts' },
    { icon: CalendarDays, label: 'Total events', value: data.stats.totalEvents ?? 0, hint: 'Across all CPC organizers' },
    { icon: ClipboardList, label: 'Registrations', value: data.stats.totalRegistrations ?? 0, hint: 'Confirmed sign-ups' },
    { icon: CalendarCheck, label: 'Upcoming events', value: data.stats.upcomingEvents ?? 0, hint: 'Published and scheduled' },
  ];

  const studentStats = [
    { icon: Ticket, label: 'My registrations', value: data.stats.myRegistrations ?? 0, hint: 'Events you signed up for' },
    { icon: CalendarCheck, label: 'Upcoming', value: data.stats.upcomingRegistrations ?? 0, hint: 'Events still ahead' },
    { icon: Sparkles, label: 'Open events', value: data.upcomingEvents.length, hint: 'Published CPC events' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-6 py-7 text-white shadow-xl shadow-brand-900/20 sm:px-8">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-100 ring-1 ring-white/15">
              {isAdmin ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-gold-300" />
                  Organizer workspace
                </>
              ) : (
                <>
                  <Ticket className="h-3.5 w-3.5 text-gold-300" />
                  Student dashboard
                </>
              )}
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {greeting()}, {firstName}.
            </h2>
            <p className="mt-1.5 text-sm text-brand-100/80">
              {isAdmin
                ? 'Keep an eye on registrations and make sure every CPC event is ready to go.'
                : 'Here is what is happening around Cordova Public College and what is next on your calendar.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <>
                <Link to="/admin/events?new=1" className={buttonClasses('gold', 'md')}>
                  <Plus className="h-4 w-4" />
                  New event
                </Link>
                <Link
                  to="/admin/registrations"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
                >
                  <ClipboardList className="h-4 w-4" />
                  Registrations
                </Link>
              </>
            ) : (
              <>
                <Link to="/events" className={buttonClasses('gold', 'md')}>
                  <CalendarDays className="h-4 w-4" />
                  Browse events
                </Link>
                <Link to="/my-events" className={buttonClasses('secondary', 'md')}>
                  <Ticket className="h-4 w-4" />
                  My tickets
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(isAdmin ? adminStats : studentStats).map((stat, index) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            index={index}
          />
        ))}
        {!isAdmin && (
          <Card className="flex flex-col justify-between bg-gradient-to-br from-brand-600 to-teal-600 p-5 text-white">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-3">
              <p className="font-display text-lg font-bold">Find your next event</p>
              <p className="mt-0.5 text-xs text-brand-50/80">
                Fresh CPC activities are published every week.
              </p>
              <Link
                to="/events"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white underline-offset-2 hover:underline"
              >
                Explore events
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        )}
      </section>

      {isAdmin ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">Upcoming CPC events</h3>
                <p className="text-xs text-slate-500">The next events on the campus calendar</p>
              </div>
              <Link to="/admin/events" className="text-xs font-bold text-brand-600 hover:text-brand-700">
                Manage
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {data.upcomingEvents.length === 0 ? (
                <div className="p-5">
                  <EmptyState icon={CalendarDays} title="No upcoming events" description="Create an event to get the campus calendar going." />
                </div>
              ) : (
                data.upcomingEvents.slice(0, 5).map((event) => {
                  const theme = categoryTheme(event.category);
                  return (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50"
                    >
                      <span className={cn('flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br text-white', theme.gradient)}>
                        <span className="text-[8px] font-bold uppercase leading-none">{formatMonth(event.eventDate)}</span>
                        <span className="font-display text-sm font-extrabold leading-none">{formatDay(event.eventDate)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-brand-700">
                          {event.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {event.venue} · {event.organization}
                        </span>
                      </span>
                      <span className="hidden w-28 shrink-0 md:block">
                        <span className="flex justify-between text-[10px] font-semibold text-slate-400">
                          <span>{event.registeredCount}/{event.capacity}</span>
                          <span>{Math.round((event.registeredCount / event.capacity) * 100)}%</span>
                        </span>
                        <Progress value={event.registeredCount} total={event.capacity} className="mt-1" />
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                    </Link>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">Recent registrations</h3>
                <p className="text-xs text-slate-500">Latest student sign-ups</p>
              </div>
              <Link to="/admin/registrations" className="text-xs font-bold text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {(data.recentRegistrations ?? []).length === 0 ? (
                <div className="p-5">
                  <EmptyState icon={ClipboardList} title="No registrations yet" description="Student sign-ups will appear here." />
                </div>
              ) : (
                (data.recentRegistrations ?? []).slice(0, 6).map((row) => (
                  <div key={row.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={row.user.fullName} className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{row.user.fullName}</p>
                      <p className="truncate text-[11px] text-slate-500">{row.event.title}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-slate-400">
                      {formatShortDate(row.registeredAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="font-display text-base font-bold text-slate-900">Your next event</h3>
                <p className="text-xs text-slate-500">Your closest confirmed registration</p>
              </div>
              <div className="p-5">
                {nextRegistration && nextTheme ? (
                  <div className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white', nextTheme.gradient)}>
                    <div className="bg-dots pointer-events-none absolute inset-0 opacity-25" />
                    <div className="relative">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold ring-1 ring-white/25 backdrop-blur">
                          {nextRegistration.event.category}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold ring-1 ring-white/25">
                          <Ticket className="h-3 w-3" />
                          {daysUntil(nextRegistration.event.eventDate) === 0
                            ? 'Today'
                            : `In ${daysUntil(nextRegistration.event.eventDate)} days`}
                        </span>
                      </div>
                      <h4 className="mt-3 font-display text-xl font-extrabold leading-tight">
                        {nextRegistration.event.title}
                      </h4>
                      <p className="mt-1 text-xs text-white/80">{nextRegistration.event.organization}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">Date</p>
                          <p className="mt-0.5 font-semibold">{formatLongDate(nextRegistration.event.eventDate)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">Time</p>
                          <p className="mt-0.5 font-semibold">
                            {formatTimeRange(nextRegistration.event.startTime, nextRegistration.event.endTime)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">Venue</p>
                          <p className="mt-0.5 font-semibold">{nextRegistration.event.venue}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3">
                        <span className="text-[11px] font-medium text-white/70">
                          Ticket #{String(nextRegistration.id).padStart(5, '0')}
                        </span>
                        <Link
                          to={`/events/${nextRegistration.event.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-white/90"
                        >
                          View event
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={Ticket}
                    title="No upcoming tickets"
                    description="Register for a CPC event and your next ticket will show up here."
                    action={
                      <Link to="/events" className={buttonClasses('primary', 'sm')}>
                        Browse events
                      </Link>
                    }
                  />
                )}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">Your schedule</h3>
                  <p className="text-xs text-slate-500">Registered CPC events</p>
                </div>
                <Link to="/my-events" className="text-xs font-bold text-brand-600 hover:text-brand-700">
                  View all
                </Link>
              </div>
              <div className="p-3">
                {myRegistrations.length === 0 ? (
                  <EmptyState icon={CalendarCheck} title="Nothing scheduled" description="Your registered events will appear here." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {myRegistrations.slice(0, 5).map((registration) => (
                      <ScheduleRow key={registration.id} registration={registration} />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">Upcoming around CPC</h3>
                <p className="text-xs text-slate-500">Events you can still join</p>
              </div>
              <Link to="/events" className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.upcomingEvents.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
