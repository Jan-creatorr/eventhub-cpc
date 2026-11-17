import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  GraduationCap,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UserX,
  Users,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageLoader,
} from '../components/ui';
import { useToast } from '../components/toast';
import { useAuth } from '../context/AuthContext';
import { apiRequest, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { yearLevelLabel } from '../lib/cpc';
import { formatShortDate } from '../lib/format';
import type { AdminUserRow } from '../lib/types';

type RoleFilter = 'all' | 'user' | 'admin';

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'user', label: 'Students' },
  { value: 'admin', label: 'Organizers' },
];

export function AdminStudents() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [working, setWorking] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<{ users: AdminUserRow[] }>('/admin/users')
      .then((result) => {
        if (!active) return;
        setUsers(result.users);
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

  const counts = useMemo(
    () => ({
      all: users.length,
      user: users.filter((row) => row.role === 'user').length,
      admin: users.filter((row) => row.role === 'admin').length,
      inactive: users.filter((row) => !row.isActive).length,
    }),
    [users],
  );

  const earliestJoin = useMemo(() => {
    if (users.length === 0) return null;
    return users.reduce(
      (earliest, row) =>
        new Date(row.createdAt).getTime() < new Date(earliest).getTime() ? row.createdAt : earliest,
      users[0].createdAt,
    );
  }, [users]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((row) => {
      if (roleFilter !== 'all' && row.role !== roleFilter) return false;
      if (query) {
        const haystack = [row.fullName, row.email, row.studentId, row.course]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [users, roleFilter, search]);

  const toggleActive = async (row: AdminUserRow) => {
    setBusyId(row.id);
    try {
      await apiRequest(`/admin/users/${row.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      toast(row.isActive ? 'Student account deactivated.' : 'Student account activated.');
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const toggleRole = async (row: AdminUserRow) => {
    const nextRole = row.role === 'admin' ? 'user' : 'admin';
    setBusyId(row.id);
    try {
      await apiRequest(`/admin/users/${row.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
      toast(nextRole === 'admin' ? 'Organizer access granted.' : 'Organizer access removed.');
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
      await apiRequest(`/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Student account deleted.', 'info');
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <PageLoader label="Loading CPC students…" />;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total accounts', value: counts.all, icon: Users, tone: 'bg-brand-50 text-brand-600 ring-brand-100' },
          { label: 'Students', value: counts.user, icon: GraduationCap, tone: 'bg-sky-50 text-sky-600 ring-sky-100' },
          { label: 'Organizers', value: counts.admin, icon: ShieldCheck, tone: 'bg-purple-50 text-purple-600 ring-purple-100' },
          { label: 'Inactive', value: counts.inactive, icon: UserX, tone: 'bg-rose-50 text-rose-500 ring-rose-100' },
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, student ID, or course…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRoleFilter(option.value)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition',
                  roleFilter === option.value
                    ? 'bg-brand-600 text-white ring-brand-600'
                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {error ? (
        <EmptyState icon={Users} title="Could not load students" description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No accounts found"
          description="Try a different search term or role filter."
        />
      ) : (
        <>
          <div className="space-y-3 xl:hidden">
            {filtered.map((row) => {
              const isSelf = row.id === currentUser?.id;
              return (
                <Card key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={row.fullName} className="h-10 w-10" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-semibold text-slate-800">
                          <span className="truncate">{row.fullName}</span>
                          {isSelf && (
                            <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-600">
                              You
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">{row.email}</p>
                      </div>
                    </div>
                    {row.isActive ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-inset ring-emerald-100">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-500 ring-1 ring-inset ring-rose-100">
                        <UserX className="h-3 w-3" />
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Student ID
                      </p>
                      <p className="mt-0.5 font-semibold text-slate-700">{row.studentId}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Year level
                      </p>
                      <p className="mt-0.5 font-semibold text-slate-700">
                        {yearLevelLabel(row.yearLevel)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Course
                      </p>
                      <p className="mt-0.5 font-semibold text-slate-700">{row.course}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Registrations
                      </p>
                      <p className="mt-0.5 font-semibold text-slate-700">
                        {row.registrationCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Role
                      </p>
                      <div className="mt-1">
                        <Badge tone={row.role === 'admin' ? 'purple' : 'brand'}>
                          {row.role === 'admin' ? 'Organizer' : 'Student'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => toggleRole(row)}
                      disabled={isSelf || busyId === row.id}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-purple-50 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        row.role === 'admin' ? 'Remove organizer access' : 'Grant organizer access'
                      }
                      aria-label={
                        row.role === 'admin' ? 'Remove organizer access' : 'Grant organizer access'
                      }
                    >
                      {row.role === 'admin' ? (
                        <UserRound className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      disabled={isSelf || busyId === row.id}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                      title={row.isActive ? 'Deactivate account' : 'Activate account'}
                      aria-label={row.isActive ? 'Deactivate account' : 'Activate account'}
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(row)}
                      disabled={isSelf}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Delete account"
                      aria-label="Delete account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Student ID</th>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Registrations</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const isSelf = row.id === currentUser?.id;
                  return (
                    <tr key={row.id} className="align-middle hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={row.fullName} className="h-9 w-9" />
                          <div className="min-w-0">
                            <p className="max-w-[15rem] truncate font-semibold text-slate-800">
                              {row.fullName}
                              {isSelf && (
                                <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-600">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="max-w-[15rem] truncate text-[11px] text-slate-500">
                              {row.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-600">
                        {row.studentId}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        <p className="font-semibold text-slate-700">{row.course}</p>
                        <p>{yearLevelLabel(row.yearLevel)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          {row.registrationCount}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={row.role === 'admin' ? 'purple' : 'brand'}>
                          {row.role === 'admin' ? (
                            <>
                              <ShieldCheck className="h-3 w-3" />
                              Organizer
                            </>
                          ) : (
                            <>
                              <GraduationCap className="h-3 w-3" />
                              Student
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {row.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 ring-1 ring-inset ring-emerald-100">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-500 ring-1 ring-inset ring-rose-100">
                            <UserX className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => toggleRole(row)}
                            disabled={isSelf || busyId === row.id}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-purple-50 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title={row.role === 'admin' ? 'Remove organizer access' : 'Grant organizer access'}
                            aria-label={row.role === 'admin' ? 'Remove organizer access' : 'Grant organizer access'}
                          >
                            {row.role === 'admin' ? <UserRound className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(row)}
                            disabled={isSelf || busyId === row.id}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title={row.isActive ? 'Deactivate account' : 'Activate account'}
                            aria-label={row.isActive ? 'Deactivate account' : 'Activate account'}
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            disabled={isSelf}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Delete account"
                            aria-label="Delete account"
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

      <p className="text-xs text-slate-400">
        {filtered.length} account{filtered.length === 1 ? '' : 's'} shown · Earliest account
        joined {earliestJoin ? formatShortDate(earliestJoin) : '—'}
      </p>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete this account?"
        description="The student will lose access to EventHub immediately."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={working}>
              Keep account
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={working}>
              Delete account
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{deleteTarget?.fullName}</span> (
          {deleteTarget?.email}) and all of their registrations will be permanently removed.
        </p>
      </Modal>
    </div>
  );
}
