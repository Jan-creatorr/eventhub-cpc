import { useEffect, useState } from 'react';
import {
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  Link,
} from 'react-router-dom';
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Home as HomeIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './toast';
import { AssistantWidget } from './AssistantWidget';
import { Logo } from './brand';
import { Avatar, Spinner } from './ui';
import { cn } from '../lib/cn';
import { COLLEGE_SHORT_NAME } from '../lib/cpc';
import { formatLongDate } from '../lib/format';

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

const TITLES: { match: RegExp; title: string; subtitle: string }[] = [
  { match: /^\/home/, title: 'Home', subtitle: 'Welcome to your CPC event hub' },
  { match: /^\/dashboard/, title: 'Dashboard', subtitle: 'Your EventHub overview' },
  { match: /^\/events\/\d+/, title: 'Event Details', subtitle: 'Everything you need to know' },
  { match: /^\/events/, title: 'Browse Events', subtitle: 'Official CPC events and activities' },
  { match: /^\/my-events/, title: 'My Registrations', subtitle: 'Your digital event tickets' },
  { match: /^\/admin\/events/, title: 'Manage Events', subtitle: 'Create and publish CPC events' },
  { match: /^\/admin\/students/, title: 'Students', subtitle: 'CPC student accounts' },
  {
    match: /^\/admin\/registrations/,
    title: 'Registrations',
    subtitle: 'Track event sign-ups across campus',
  },
  {
    match: /^\/security/,
    title: 'Security Center',
    subtitle: 'Confidentiality, integrity, and availability',
  },
  { match: /^\/profile/, title: 'My Profile', subtitle: 'Your CPC student account' },
];

function titleFor(pathname: string) {
  return (
    TITLES.find((entry) => entry.match.test(pathname)) ?? {
      title: 'EventHub',
      subtitle: 'Cordova Public College',
    }
  );
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
          isActive
            ? 'bg-white/10 text-white shadow-inner ring-1 ring-white/10'
            : 'text-brand-100/60 hover:bg-white/5 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition',
              isActive
                ? 'bg-gold-400 text-brand-950'
                : 'bg-white/5 text-brand-200/70 group-hover:bg-white/10 group-hover:text-white',
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const mainNav: NavItem[] = [
    { to: '/home', label: 'Home', icon: HomeIcon, end: true },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/events', label: 'Browse Events', icon: CalendarDays },
    ...(isAdmin
      ? []
      : [{ to: '/my-events', label: 'My Registrations', icon: Ticket }]),
  ];

  const manageNav: NavItem[] = isAdmin
    ? [
        { to: '/admin/events', label: 'Manage Events', icon: Sparkles },
        { to: '/admin/registrations', label: 'Registrations', icon: ClipboardList },
        { to: '/admin/students', label: 'Students', icon: Users },
      ]
    : [];

  const handleLogout = async () => {
    await logout();
    toast('You have been signed out.', 'info');
    navigate('/login');
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-brand-950 via-brand-950 to-brand-900">
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-16 top-24 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />

      <div className="relative px-5 pb-5 pt-6">
        <Logo variant="dark" to="/home" />
      </div>

      <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 pb-6 no-scrollbar">
        <div className="space-y-1">
          <p className="px-3.5 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200/40">
            Menu
          </p>
          {mainNav.map((item) => (
            <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>

        {manageNav.length > 0 && (
          <div className="space-y-1">
            <p className="px-3.5 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200/40">
              Organizer
            </p>
            {manageNav.map((item) => (
              <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        <div className="space-y-1">
          <p className="px-3.5 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200/40">
            Account
          </p>
          <SidebarLink
            item={{ to: '/security', label: 'Security Center', icon: ShieldCheck }}
            onNavigate={onNavigate}
          />
          <SidebarLink
            item={{ to: '/profile', label: 'My Profile', icon: UserRound }}
            onNavigate={onNavigate}
          />
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              window.dispatchEvent(new Event('eventhub:assistant-open'));
            }}
            className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-brand-100/60 transition hover:bg-white/5 hover:text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand-200/70 transition group-hover:bg-white/10 group-hover:text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            AI Assistance
          </button>
        </div>
      </nav>

      <div className="relative m-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <Avatar name={user?.fullName ?? 'Guest'} className="h-10 w-10 bg-gold-400 text-brand-950" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
            <p className="truncate text-xs text-brand-200/60">
              {isAdmin ? 'Student Council · Admin' : user?.course}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-brand-200/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-slate-100">
            <Spinner className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-500">Loading EventHub…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

export function AppShell() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const page = titleFor(location.pathname);

  const handleLogout = async () => {
    await logout();
    toast('You have been signed out.', 'info');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
          <SidebarContent />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="animate-fade-up relative h-full w-[17.5rem] shadow-2xl">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 z-10 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display text-lg font-bold text-slate-900 sm:text-xl">
                  {page.title}
                </h1>
                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  {page.subtitle}
                </p>
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 md:flex">
                <CalendarDays className="h-3.5 w-3.5 text-brand-600" />
                {formatLongDate(new Date())}
              </div>

              <span className="hidden rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 ring-1 ring-brand-100 sm:inline-flex">
                {COLLEGE_SHORT_NAME}
              </span>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 text-left shadow-sm transition hover:bg-slate-50"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar name={user?.fullName ?? 'Guest'} className="h-8 w-8" />
                  <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-slate-700 sm:block">
                    {user?.fullName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {menuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close menu"
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="animate-pop absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {user?.fullName}
                        </p>
                        <p className="truncate text-xs text-slate-500">{user?.email}</p>
                        <span className="mt-2 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                          {isAdmin ? 'Organizer Admin' : user?.studentId}
                        </span>
                      </div>
                      <div className="p-1.5">
                        <Link
                          to="/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                        >
                          <UserRound className="h-4 w-4" />
                          My profile
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>

          <footer className="border-t border-slate-200/70 px-4 py-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
            EventHub · {formatYear()} · Cordova Public College student event platform
          </footer>
        </div>
      </div>
      <AssistantWidget />
    </div>
  );
}

function formatYear(): number {
  return new Date().getFullYear();
}
