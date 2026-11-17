import type { ReactNode } from 'react';
import {
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Logo } from './brand';
import { COLLEGE_NAME, SYSTEM_NAME } from '../lib/cpc';

const HIGHLIGHTS = [
  'Official events from every CPC office and student organization',
  'Register in one tap with live capacity checks',
  'Carry digital tickets for every campus event',
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-950 via-brand-950 to-brand-900 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-gold-400/15 blur-3xl" />

        <div className="relative">
          <Logo variant="dark" />
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-brand-100 ring-1 ring-white/15">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-300" />
            CPC student accounts
          </span>
          <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight text-white xl:text-4xl">
            Every CPC event.
            <br />
            <span className="text-gold-300">One place.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-brand-100/75">
            {SYSTEM_NAME} is the official event registration platform for {COLLEGE_NAME}.
            Sign in with your EventHub account to continue.
          </p>

          <ul className="mt-7 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-brand-100/85">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-9 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-center gap-1 text-gold-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Made for CPC</span>
            </div>
            <p className="mt-2 text-sm text-brand-100/80">
              “Sign-ups for our foundation day used to live in three different group
              chats. Now everything is in EventHub.”
            </p>
            <p className="mt-3 text-xs font-semibold text-brand-200/60">
              CPC Student Council
            </p>
          </div>
        </div>

        <div className="relative flex flex-wrap gap-2 text-[11px] font-semibold text-brand-200/70">
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 ring-1 ring-white/10">
            <GraduationCap className="h-3 w-3" />
            Cordova Public College
          </span>
          <span className="rounded-lg bg-white/5 px-2.5 py-1 ring-1 ring-white/10">
            Official event platform
          </span>
        </div>
      </aside>

      <main className="relative flex items-center justify-center bg-white px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>

          <div className="mt-7">{children}</div>

          <div className="mt-6 text-sm text-slate-500">{footer}</div>

          <p className="mt-8 text-center text-[11px] text-slate-400">
            By continuing you agree to the {SYSTEM_NAME} student code of conduct.
          </p>
        </div>
      </main>
    </div>
  );
}
