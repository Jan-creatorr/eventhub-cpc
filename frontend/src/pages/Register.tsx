import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  IdCard,
  Lock,
  Mail,
  UserRound,
} from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { Alert, Button, Field, Input, Select } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/toast';
import { errorMessage } from '../lib/api';
import {
  CPC_COURSES,
  CPC_YEAR_LEVELS,
} from '../lib/cpc';

const STUDENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{3,39}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Register() {
  const { user, register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [course, setCourse] = useState('');
  const [yearLevel, setYearLevel] = useState('1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/home" replace />;
  }

  const validate = (): string | null => {
    if (fullName.trim().length < 2) return 'Please enter your full name.';
    if (!STUDENT_ID_PATTERN.test(studentId.trim())) {
      return 'Enter a valid CPC student ID (for example CPC-2024-0142).';
    }
    if (!course) return 'Please choose your course.';
    if (!EMAIL_PATTERN.test(email.trim())) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters long.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const created = await register({
        fullName: fullName.trim(),
        studentId: studentId.trim().toUpperCase(),
        course,
        yearLevel: Number(yearLevel),
        email: email.trim().toLowerCase(),
        password,
      });
      toast(`Welcome to EventHub, ${created.fullName.split(' ')[0]}!`);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Verify your details to start registering for campus events."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in instead
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="fullName" required>
            <Input
              id="fullName"
              placeholder="Juan Dela Cruz"
              autoComplete="name"
              icon={<UserRound className="h-4 w-4" />}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </Field>

          <Field label="CPC student ID" htmlFor="studentId" required>
            <Input
              id="studentId"
              placeholder="CPC-2024-0142"
              icon={<IdCard className="h-4 w-4" />}
              value={studentId}
              onChange={(event) => setStudentId(event.target.value.toUpperCase())}
            />
          </Field>
        </div>

        <Field label="Email address" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
          <Field label="Course" htmlFor="course" required>
            <Select
              id="course"
              value={course}
              onChange={(event) => setCourse(event.target.value)}
            >
              <option value="" disabled>
                Select your course
              </option>
              {CPC_COURSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Year level" htmlFor="yearLevel" required>
            <Select
              id="yearLevel"
              value={yearLevel}
              onChange={(event) => setYearLevel(event.target.value)}
            >
              {CPC_YEAR_LEVELS.map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="password" required>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                icon={<Lock className="h-4 w-4" />}
                className="pr-11"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirm password" htmlFor="confirmPassword" required>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat password"
              icon={<Lock className="h-4 w-4" />}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </Field>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-xs font-medium text-brand-700">
          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Use any email address you can access. Your CPC student ID and course
            keep your campus records accurate.
          </span>
        </div>

        <Button type="submit" size="lg" loading={submitting} className="group w-full">
          Create account
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <BookOpen className="h-3.5 w-3.5" />
          Student accounts can be deactivated by the CPC Student Council.
        </p>
      </form>
    </AuthShell>
  );
}
