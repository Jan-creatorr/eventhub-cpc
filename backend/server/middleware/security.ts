import type { NextFunction, Request, Response } from 'express';
import { env, isProduction } from '../config/env';
import { ApiError } from '../utils/ApiError';

// Response headers that reduce the impact of cross-site scripting, clickjacking,
// MIME sniffing, and referrer leaks. All three CIA pillars benefit, but these
// are especially important for confidentiality.
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      `connect-src 'self' ${env.clientUrl}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );

  // API responses may contain private account or session information.
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  if (isProduction) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=15552000; includeSubDomains',
    );
  }

  next();
}

type RateLimitOptions = {
  windowMs: number;
  max: number;
  prefix: string;
  message?: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function pruneBuckets(now: number): void {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

// A small in-memory rate limiter. It protects availability and slows down
// brute-force attempts without requiring an extra service or database table.
// For a multi-server deployment this would move to a shared Redis store.
export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    pruneBuckets(now);

    const identity = req.user?.id ?? req.ip ?? 'unknown';
    const key = `${options.prefix}:${identity}`;
    const existing = buckets.get(key);

    const bucket =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + options.windowMs }
        : existing;

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, options.max - bucket.count);
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(retryAfter));
      next(
        new ApiError(
          429,
          options.message ??
            'Too many requests. Please wait a moment and try again.',
        ),
      );
      return;
    }

    next();
  };
}

// Auth endpoints get a tighter limit to make password guessing expensive.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  prefix: 'auth',
  message: 'Too many sign-in attempts. Please wait before trying again.',
});

// The assistant is helpful, but it should not be used to flood the server.
export const assistantRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  prefix: 'assistant',
  message: 'You have reached the assistant limit. Please try again in a few minutes.',
});

function isAllowedCookieOrigin(origin: string): boolean {
  const candidates = [
    env.clientUrl,
    `http://localhost:${env.port}`,
    `http://127.0.0.1:${env.port}`,
  ];

  try {
    const requested = new URL(origin).origin;
    return candidates.some((candidate) => new URL(candidate).origin === requested);
  } catch {
    return false;
  }
}

// Refresh and logout rely on an httpOnly cookie. The bearer token on every
// other endpoint already prevents cross-site writes; this closes the cookie
// path too by rejecting unexpected browser origins. Requests without an Origin
// header are non-browser clients and are left alone.
export function cookieOriginGuard(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }

  if (!isAllowedCookieOrigin(origin)) {
    next(new ApiError(403, 'Invalid request origin.'));
    return;
  }

  next();
}
