import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Download,
  Search,
  Ticket,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PageLoader,
  Select,
} from '../components/ui';
import { useToast } from '../components/toast';
import { apiRequest, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { yearLevelLabel } from '../lib/cpc';
import { formatShortDate } from '../lib/format';
import type { AdminRegistrationRow, CampusEvent } from '../lib/types';

type StatusFilter = 'all' | 'registered' | 'cancelled';

export function AdminRegistrations() {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<AdminRegistrationRow[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [eventFilter, setEventFilter] = useState('all');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      apiRequest<{ registrations: AdminRegistrationRow[] }>('/registrations'),
      apiRequest<{ events: CampusEvent[] }>('/events'),
    ])
      .then(([registrationResult, eventResult]) => {
        if (!active) return;
        setRegistrations(registrationResult.registrations);
        setEvents(eventResult.events);
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
  }, []);

  const counts = useMemo(
    () => ({
      total: registrations.length,
      registered: registrations.filter((row) => row.status === 'registered').length,
      cancelled: registrations.filter((row) => row.status === 'cancelled').length,
      students: new Set(
        registrations.filter((row) => row.status === 'registered').map((row) => row.user.id),
      ).size,
    }),
    [registrations],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return registrations.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (eventFilter !== 'all' && String(row.event.id) !== eventFilter) return false;
      if (query) {
        const haystack = [
          row.user.fullName,
          row.user.email,
          row.user.studentId,
          row.user.course,
          row.event.title,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [registrations, statusFilter, eventFilter, search]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast('There is nothing to export in this view.', 'info');
      return;
    }

    const header = [
      'Student',
      'Student ID',
      'Email',
      'Course',
      'Year Level',
      'Event',
      'Event Date',
      'Status',
      'Registered At',
    ];

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const lines = filtered.map((row) =>
      [
        row.user.fullName,
        row.user.studentId,
        row.user.email,
        row.user.course,
        yearLevelLabel(row.user.yearLevel),
        row.event.title,
        formatShortDate(row.event.eventDate),
        row.status,
        formatShortDate(row.registeredAt),
      ]
        .map(escape)
        .join(','),
    );

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'eventhub-registrations.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    toast('Registration report downloaded.');
  };

  if (loading) return <PageLoader label="Loading registrations…" />;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total sign-ups', value: counts.total, icon: ClipboardList, tone: 'bg-brand-50 text-brand-600 ring-brand-100' },
          { label: 'Confirmed', value: counts.registered, icon: UserCheck, tone: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
          { label: 'Cancelled', value: counts.cancelled, icon: XCircle, tone: 'bg-rose-50 text-rose-500 ring-rose-100' },
          { label: 'Unique students', value: counts.students, icon: Ticket, tone: 'bg-sky-50 text-sky-600 ring-sky-100' },
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

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by student, ID, email, or event…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="min-w-0 sm:w-48">
              <Select
                value={eventFilter}
                onChange={(event) => setEventFilter(event.target.value)}
                aria-label="Filter by event"
              >
                <option value="all">All events</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-0 sm:w-40">
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="registered">Registered</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <Button
              variant="secondary"
              onClick={exportCsv}
              className="col-span-2 justify-center sm:col-span-1"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <EmptyState icon={ClipboardList} title="Could not load registrations" description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No registrations found"
          description="Try a different event, status, or search term."
        />
      ) : (
        <>
          <div className="space-y-3 xl:hidden">
            {filtered.map((row) => (
              <Card key={row.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={row.user.fullName} className="h-9 w-9" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">
                        {row.user.fullName}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {row.user.studentId} · {yearLevelLabel(row.user.yearLevel)}
                      </p>
                    </div>
                  </div>
                  {row.status === 'registered' ? (
                    <Badge tone="emerald">Registered</Badge>
                  ) : (
                    <Badge tone="rose">Cancelled</Badge>
                  )}
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Event
                  </p>
                  <p className="mt-1 font-semibold leading-snug text-slate-800">
                    {row.event.title}
                  </p>
                  <p className="text-[11px] text-slate-500">{row.event.organization}</p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {formatShortDate(row.event.eventDate)} · Registered{' '}
                    {formatShortDate(row.registeredAt)}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden xl:block">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Student ID</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Event date</th>
                  <th className="px-5 py-3">Registered</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="align-middle hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.user.fullName} className="h-9 w-9" />
                        <div className="min-w-0">
                          <p className="max-w-[14rem] truncate font-semibold text-slate-800">
                            {row.user.fullName}
                          </p>
                          <p className="max-w-[14rem] truncate text-[11px] text-slate-500">
                            {row.user.course} · {yearLevelLabel(row.user.yearLevel)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-600">
                      {row.user.studentId}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="max-w-[16rem] truncate font-semibold text-slate-700">
                        {row.event.title}
                      </p>
                      <p className="max-w-[16rem] truncate text-[11px] text-slate-500">
                        {row.event.organization}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {formatShortDate(row.event.eventDate)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {formatShortDate(row.registeredAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      {row.status === 'registered' ? (
                        <Badge tone="emerald">Registered</Badge>
                      ) : (
                        <Badge tone="rose">Cancelled</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        </>
      )}

      <p className="text-xs text-slate-400">
        Showing {filtered.length} of {registrations.length} registration records.
      </p>
    </div>
  );
}
