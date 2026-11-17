import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

// Checks the access token sent in the Authorization header. If it is valid,
// the matching user is loaded from the database and attached to req.user.
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError(401, 'Please log in to continue.');
    }

    const token = header.slice('Bearer '.length);
    const decoded = jwt.verify(token, env.jwt.accessSecret) as jwt.JwtPayload;
    const userId = Number(decoded.sub);

    if (!userId) {
      throw new ApiError(401, 'Invalid session. Please log in again.');
    }

    const [foundUser] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        course: users.course,
        yearLevel: users.yearLevel,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!foundUser) {
      throw new ApiError(401, 'This account no longer exists.');
    }

    if (!foundUser.isActive) {
      throw new ApiError(403, 'This account has been deactivated.');
    }

    req.user = {
      id: foundUser.id,
      email: foundUser.email,
      fullName: foundUser.fullName,
      course: foundUser.course,
      yearLevel: foundUser.yearLevel,
      role: foundUser.role,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(new ApiError(401, 'Your session has expired. Please log in again.'));
  }
}

// Use this after authenticate on routes that only admins may access.
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new ApiError(401, 'Please log in to continue.'));
    return;
  }

  if (req.user.role !== 'admin') {
    next(new ApiError(403, 'Administrator access is required.'));
    return;
  }

  next();
}
