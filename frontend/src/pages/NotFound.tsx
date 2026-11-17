import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Logo } from '../components/brand';
import { buttonClasses } from '../components/ui';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <Logo />
      <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
        <GraduationCap className="h-8 w-8" />
      </div>
      <p className="mt-6 font-display text-6xl font-extrabold text-slate-900">404</p>
      <h1 className="mt-2 font-display text-xl font-bold text-slate-900">
        This page is not on the campus map
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The page you are looking for may have been moved, or you may not have access to it.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link to="/home" className={buttonClasses('primary', 'md')}>
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <Link to="/dashboard" className={buttonClasses('secondary', 'md')}>
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
