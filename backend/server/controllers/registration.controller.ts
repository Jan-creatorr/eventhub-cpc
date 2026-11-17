
import type { Request, Response } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { events, registrations, users, type Registration } from '../db/schema';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from '../utils/audit';
import { asText } from '../utils/validate';

// POST /api/registrations/:eventId (user only)
export async function registerForEvent(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const eventId = Number(req.params.eventId);

  if (!Number.isInteger(eventId)) {
    throw new ApiError(400, 'Invalid event id.');
  }

  if (req.user!.role !== 'user') {
    throw new ApiError(403, 'Administrators manage events instead of registering for them.');
  }

  let result: { registration: Registration; reactivated: boolean };

  try {
    result = await db.transaction(async (tx) => {
      const [event] = await tx
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .for('update');

      if (!event || event.status !== 'published') {
        throw new ApiError(404, 'Event not found or not open for registration.');
      }

      const now = new Date();

      if (event.eventDate.getTime() < now.getTime()) {
        throw new ApiError(400, 'This event has already taken place.');
      }

      if (event.registrationDeadline.getTime() < now.getTime()) {
        throw new ApiError(400, 'Registration for this event is already closed.');
      }

      const [existing] = await tx
        .select()
        .from(registrations)
        .where(
          and(
            eq(registrations.userId, userId),
            eq(registrations.eventId, eventId),
          ),
        )
        .limit(1);

      if (existing && existing.status === 'registered') {
        throw new ApiError(409, 'You are already registered for this event.');
      }

      const [countResult] = await tx
        .select({ total: count() })
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, eventId),
            eq(registrations.status, 'registered'),
          ),
        );

      if (Number(countResult.total) >= event.capacity) {
        throw new ApiError(400, 'This event is already full.');
      }

      if (existing) {
        await tx
          .update(registrations)
          .set({
            status: 'registered',
            registeredAt: new Date(),
            cancelledAt: null,
          })
          .where(eq(registrations.id, existing.id));

        const [updated] = await tx
          .select()
          .from(registrations)
          .where(eq(registrations.id, existing.id))
          .limit(1);

        return { registration: updated, reactivated: true };
      }

      const [inserted] = await tx
        .insert(registrations)
        .values({ userId, eventId, status: 'registered' })
        .returning();

      return { registration: inserted, reactivated: false };
    });
  } catch (error) {
    await recordAudit({
      req,
      userId,
      action: 'registration.create',
      outcome: 'failure',
      details: {
        eventId,
        reason:
          error instanceof ApiError ? error.message : 'unexpected_error',
      },
    });

    throw error;
  }

  await recordAudit({
    req,
    userId,
    action: 'registration.create',
    details: {
      eventId,
      registrationId: result.registration.id,
      reactivated: result.reactivated,
    },
  });

  res.status(201).json({
    message: 'You are now registered for this event.',
    registration: result.registration,
  });
}

// GET /api/registrations/me (user only, active tickets)
export async function listMyRegistrations(
  req: Request,
  res: Response,
): Promise<void> {
  const rows = await db
    .select({
      id: registrations.id,
      status: registrations.status,
      registeredAt: registrations.registeredAt,
      cancelledAt: registrations.cancelledAt,
      event: events,
    })
    .from(registrations)
    .innerJoin(events, eq(registrations.eventId, events.id))
    .where(
      and(
        eq(registrations.userId, req.user!.id),
        eq(registrations.status, 'registered'),
      ),
    )
    .orderBy(desc(registrations.registeredAt));

  res.json({ registrations: rows });
}

// DELETE /api/registrations/:id (user cancels their own registration)
export async function cancelRegistration(
  req: Request,
  res: Response,
): Promise<void> {
  const registrationId = Number(req.params.id);

  if (!Number.isInteger(registrationId)) {
    throw new ApiError(400, 'Invalid registration id.');
  }

  const result = await db.transaction(async (tx) => {
    const [registration] = await tx
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.id, registrationId),
          eq(registrations.userId, req.user!.id),
        ),
      )
      .for('update');

    if (!registration) {
      throw new ApiError(404, 'Registration not found.');
    }

    if (registration.status !== 'registered') {
      throw new ApiError(400, 'This registration is already cancelled.');
    }

    const [event] = await tx
      .select({ eventDate: events.eventDate, title: events.title })
      .from(events)
      .where(eq(events.id, registration.eventId))
      .limit(1);

    if (!event) {
      throw new ApiError(404, 'Event not found.');
    }

    if (event.eventDate.getTime() <= Date.now()) {
      throw new ApiError(
        400,
        'You can no longer cancel after the event has started.',
      );
    }

    await tx
      .update(registrations)
      .set({ status: 'cancelled', cancelledAt: new Date() })
      .where(eq(registrations.id, registrationId));

    return {
      registration: {
        id: registration.id,
        userId: registration.userId,
        eventId: registration.eventId,
        status: 'cancelled' as const,
      },
      eventTitle: event.title,
    };
  });

  await recordAudit({
    req,
    userId: req.user!.id,
    action: 'registration.cancel',
    details: result,
  });

  res.json({
    message: 'Your registration has been cancelled.',
    registration: result.registration,
  });
}

// GET /api/registrations (admin only)
export async function listAllRegistrations(
  req: Request,
  res: Response,
): Promise<void> {
  const eventIdFilter = Number(req.query.eventId);
  const statusFilter = asText(req.query.status);

  const conditions = [];

  if (Number.isInteger(eventIdFilter) && eventIdFilter > 0) {
    conditions.push(eq(registrations.eventId, eventIdFilter));
  }

  if (statusFilter === 'registered' || statusFilter === 'cancelled') {
    conditions.push(eq(registrations.status, statusFilter));
  }

  const rows = await db
    .select({
      id: registrations.id,
      status: registrations.status,
      registeredAt: registrations.registeredAt,
      cancelledAt: registrations.cancelledAt,
      user: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        studentId: users.studentId,
        course: users.course,
        yearLevel: users.yearLevel,
      },
      event: {
        id: events.id,
        title: events.title,
        eventDate: events.eventDate,
        venue: events.venue,
        organization: events.organization,
      },
    })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .innerJoin(events, eq(registrations.eventId, events.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(registrations.registeredAt));

  res.json({ registrations: rows });
}

// GET /api/registrations/event/:eventId (admin only)
export async function listEventParticipants(
  req: Request,
  res: Response,
): Promise<void> {
  const eventId = Number(req.params.eventId);

  if (!Number.isInteger(eventId)) {
    throw new ApiError(400, 'Invalid event id.');
  }

  const rows = await db
    .select({
      registrationId: registrations.id,
      status: registrations.status,
      registeredAt: registrations.registeredAt,
      fullName: users.fullName,
      email: users.email,
      studentId: users.studentId,
      course: users.course,
      yearLevel: users.yearLevel,
    })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .where(
      and(
        eq(registrations.eventId, eventId),
        eq(registrations.status, 'registered'),
      ),
    )
    .orderBy(desc(registrations.registeredAt));

  res.json({ participants: rows });
}
