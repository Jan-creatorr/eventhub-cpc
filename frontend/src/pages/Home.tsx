import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
  Zap,
} from 'lucide-react';
import { EventCard } from '../components/EventCard';
import { buttonClasses } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  COLLEGE_SHORT_NAME,
} from '../lib/cpc';
import {
  capacityPercent,
  categoryTheme,
  formatShortDate,
  formatTimeRange,
} from '../lib/format';
import type { CampusEvent, PublicStats } from '../lib/types';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Open to every CPC student',
    body: 'Create an account with any email address you can access. Your CPC student ID and course keep your campus profile accurate.',
    tone: 'bg-brand-50 text-brand-700 ring-brand-100',
  },
  {
    icon: Zap,
    title: 'One-tap registration',
    body: 'Reserve your slot in a single click. Live capacity checks mean no double bookings and no last-slot surprises.',
    tone: 'bg-amber-50 text-amber-700 ring-amber-100',
  },
  {
    icon: Ticket,
    title: 'Digital event tickets',
    body: 'Every sign-up becomes a tidy digital ticket with the venue, time, and organizer right where you need it.',
    tone: 'bg-sky-50 text-sky-700 ring-sky-100',
  },
  {
    icon: Users,
    title: 'Built for organizers',
    body: 'Student councils and CPC offices publish events, track participants, and manage capacity from one dashboard.',
    tone: 'bg-purple-50 text-purple-700 ring-purple-100',
  },
];

const STEPS = [
  {
    title: 'Create your account in minutes',
    body: 'Sign up with any email address, add your CPC student ID and course, and you are ready to register for events.',
  },
  {
    title: 'Discover campus events',
    body: 'Browse everything from foundation day to hackathons, filtered by category, organizer, or date.',
  },
  {
    title: 'Save your seat',
    body: 'Register in one click and keep your digital ticket in EventHub until the event day.',
  },
];

