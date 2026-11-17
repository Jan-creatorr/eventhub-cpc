import type { Request, Response } from 'express';
import { and, count, desc, eq, gte, isNull } from 'drizzle-orm';
import { db } from '../db';
import { events, refreshTokens, registrations, users } from '../db/schema';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from '../utils/audit';
import { asText } from '../utils/validate';

// GET /api/admin/stats
export async function getStats(_req: Request, res: Response): Promise<void> {
  const now = new Date();

  const [userCount] = await db
    .select({ total: count() })
    .from(users)
    .where(eq(users.role, 'user'));

  const [eventCount] = await db.select({ total: count() }).from(events);

  const [registrationCount] = await db
    .select({ total: count() })
    .from(registrations)
    .where(eq(registrations.status, 'registered'));

  const [upcomingCount] = await db
    .select({ total: count() })
    .from(events)
    .where(and(eq(events.status, 'published'), gte(events.eventDate, now)));

  const recentRegistrations = await db
    .select({
      id: registrations.id,
      status: registrations.status,
      registeredAt: registrations.registeredAt,
      user: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
      event: {
        id: events.id,
        title: events.title,
        eventDate: events.eventDate,
      },
    })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .innerJoin(events, eq(registrations.eventId, events.id))
    .orderBy(desc(registrations.registeredAt))
    .limit(6);

  res.json({
    stats: {
      totalUsers: Number(userCount.total),
      totalEvents: Number(eventCount.total),
      totalRegistrations: Number(registrationCount.total),
      upcomingEvents: Number(upcomingCount.total),
    },
    recentRegistrations,
  });
}

// GET /api/admin/users
export async function listUsers(_req: Request, res: Response): Promise<void> {
  const userList = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      studentId: users.studentId,
      course: users.course,
      yearLevel: users.yearLevel,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const registrationCounts = await db
    .select({
      userId: registrations.userId,
      total: count(),
    })
    .from(registrations)
    .where(eq(registrations.status, 'registered'))
    .groupBy(registrations.userId);

  const countByUserId = new Map(
    registrationCounts.map((row) => [row.userId, Number(row.total)]),
  );

  res.json({
    users: userList.map((user) => ({
      ...user,
      registrationCount: countByUserId.get(user.id) ?? 0,
    })),
  });
}

// PATCH /api/admin/users/:id/status
export async function updateUserStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = Number(req.params.id);
  const isActive = req.body.isActive;

  if (!Number.isInteger(userId)) {
    throw new ApiError(400, 'Invalid user id.');
  }
  if (typeof isActive !== 'boolean') {
    throw new ApiError(400, 'isActive must be true or false.');
  }
  if (userId === req.user!.id) {
    throw new ApiError(400, 'You cannot deactivate your own account.');
  }

  const [existing] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, 'User not found.');
  }

  await db.update(users).set({ isActive }).where(eq(users.id, userId));

  // When an account is deactivated, end all of its refresh sessions too.
  if (!isActive) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  await recordAudit({
    req,
    action: 'admin.user_status_change',
    details: {
      targetUserId: existing.id,
      targetName: existing.fullName,
      targetRole: existing.role,
      from: existing.isActive,
      to: isActive,
      sessionsRevoked: !isActive,
    },
  });

  res.json({
    message: isActive ? 'Account activated.' : 'Account deactivated.',
  });
}

// PATCH /api/admin/users/:id/role
export async function updateUserRole(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = Number(req.params.id);
  const role = asText(req.body.role);

  if (!Number.isInteger(userId)) {
    throw new ApiError(400, 'Invalid user id.');
  }
  if (role !== 'admin' && role !== 'user') {
    throw new ApiError(400, 'Role must be either admin or user.');
  }
  if (userId === req.user!.id) {
    throw new ApiError(400, 'You cannot change your own role.');
  }

  const [existing] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, 'User not found.');
  }

  await db.update(users).set({ role }).where(eq(users.id, userId));

  await recordAudit({
    req,
    action: 'admin.user_role_change',
    details: {
      targetUserId: existing.id,
      targetName: existing.fullName,
      from: existing.role,
      to: role,
    },
  });

  res.json({ message: `User role changed to ${role}.` });
}

// DELETE /api/admin/users/:id
export async function deleteUser(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId)) {
    throw new ApiError(400, 'Invalid user id.');
  }
  if (userId === req.user!.id) {
    throw new ApiError(400, 'You cannot delete your own account.');
  }

  const [existing] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, 'User not found.');
  }

  const [registrationCount] = await db
    .select({ total: count() })
    .from(registrations)
    .where(eq(registrations.userId, userId));

  // Registrations and refresh tokens are removed by the database cascade.
  await db.delete(users).where(eq(users.id, userId));

  await recordAudit({
    req,
    action: 'admin.user_delete',
    details: {
      targetUserId: existing.id,
      targetName: existing.fullName,
      targetRole: existing.role,
      registrationsRemoved: Number(registrationCount.total),
    },
  });

  res.json({ message: 'User deleted successfully.' });
}
