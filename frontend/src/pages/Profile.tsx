import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  IdCard,
  LogOut,
  Mail,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/toast';
import { Avatar, Badge, Button, Card, buttonClasses } from '../components/ui';
import { yearLevelLabel } from '../lib/cpc';
import { formatShortDate } from '../lib/format';

export function Profile() {
  const { user, isAdmin, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!user) return null;

  const details = [
    { icon: Mail, label: 'CPC email', value: user.email },
    { icon: IdCard, label: 'Student ID', value: user.studentId },
    { icon: BookOpen, label: 'Course', value: user.course },
    { icon: GraduationCap, label: 'Year level', value: yearLevelLabel(user.yearLevel) },
    {
      icon: ShieldCheck,
      label: 'Account role',
      value: isAdmin ? 'Organizer (Admin)' : 'Student',
    },
    { icon: CalendarDays, label: 'Member since', value: formatShortDate(user.createdAt) },
  ];

  const handleLogout = async () => {
    await logout();
    toast('You have been signed out.', 'info');
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-6 py-8 text-white shadow-xl sm:px-9">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar
            name={user.fullName}
            className="h-20 w-20 border-4 border-white/20 bg-gold-400 text-2xl text-brand-950"
          />
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              {user.fullName}
            </h2>
            <p className="mt-1 text-sm text-brand-100/80">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={isAdmin ? 'purple' : 'brand'}>
                {isAdmin ? 'Organizer admin' : 'CPC student'}
              </Badge>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200 ring-1 ring-inset ring-white/15">
                <CheckCircle2 className="h-3 w-3" />
                Active account
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-100 ring-1 ring-inset ring-white/15">
                {user.studentId}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <h3 className="font-display text-base font-bold text-slate-900">Account details</h3>
          <p className="text-xs text-slate-500">
            These details are verified by Cordova Public College.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {details.map((detail) => {
              const Icon = detail.icon;
              return (
                <div key={detail.label} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {detail.label}
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-800">{detail.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-display text-base font-bold text-slate-900">Quick links</h3>
            <div className="mt-4 space-y-2">
              <Link
                to="/my-events"
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"
              >
                <span className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-brand-600" />
                  My registrations
                </span>
                <span className="text-xs text-slate-400">View</span>
              </Link>
              <Link
                to="/events"
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-brand-600" />
                  Browse CPC events
                </span>
                <span className="text-xs text-slate-400">Explore</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin/events"
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    Manage events
                  </span>
                  <span className="text-xs text-slate-400">Open</span>
                </Link>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-base font-bold text-slate-900">Session</h3>
            <p className="mt-1 text-xs text-slate-500">
              Signing out ends your EventHub session on this device.
            </p>
            <Button variant="secondary" className="mt-4 w-full text-rose-600" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
            <Link to="/home" className={buttonClasses('ghost', 'sm', 'mt-2 w-full')}>
              Back to home page
            </Link>
          </Card>
        </div>
      </div>

      <Card className="flex flex-col items-start gap-3 border-brand-100 bg-brand-50/60 p-5 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-brand-100">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-brand-900">CPC student account</p>
          <p className="text-xs text-brand-700/80">
            This account is for Cordova Public College student events. Changes to
            student records are handled by the CPC Student Council.
          </p>
        </div>
      </Card>
    </div>
  );
}