export function Home() {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      apiRequest<{ events: CampusEvent[] }>('/public/events').catch(() => ({ events: [] })),
      apiRequest<{ stats: PublicStats }>('/public/stats').catch(() => null),
    ]).then(([eventsResult, statsResult]) => {
      if (!active) return;
      setEvents(eventsResult.events);
      if (statsResult) setStats(statsResult.stats);
      setLoadingEvents(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const firstName = user?.fullName.split(' ')[0] ?? 'student';
  const featured = events[0];
  const featuredTheme = featured ? categoryTheme(featured.category) : null;
  const secondaryHref = isAdmin ? '/admin/events' : '/my-events';
  const secondaryLabel = isAdmin ? 'Manage events' : 'My registrations';

  const statCards = [
    { label: 'CPC students', value: stats?.students ?? 0 },
    { label: 'Upcoming events', value: stats?.upcomingEvents ?? 0 },
    { label: 'Event registrations', value: stats?.registrations ?? 0 },
    { label: 'CPC organizations', value: stats?.organizations ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-950 to-brand-900 shadow-2xl shadow-brand-950/20">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-10 h-80 w-80 rounded-full bg-gold-400/15 blur-3xl" />

        <div className="relative grid gap-10 px-6 py-10 sm:px-9 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-12">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-brand-100 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5 text-gold-300" />
              The official event platform of Cordova Public College
            </span>

            <h1 className="mt-5 font-display text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl xl:text-5xl">
              Welcome back, <span className="text-gold-300">{firstName}</span>.
              <span className="mt-2 block bg-gradient-to-r from-brand-100 via-white to-gold-200 bg-clip-text text-2xl text-transparent sm:text-3xl">
                Campus life, beautifully organized.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-100/80 sm:text-base">
              Discover official {COLLEGE_SHORT_NAME} events, reserve your slot in
              seconds, and keep every ticket in one place.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/events" className={buttonClasses('gold', 'md', 'group')}>
                Browse events
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to={secondaryHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
              >
                <Ticket className="h-4 w-4" />
                {secondaryLabel}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex -space-x-2">
                {['JD', 'MS', 'KR', 'AV'].map((person, index) => (
                  <span
                    key={person}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand-950 bg-gradient-to-br from-brand-400 to-brand-700 text-[10px] font-bold text-white shadow-sm"
                    style={{ zIndex: 10 - index }}
                  >
                    {person}
                  </span>
                ))}
              </div>
              <div className="text-sm">
                <p className="flex items-center gap-1 font-semibold text-white">
                  {stats?.students ?? 0}+ CPC students
                  <span className="ml-1 inline-flex items-center gap-0.5 text-gold-300">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </span>
                </p>
                <p className="text-xs text-brand-100/60">
                  One account for every CPC event
                </p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-gold-400/25 via-transparent to-white/5 blur-2xl" />

            <div className="relative rounded-[1.75rem] border border-white/15 bg-white/10 p-2.5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between px-2 pb-2.5 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-100/60">
                  Happening soon
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200 ring-1 ring-emerald-300/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Live
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
                {featured ? (
                  <>
                    <div
                      className={`relative h-32 bg-gradient-to-br ${featuredTheme?.gradient ?? ''}`}
                    >
                      <div className="bg-dots absolute inset-0 opacity-30" />
                      <span className="absolute left-4 top-4 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white ring-1 ring-white/30 backdrop-blur">
                        {featured.category}
                      </span>
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">
                          {featured.organization}
                        </p>
                        <p className="line-clamp-1 font-display text-lg font-bold leading-tight">
                          {featured.title}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                          {formatShortDate(featured.eventDate)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatTimeRange(featured.startTime, featured.endTime)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {featured.venue}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span className="text-slate-500">
                            {featured.registeredCount} / {featured.capacity} registered
                          </span>
                          <span className="text-brand-600">
                            {capacityPercent(featured.registeredCount, featured.capacity)}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-teal-500"
                            style={{
                              width: `${capacityPercent(featured.registeredCount, featured.capacity)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <Link
                        to={`/events/${featured.id}`}
                        className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Ticket className="h-3.5 w-3.5" />
                          View event details
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                    <CalendarDays className="h-8 w-8 text-slate-300" />
                    <p className="mt-3 font-display text-base font-semibold text-slate-900">
                      No upcoming events yet
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      New CPC events will appear here soon.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="animate-float absolute -right-3 -top-6 hidden rounded-2xl border border-white/70 bg-white p-3 shadow-xl sm:flex">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">Registration confirmed</p>
                  <p className="text-[10px] text-slate-500">Ticket saved to your account</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center shadow-sm"
          >
            <p className="font-display text-2xl font-extrabold text-slate-900">
              {stat.value.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      <section id="events">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
              What&apos;s on
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Upcoming CPC events
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Every event is organized by a recognized Cordova Public College
              office or student organization.
            </p>
          </div>
          <Link to="/events" className={buttonClasses('secondary', 'sm', 'group')}>
            View all events
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loadingEvents
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[22rem] animate-pulse rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="h-36 rounded-t-2xl bg-slate-100" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-3/4 rounded bg-slate-100" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                    <div className="h-2 w-full rounded bg-slate-100" />
                  </div>
                </div>
              ))
            : events.map((event) => <EventCard key={event.id} event={event} />)}
          {!loadingEvents && events.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-display text-base font-semibold text-slate-900">
                No upcoming events yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                CPC organizations will publish new events here soon.
              </p>
            </div>
          )}
        </div>
      </section>

      <section
        id="features"
        className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-9"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            Why EventHub
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Purpose-built for CPC campus life
          </h2>
          <p className="mt-3 text-sm text-slate-500 sm:text-base">
            A focused event platform instead of scattered group chats, printed
            sign-up sheets, and lost spreadsheets.
          </p>
        </div>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset ${feature.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feature.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-6 py-9 shadow-xl sm:px-10">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="relative lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-brand-100 ring-1 ring-white/15">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-300" />
              Open to the CPC community
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-white sm:text-3xl">
              Built for CPC. Open to students.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-100/80">
              Create your account with any email address. Your CPC student ID and
              course keep every registration tied to the right student.
            </p>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-2 lg:mt-0 lg:justify-end">
            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/15">
              Any email address
            </span>
            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/15">
              CPC student ID
            </span>
            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/15">
              Digital event tickets
            </span>
          </div>
        </div>
      </section>

      <section id="how" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-9">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            How it works
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            From discovery to ticket in minutes
          </h2>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6"
            >
              <span className="font-display text-4xl font-extrabold text-brand-100">
                0{index + 1}
              </span>
              <h3 className="mt-2 font-display text-base font-bold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-teal-600 px-6 py-10 text-center shadow-xl sm:px-12">
        <div className="bg-dots absolute inset-0 opacity-25" />
        <div className="relative">
          <GraduationCap className="mx-auto h-10 w-10 text-white/80" />
          <h2 className="mt-4 font-display text-2xl font-extrabold text-white sm:text-3xl">
            Ready for your next campus moment?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-brand-50/90 sm:text-base">
            One account, every event, zero paper forms. Your next {COLLEGE_SHORT_NAME}{' '}
            memory is one registration away.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/events" className={buttonClasses('gold', 'lg', 'group')}>
              Browse events
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to={secondaryHref} className={buttonClasses('dark', 'lg')}>
              <Ticket className="h-4 w-4" />
              {secondaryLabel}
            </Link>
          </div>
          <p className="mt-5 text-xs font-medium text-brand-100/80">
            Free for all enrolled Cordova Public College students
          </p>
        </div>
      </section>
    </div>
  );
}
