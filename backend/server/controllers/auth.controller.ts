
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '../db';
import { refreshTokens, users, type User } from '../db/schema';
import { env } from '../config/env';
import { CPC_YEAR_LEVELS, isCpcCourse } from '../config/cpc';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from '../utils/audit';
import {
  asText,
  isValidEmail,
  isValidPassword,
  isValidStudentId,
} from '../utils/validate';
import {
  clearRefreshCookie,
  hashToken,
  newFamilyId,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens';

function toPublicUser(user: User) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    studentId: user.studentId,
    course: user.course,
    yearLevel: user.yearLevel,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

function refreshExpiryDate(): Date {
  return new Date(Date.now() + env.jwt.refreshTokenDays * 24 * 60 * 60 * 1000);
}

async function startSession(
  user: User,
  res: Response,
  req: Request,
): Promise<string> {
  const familyId = newFamilyId();
  const refreshToken = signRefreshToken(user.id, familyId);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    familyId,
    expiresAt: refreshExpiryDate(),
    userAgent: req.headers['user-agent']?.slice(0, 255) ?? null,
    ipAddress: req.ip?.slice(0, 64) ?? null,
  });

  setRefreshCookie(res, refreshToken);
  return signAccessToken(user);
}

async function revokeFamily(familyId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.familyId, familyId),
        isNull(refreshTokens.revokedAt),
      ),
    );
}

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const fullName = asText(req.body.fullName);
  const email = asText(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const studentId = asText(req.body.studentId).toUpperCase();
  const course = asText(req.body.course);
  const yearLevel = Number(req.body.yearLevel);

  if (fullName.length < 2) {
    throw new ApiError(400, 'Please enter your full name.');
  }
  if (!isValidEmail(email)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }
  if (!isValidPassword(password)) {
    throw new ApiError(400, 'Password must be at least 8 characters long.');
  }
  if (!isValidStudentId(studentId)) {
    throw new ApiError(
      400,
      'Please enter a valid CPC student ID (letters, numbers, and dashes only).',
    );
  }
  if (!isCpcCourse(course)) {
    throw new ApiError(400, 'Please choose a valid CPC course.');
  }
  if (!(CPC_YEAR_LEVELS as readonly number[]).includes(yearLevel)) {
    throw new ApiError(400, 'Please choose your year level.');
  }

  const [existing] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(or(eq(users.email, email), eq(users.studentId, studentId)))
    .limit(1);

  if (existing) {
    if (existing.email === email) {
      throw new ApiError(409, 'An account with this email already exists.');
    }
    throw new ApiError(409, 'An account with this student ID already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [newUser] = await db
    .insert(users)
    .values({
      fullName,
      email,
      studentId,
      course,
      yearLevel,
      passwordHash,
      role: 'user',
    })
    .returning();

  const accessToken = await startSession(newUser, res, req);

  await recordAudit({
    req,
    userId: newUser.id,
    action: 'auth.register',
    details: { role: newUser.role },
  });

  res.status(201).json({
    message: 'Account created successfully. Welcome to EventHub!',
    user: toPublicUser(newUser),
    accessToken,
  });
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const email = asText(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    await recordAudit({
      req,
      action: 'auth.login',
      outcome: 'failure',
      details: { reason: 'unknown_email' },
    });
    throw new ApiError(401, 'Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    await recordAudit({
      req,
      userId: user.id,
      action: 'auth.login',
      outcome: 'failure',
      details: { reason: 'invalid_password' },
    });
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    await recordAudit({
      req,
      userId: user.id,
      action: 'auth.login',
      outcome: 'failure',
      details: { reason: 'deactivated_account' },
    });
    throw new ApiError(403, 'This account has been deactivated.');
  }

  const accessToken = await startSession(user, res, req);

  await recordAudit({
    req,
    userId: user.id,
    action: 'auth.login',
    details: { role: user.role },
  });

  res.json({
    message: 'Logged in successfully.',
    user: toPublicUser(user),
    accessToken,
  });
}

// POST /api/auth/refresh
export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

  if (!token) {
    throw new ApiError(401, 'No active session found.');
  }

  let payload: { userId: number; familyId: string; expiresAt: Date };

  try {
    payload = verifyRefreshToken(token);
  } catch {
    await recordAudit({
      req,
      action: 'auth.refresh',
      outcome: 'failure',
      details: { reason: 'invalid_or_expired_token' },
    });
    clearRefreshCookie(res);
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  const [record] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(token)))
    .limit(1);

  if (!record) {
    await recordAudit({
      req,
      action: 'auth.refresh',
      outcome: 'warning',
      details: { reason: 'token_not_found' },
    });
    clearRefreshCookie(res);
    throw new ApiError(401, 'Your session is no longer valid.');
  }

  if (record.revokedAt) {
    await revokeFamily(record.familyId);
    await recordAudit({
      req,
      userId: record.userId,
      action: 'auth.refresh',
      outcome: 'warning',
      details: { reason: 'refresh_token_reuse' },
    });
    clearRefreshCookie(res);
    throw new ApiError(401, 'Session reuse detected. Please log in again.');
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    await revokeFamily(record.familyId);
    await recordAudit({
      req,
      userId: record.userId,
      action: 'auth.refresh',
      outcome: 'failure',
      details: { reason: 'refresh_token_expired' },
    });
    clearRefreshCookie(res);
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user || !user.isActive) {
    await revokeFamily(record.familyId);
    await recordAudit({
      req,
      userId: record.userId,
      action: 'auth.refresh',
      outcome: 'failure',
      details: { reason: 'account_unavailable' },
    });
    clearRefreshCookie(res);
    throw new ApiError(401, 'This account is not available.');
  }

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, record.id));

  const newRefreshToken = signRefreshToken(user.id, record.familyId);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(newRefreshToken),
    familyId: record.familyId,
    expiresAt: refreshExpiryDate(),
  });

  setRefreshCookie(res, newRefreshToken);

  res.json({
    accessToken: signAccessToken(user),
    user: toPublicUser(user),
  });
}

// POST /api/auth/logout
export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

  if (token) {
    const [record] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(token)))
      .limit(1);

    if (record) {
      await revokeFamily(record.familyId);
    }
  }

  clearRefreshCookie(res);
  res.json({ message: 'Logged out successfully.' });
}

// GET /api/auth/me
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new ApiError(401, 'Please log in to continue.');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  res.json({ user: toPublicUser(user) });
}
