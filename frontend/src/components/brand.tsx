import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { cn } from '../lib/cn';
import { COLLEGE_NAME, SYSTEM_NAME } from '../lib/cpc';

export function Logo({
  variant = 'light',
  className,
  to = '/',
}: {
  variant?: 'light' | 'dark';
  className?: string;
  to?: string;
}) {
  return (
    <Link to={to} className={cn('group flex items-center gap-3', className)}>
      <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/30 ring-1 ring-white/20 transition-transform group-hover:-rotate-3">
        <GraduationCap className="h-6 w-6" />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-gold-400 ring-2 ring-white" />
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            'block font-display text-xl font-extrabold tracking-tight',
            variant === 'dark' ? 'text-white' : 'text-slate-900',
          )}
        >
          {SYSTEM_NAME}
        </span>
        <span
          className={cn(
            'block text-[10px] font-semibold uppercase tracking-[0.16em]',
            variant === 'dark' ? 'text-brand-200/80' : 'text-slate-400',
          )}
        >
          {COLLEGE_NAME}
        </span>
      </span>
    </Link>
  );
}
