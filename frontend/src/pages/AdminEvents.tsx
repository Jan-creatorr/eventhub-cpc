import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageLoader,
  Progress,
  badgeToneClass,
} from '../components/ui';
import { EventFormModal } from '../components/EventFormModal';
import { useToast } from '../components/toast';
import { apiRequest, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import type { CampusEvent, EventStatus } from '../lib/types';
import {
  categoryTheme,
  formatDay,
  formatMonth,
  formatShortDate,
  formatTimeRange,
  statusBadgeClass,
  statusLabel,
} from '../lib/format';

type StatusFilter = 'all' | EventStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function AdminEvents() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CampusEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampusEvent | null>(null);
  const [working, setWorking] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const newParam = searchParams.get('new');
  const editParam = searchParams.get('edit');

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<{ events: CampusEvent[] }>('/events')
      .then((result) => {
        if (!active) return;
        setEvents(result.events);
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

  useEffect(() => {
    if (newParam === '1') {
      setEditing(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
      return;
    }
    if (editParam) {
      const found = events.find((event) => event.id === Number(editParam));
      if (found) {
        setEditing(found);
        setFormOpen(true);
        setSearchParams({}, { replace: true });
      }
    }
  }, [newParam, editParam, events, setSearchParams]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      if (status !== 'all' && event.status !== status) return false;
      if (query) {
        const haystack = [event.title, event.organization, event.venue, event.category]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [events, status, search]);

  const counts = useMemo(
    () => ({
      all: events.length,
      published: events.filter((event) => event.status === 'published').length,
      draft: events.filter((event) => event.status === 'draft').length,
      cancelled: events.filter((event) => event.status === 'cancelled').length,
    }),
    [events],
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (event: CampusEvent) => {
    setEditing(event);
    setFormOpen(true);
  };

  const changeStatus = async (event: CampusEvent, next: EventStatus) => {
    setBusyId(event.id);
    try {
      await apiRequest(`/events/${event.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast(`"${event.title}" is now ${next}.`);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setWorking(true);
    try {
      await apiRequest(`/events/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Event deleted successfully.', 'info');
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setWorking(false);
    }
  };

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
              placeholder="Search events by title, organizer, or venue…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New event
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition',
                status === option.value
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
              )}
            >
              {option.label}
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] font-bold',
                  status === option.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                )}
              >
                {counts[option.value]}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {error ? (
        <EmptyState icon={CalendarDays} title="Could not load events" description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events found"
          description="Try a different filter or create the first CPC event for this view."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create event
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-3 xl:hidden">
            {filtered.map((event) => {
              const theme = categoryTheme(event.category);
              const percent = Math.round((event.registeredCount / event.capacity) * 100);
              return (
                <Card key={event.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br text-white',
                        theme.gradient,
                      )}
                    >
                      <span className="text-[8px] font-bold uppercase leading-none">
                        {formatMonth(event.eventDate)}
                      </span>
                      <span className="font-display text-sm font-extrabold leading-none">
                        {formatDay(event.eventDate)}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                            theme.badge,
                          )}
                        >
                          {event.category}
                        </span>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                            statusBadgeClass(event.status),
                          )}
                        >
                          {statusLabel(event.status)}
                        </span>
                      </div>
                      <Link
                        to={`/events/${event.id}`}
                        className="mt-1.5 block font-semibold leading-snug text-slate-800 hover:text-brand-700"
                      >
                        {event.title}
                      </Link>
                      <p className="truncate text-[11px] text-slate-500">{event.organization}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Schedule
                      </p>
                      <p className="mt-1 font-semibold text-slate-700">
                        {formatShortDate(event.eventDate)}
                      </p>
                      <p className="text-slate-500">
                        {formatTimeRange(event.startTime, event.endTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Capacity
                      </p>
                      <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-500">
                        <span>
                          {event.registeredCount}/{event.capacity}
                        </span>
                        <span>{percent}%</span>
                      </div>
                      <Progress
                        value={event.registeredCount}
                        total={event.capacity}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <Link
                      to={`/events/${event.id}`}
                      className="text-xs font-bold text-brand-700 hover:underline"
                    >
                      View details
                    </Link>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(event)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                        title="Edit event"
                        aria-label="Edit event"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {event.status === 'published' ? (
                        <button
                          type="button"
                          onClick={() => changeStatus(event, 'draft')}
                          disabled={busyId === event.id}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                          title="Move to draft"
                          aria-label="Move to draft"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => changeStatus(event, 'published')}
                          disabled={busyId === event.id}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                          title="Publish event"
                          aria-label="Publish event"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(event)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title="Delete event"
                        aria-label="Delete event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="hidden overflow-hidden xl:block">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Schedule</th>
                  <th className="px-5 py-3">Capacity</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((event) => {
                  const theme = categoryTheme(event.category);
                  const percent = Math.round((event.registeredCount / event.capacity) * 100);
                  return (
                    <tr key={event.id} className="align-middle hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={cn('flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br text-white', theme.gradient)}>
                            <span className="text-[8px] font-bold uppercase leading-none">{formatMonth(event.eventDate)}</span>
                            <span className="font-display text-sm font-extrabold leading-none">{formatDay(event.eventDate)}</span>
                          </span>
                          <div className="min-w-0">
                            <Link
                              to={`/events/${event.id}`}
                              className="block max-w-[16rem] truncate font-semibold text-slate-800 hover:text-brand-700"
                            >
                              {event.title}
                            </Link>
                            <p className="max-w-[16rem] truncate text-[11px] text-slate-500">
                              {event.organization}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset', theme.badge)}>
                          {event.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        <p className="font-semibold text-slate-700">{formatShortDate(event.eventDate)}</p>
                        <p>{formatTimeRange(event.startTime, event.endTime)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="w-28">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                            <span>{event.registeredCount}/{event.capacity}</span>
                            <span>{percent}%</span>
                          </div>
                          <Progress value={event.registeredCount} total={event.capacity} className="mt-1" />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset', statusBadgeClass(event.status))}>
                          {statusLabel(event.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/events/${event.id}`}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            title="View event"
                            aria-label="View event"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(event)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                            title="Edit event"
                            aria-label="Edit event"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {event.status === 'published' ? (
                            <button
                              type="button"
                              onClick={() => changeStatus(event, 'draft')}
                              disabled={busyId === event.id}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                              title="Move to draft"
                              aria-label="Move to draft"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => changeStatus(event, 'published')}
                              disabled={busyId === event.id}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                              title="Publish event"
                              aria-label="Publish event"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(event)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            title="Delete event"
                            aria-label="Delete event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </Card>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <p>
          Showing <span className="font-bold text-slate-600">{filtered.length}</span> of{' '}
          {events.length} events
        </p>
        <div className="flex items-center gap-2">
          <Badge tone="brand">CPC organizers only</Badge>
          <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset', badgeToneClass('slate'))}>
            {formatShortDate(new Date())}
          </span>
        </div>
      </div>

      <EventFormModal
        open={formOpen}
        event={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete this event?"
        description="This also removes every registration for the event."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={working}>
              Keep event
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={working}>
              Delete event
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{deleteTarget?.title}</span> will be
          permanently deleted, including all participant records. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
