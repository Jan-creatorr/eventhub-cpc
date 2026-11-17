import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  Fingerprint,
  KeyRound,
  ListChecks,
  Lock,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Timer,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageLoader,
} from '../components/ui';
import { apiRequest, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { formatShortDate } from '../lib/format';
import type {
  SecurityAuditLog,
  SecurityAuditResponse,
  SecurityControl,
  SecurityOverview,
} from '../lib/types';

type Pillar = {
  key: 'confidentiality' | 'integrity' | 'availability';
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  ringClass: string;
};

const PILLARS: Pillar[] = [
  {
    key: 'confidentiality',
    title: 'Confidentiality',
    description: 'Private data stays private and only the right people can see it.',
    icon: Lock,
    iconClass: 'bg-brand-50 text-brand-600',
    ringClass: 'ring-brand-100',
  },
  {
    key: 'integrity',
    title: 'Integrity',
    description: 'Records and sessions cannot be changed without detection.',
    icon: Fingerprint,
    iconClass: 'bg-purple-50 text-purple-600',
    ringClass: 'ring-purple-100',
  },
  {
    key: 'availability',
    title: 'Availability',
    description: 'The system stays usable, recovers cleanly, and resists abuse.',
    icon: Activity,
    iconClass: 'bg-emerald-50 text-emerald-600',
    ringClass: 'ring-emerald-100',
  },
];

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatShortDate(date)}, ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function shortHash(value: string | null): string {
  if (!value) return 'No entries yet';
  return `${value.slice(0, 16)}…`;
}

