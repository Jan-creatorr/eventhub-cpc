import crypto from 'node:crypto';
import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, isProduction } from '../config/env';

// Name of the HTTP-only cookie that stores the refresh token.
export const REFRESH_COOKIE_NAME = 'eventhub_refresh';

export type UserRole = 'admin' | 'user';

type AccessTokenUser = {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
};

// Creates a short-lived access token. The frontend sends this token in the
// "Authorization: Bearer <token>" header for protected API requests.
export function signAccessToken(user: AccessTokenUser): string {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTokenMinutes * 60 },
  );
}

// Creates a refresh token that belongs to a "family". Rotation creates a new
// token in the same family so we can detect token reuse attacks.
export function signRefreshToken(userId: number, familyId: string): string {
  return jwt.sign(
    { sub: String(userId), familyId },
    env.jwt.refreshSecret,
    {
      expiresIn: env.jwt.refreshTokenDays * 24 * 60 * 60,
      jwtid: crypto.randomUUID(),
    },
  );
}

export function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(token, env.jwt.refreshSecret) as jwt.JwtPayload;
  return {
    userId: Number(decoded.sub),
    familyId: String(decoded.familyId ?? ''),
    expiresAt: new Date(Number(decoded.exp) * 1000),
  };
}

// We never store the raw refresh token in the database, only its hash.
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newFamilyId(): string {
  return crypto.randomUUID();
}

// The refresh token lives in an HTTP-only cookie so JavaScript on the page
// cannot read it. This greatly reduces the impact of XSS attacks.
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
} as const;

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: env.jwt.refreshTokenDays * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
}
