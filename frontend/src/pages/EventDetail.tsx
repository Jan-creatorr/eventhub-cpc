import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  Pencil,
  Ticket,
  Users,
} from 'lucide-react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageLoader,
  Progress,
  buttonClasses,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/toast';
import { apiRequest, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import type { CampusEvent, Participant, Registration } from '../lib/types';
import {
  categoryTheme,
  daysUntil,
  formatDay,
  formatLongDate,
  formatMonth,
  formatShortDate,
  formatTimeRange,
  statusBadgeClass,
  statusLabel,
} from '../lib/format';

type EventWithRegistration = CampusEvent & { myRegistration: Registration | null };

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<EventWithRegistration | null>(null);
  const [myRegistration, setMyRegistration] = useState<Registration | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const result = await apiRequest<{ event: EventWithRegistration }>(`/events/${id}`);
        if (!active) return;
        setEvent(result.event);
        setMyRegistration(result.event.myRegistration);

        if (isAdmin) {
          const participantResult = await apiRequest<{ participants: Participant[] }>(
            `/registrations/event/${id}`,
          );
          if (active) setParticipants(participantResult.participants);
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
  }, [id, isAdmin, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const handleRegister = async () => {
    if (!event) return;
    setWorking(true);
    try {
      await apiRequest(`/registrations/${event.id}`, { method: 'POST' });
      toast('You are registered. Your ticket is ready in My Registrations.');
      refresh();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleCancel = async () => {
    if (!myRegistration) return;
    setWorking(true);
    try {
      await apiRequest(`/registrations/${myRegistration.id}`, { method: 'DELETE' });
      toast('Your registration has been cancelled.', 'info');
      setCancelOpen(false);
      refresh();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <PageLoader label="Loading event details…" />;
  if (error || !event) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Event not available"
        description={error ?? 'This event could not be found.'}
        action={
          <Link to="/events" className={buttonClasses('primary', 'sm')}>
            Back to events
          </Link>
        }
      />
    );
  }

  const theme = categoryTheme(event.category);
  const isRegistered = myRegistration?.status === 'registered';
  const slotsLeft = Math.max(0, event.capacity - event.registeredCount);
  const eventPast = new Date(event.eventDate).getTime() < Date.now();
  const deadlinePast = new Date(event.registrationDeadline).getTime() < Date.now();
  const full = slotsLeft <= 0;

  return (
    <div className="space-y-6">
      <Link
        to="/events"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      {/* Hero */}
      <section className={cn('relative overflow-hidden rounded-3xl bg-gradient-to-br px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10', theme.gradient)}>
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold ring-1 ring-white/25 backdrop-blur">
                {event.category}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold ring-1 ring-white/25 backdrop-blur">
                {event.organization}
              </span>
              {isAdmin && (
                <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold ring-1 ring-inset', statusBadgeClass(event.status))}>
                  {statusLabel(event.status)}
                </span>
              )}
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {event.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatLongDate(event.eventDate)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatTimeRange(event.startTime, event.endTime)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {event.venue}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur">
            <span className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-white text-center">
              <span className="text-[9px] font-bold uppercase text-brand-600">
                {formatMonth(event.eventDate)}
              </span>
              <span className="font-display text-xl font-extrabold leading-none text-slate-900">
                {formatDay(event.eventDate)}
              </span>
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-white/60">
                {eventPast ? 'Event ended' : daysUntil(event.eventDate) === 0 ? 'Happening today' : 'Days to go'}
              </p>
              <p className="font-display text-lg font-extrabold">
                {eventPast ? 'Completed' : Math.max(0, daysUntil(event.eventDate))}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">About this event</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {event.description}
            </p>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: CalendarDays, label: 'Date', value: formatLongDate(event.eventDate) },
              { icon: Clock, label: 'Time', value: formatTimeRange(event.startTime, event.endTime) },
              { icon: MapPin, label: 'Venue', value: event.venue },
              { icon: Building2, label: 'Organized by', value: event.organization },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="flex items-start gap-3 p-4">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', theme.soft)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{item.value}</p>
                  </div>
                </Card>
              );
            })}
          </div>

          {isAdmin && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Participants
                  </h2>
                  <p className="text-xs text-slate-500">
                    {participants.length} registered student{participants.length === 1 ? '' : 's'}
                  </p>
                </div>
                <Link
                  to={`/admin/events?edit=${event.id}`}
                  className={buttonClasses('secondary', 'sm')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit event
                </Link>
              </div>

              {participants.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={Users}
                    title="No participants yet"
                    description="Student registrations for this event will show up here."
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2 p-4 sm:hidden">
                    {participants.map((participant) => (
                      <div
                        key={participant.registrationId}
                        className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"
                      >
                        <Avatar name={participant.fullName} className="h-9 w-9" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-800">
                            {participant.fullName}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {participant.email}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {participant.studentId} · {participant.course}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Registered {formatShortDate(participant.registeredAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[34rem] text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-5 py-2.5">Student</th>
                        <th className="px-5 py-2.5">Student ID</th>
                        <th className="px-5 py-2.5">Course</th>
                        <th className="px-5 py-2.5">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {participants.map((participant) => (
                        <tr key={participant.registrationId} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={participant.fullName} className="h-8 w-8" />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-800">
                                  {participant.fullName}
                                </p>
                                <p className="truncate text-[11px] text-slate-500">
                                  {participant.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs font-semibold text-slate-600">
                            {participant.studentId}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {participant.course}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {formatShortDate(participant.registeredAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>

        {/* Registration sidebar */}
        <div>
          <Card className="p-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">Registration</h2>
              {isRegistered ? (
                <Badge tone="emerald">
                  <CheckCircle2 className="h-3 w-3" />
                  You're in
                </Badge>
              ) : (
                <Badge tone={full ? 'rose' : 'brand'}>
                  {full ? 'Full' : `${slotsLeft} slots left`}
                </Badge>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span className="text-slate-700">
                  {event.registeredCount} registered
                </span>
                <span>{event.capacity} capacity</span>
              </div>
              <Progress value={event.registeredCount} total={event.capacity} className="mt-2" />
              <p className="mt-2 text-[11px] text-slate-500">
                {full
                  ? 'This event has reached its capacity.'
                  : `${slotsLeft} of ${event.capacity} slots still available.`}
              </p>
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <Hourglass className="h-4 w-4" />
                  Deadline
                </dt>
                <dd className="text-right font-semibold text-slate-800">
                  {formatShortDate(event.registrationDeadline)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <Building2 className="h-4 w-4" />
                  Organizer
                </dt>
                <dd className="text-right font-semibold text-slate-800">
                  {event.organization}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <Ticket className="h-4 w-4" />
                  Category
                </dt>
                <dd className="text-right font-semibold text-slate-800">{event.category}</dd>
              </div>
            </dl>

            <div className="mt-5">
              {isAdmin ? (
                <div className="space-y-3">
                  <Alert tone="info">
                    You are signed in as an organizer. Admins manage events instead of
                    registering for them.
                  </Alert>
                  <Link
                    to={`/admin/events?edit=${event.id}`}
                    className={buttonClasses('primary', 'md', 'w-full')}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit this event
                  </Link>
                </div>
              ) : isRegistered ? (
                <div className="space-y-3">
                  <Alert tone="success">
                    Your slot is confirmed. You can cancel from here or from My
                    Registrations.
                  </Alert>
                  {eventPast ? (
                    <p className="text-center text-xs font-medium text-slate-400">
                      This event has already taken place.
                    </p>
                  ) : (
                    <Button
                      variant="secondary"
                      className="w-full text-rose-600"
                      onClick={() => setCancelOpen(true)}
                      disabled={working}
                    >
                      Cancel registration
                    </Button>
                  )}
                  <Link
                    to="/my-events"
                    className={buttonClasses('ghost', 'sm', 'w-full')}
                  >
                    View my tickets
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : event.status !== 'published' ? (
                <Alert tone="warning">This event is not open for registration.</Alert>
              ) : eventPast ? (
                <Alert tone="warning">This event has already taken place.</Alert>
              ) : deadlinePast ? (
                <Alert tone="warning">
                  Registration closed on {formatShortDate(event.registrationDeadline)}.
                </Alert>
              ) : full ? (
                <Alert tone="error">This event is already full.</Alert>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  loading={working}
                  onClick={handleRegister}
                >
                  <Ticket className="h-4 w-4" />
                  Register for this event
                </Button>
              )}
            </div>

            <p className="mt-3 text-center text-[11px] text-slate-400">
              Open to enrolled Cordova Public College students only.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel registration?"
        description="Your slot will be released to other CPC students."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={working}>
              Keep my slot
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={working}>
              Yes, cancel
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          You are about to cancel your registration for{' '}
          <span className="font-semibold text-slate-900">{event.title}</span>. You can
          register again later if slots are still available.
        </p>
      </Modal>
    </div>
  );
}