function prettyDetails(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function outcomeTone(outcome: SecurityAuditLog['outcome']) {
  if (outcome === 'success') return 'emerald' as const;
  if (outcome === 'warning') return 'amber' as const;
  return 'rose' as const;
}

function ControlList({ controls }: { controls: SecurityControl[] }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {controls.map((control) => (
        <li
          key={control.name}
          className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-slate-800">{control.name}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {control.detail}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SessionRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export function SecurityCenter() {
  const { isAdmin } = useAuth();
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [chain, setChain] = useState<{ checked: number; valid: boolean } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setAuditError(null);

    apiRequest<SecurityOverview>('/security/overview')
      .then((overviewData) => {
        if (active) setOverview(overviewData);
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
    if (!isAdmin) return;
    let active = true;

    apiRequest<SecurityAuditResponse>('/security/audit?limit=25')
      .then((data) => {
        if (!active) return;
        setLogs(data.logs);
        setChain(data.chain);
        setAuditError(null);
      })
      .catch((err) => {
        if (active) setAuditError(errorMessage(err));
      });

    return () => {
      active = false;
    };
  }, [isAdmin, refreshKey]);

  if (loading) return <PageLoader label="Checking EventHub security…" />;

  if (error || !overview) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Could not load the Security Center"
        description={error ?? 'Security information is unavailable right now.'}
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        }
      />
    );
  }

  const chainValid = overview.checks.auditChain;
  const databaseOk = overview.checks.database === 'ok';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-6 py-8 text-white shadow-xl sm:px-9">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-100 ring-1 ring-inset ring-white/15">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-300" />
              CIA triad
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Security Center
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-100/80">
              See how EventHub protects confidentiality, preserves integrity, and
              keeps the platform available. This page is read-only and shows live
              dependency, session, and audit checks.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset',
                  databaseOk
                    ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/20'
                    : 'bg-amber-400/15 text-amber-200 ring-amber-300/20',
                )}
              >
                {databaseOk ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {databaseOk ? 'Database reachable' : 'Database unavailable'}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset',
                  chainValid
                    ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/20'
                    : 'bg-amber-400/15 text-amber-200 ring-amber-300/20',
                )}
              >
                {chainValid ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {overview.audit.available
                  ? chainValid
                    ? 'Audit chain verified'
                    : 'Audit chain needs attention'
                  : 'Audit status unavailable'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-brand-100 ring-1 ring-inset ring-white/15">
                <KeyRound className="h-3.5 w-3.5 text-gold-300" />
                {overview.session.activeSessions} active session
                {overview.session.activeSessions === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-brand-100 ring-1 ring-inset ring-white/15">
                <Bot className="h-3.5 w-3.5 text-gold-300" />
                {overview.assistant.scopeGuard
                  ? 'Assistant scope guard on'
                  : 'Assistant guard unavailable'}
              </span>
            </div>
          </div>

          <Button
            variant="gold"
            size="sm"
            onClick={() => setRefreshKey((key) => key + 1)}
            className="self-start lg:self-center"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh status
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Access token',
            value: `${overview.session.accessTokenMinutes} min`,
            icon: Timer,
            tone: 'bg-brand-50 text-brand-600 ring-brand-100',
          },
          {
            label: 'Refresh session',
            value: `${overview.session.refreshTokenDays} days`,
            icon: KeyRound,
            tone: 'bg-purple-50 text-purple-600 ring-purple-100',
          },
          {
            label: 'Audit entries',
            value: overview.audit.available
              ? String(overview.audit.total)
              : 'Unavailable',
            icon: ScrollText,
            tone: 'bg-amber-50 text-amber-600 ring-amber-100',
          },
          {
            label: 'Chain checked',
            value: overview.audit.available
              ? `${overview.audit.checked} rows`
              : 'Unavailable',
            icon: ListChecks,
            tone: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="flex items-center gap-3 p-4">
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                  stat.tone,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg font-extrabold text-slate-900">
                  {stat.value}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {stat.label}
                </p>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <Card key={pillar.key} className="p-5">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                    pillar.iconClass,
                    pillar.ringClass,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    {pillar.title}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {pillar.description}
                  </p>
                </div>
              </div>
              <ControlList controls={overview[pillar.key]} />
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Your session
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Live refresh-token settings for your signed-in account.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <SessionRow
              icon={KeyRound}
              label="Active sessions"
              value={String(overview.session.activeSessions)}
            />
            <SessionRow
              icon={Timer}
              label="Access token lifetime"
              value={`${overview.session.accessTokenMinutes} minutes`}
            />
            <SessionRow
              icon={Timer}
              label="Refresh lifetime"
              value={`${overview.session.refreshTokenDays} days`}
            />
            <SessionRow
              icon={Lock}
              label="Refresh cookie"
              value={
                overview.session.cookieHttpOnly
                  ? 'httpOnly'
                  : 'Readable by scripts'
              }
            />
            <SessionRow
              icon={ShieldCheck}
              label="Cookie SameSite"
              value={overview.session.cookieSameSite}
            />
            <SessionRow
              icon={Lock}
              label="Secure cookie"
              value={overview.session.cookieSecure ? 'HTTPS only' : 'Development'}
            />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Integrity and assistant status
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Live probes check the audit chain, database, and assistant guard.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-500">
                Database probe
              </span>
              <Badge tone={databaseOk ? 'emerald' : 'rose'}>
                {databaseOk ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {databaseOk ? 'Reachable' : 'Unavailable'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-500">
                Audit chain
              </span>
              {overview.audit.available ? (
                <Badge tone={chainValid ? 'emerald' : 'rose'}>
                  {chainValid ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {chainValid ? 'Valid' : 'Needs attention'}
                </Badge>
              ) : (
                <Badge tone="amber">
                  <AlertTriangle className="h-3 w-3" />
                  Unavailable
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-500">
                Last audit hash
              </span>
              <code className="truncate text-xs font-semibold text-slate-700">
                {shortHash(overview.audit.lastHash)}
              </code>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-500">
                Assistant provider
              </span>
              <span className="text-right text-xs font-semibold text-slate-700">
                {overview.assistant.provider}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-500">
                Scope guard probe
              </span>
              <Badge tone={overview.assistant.scopeGuard ? 'emerald' : 'rose'}>
                {overview.assistant.scopeGuard ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-500">
                Output guard probe
              </span>
              <Badge tone={overview.assistant.systemOnly ? 'emerald' : 'rose'}>
                {overview.assistant.systemOnly ? 'Enforced' : 'Not enforced'}
              </Badge>
            </div>
          </div>
        </Card>
      </section>

      {isAdmin && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Recent security activity
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Admin-only audit trail of important account, event, registration,
                and assistant actions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {chain && (
                <Badge tone={chain.valid ? 'emerald' : 'rose'}>
                  <ListChecks className="h-3 w-3" />
                  {chain.valid
                    ? `Chain valid (${chain.checked} checked)`
                    : `Chain invalid at ${chain.checked}`}
                </Badge>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRefreshKey((key) => key + 1)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </div>

          {auditError ? (
            <div className="flex items-center gap-2 px-5 py-6 text-sm text-rose-600">
              <AlertTriangle className="h-4 w-4" />
              {auditError}
            </div>
          ) : logs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              No audit entries yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={outcomeTone(log.outcome)}>{log.outcome}</Badge>
                    <p className="text-sm font-semibold text-slate-800">
                      {log.action}
                    </p>
                    <span className="text-xs text-slate-400">
                      {formatDateTime(log.createdAt)}
                    </span>
                    <span className="ml-auto text-[11px] font-medium text-slate-400">
                      {log.ipAddress ?? 'No IP'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    User {log.userId ?? 'system'} · Hash{' '}
                    <code>{log.entryHash.slice(0, 12)}…</code>
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] font-semibold text-brand-700">
                      View details
                    </summary>
                    <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg bg-slate-950 p-2.5 text-[10px] leading-relaxed text-slate-200">
                      {prettyDetails(log.details)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
