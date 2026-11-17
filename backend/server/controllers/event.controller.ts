
import type { Request, Response } from 'express';
import { and, count, desc, eq, inArray, like, or } from 'drizzle-orm';
import { db } from '../db';
import { events, registrations, type Event } from '../db/schema';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from '../utils/audit';
import {
  isCpcCategory,
  isCpcOrganization,
} from '../config/cpc';
import {
  asPositiveInt,
  asText,
  isValidTime,
  parseDate,
} from '../utils/validate';

const EVENT_STATUSES = ['draft', 'published', 'cancelled'] as const;

export async function withRegistrationCounts(eventList: Event[]) {
  if (eventList.length === 0) return [];

  const eventIds = eventList.map((event) => event.id);

  const counts = await db
    .select({
      eventId: registrations.eventId,
      total: count(),
    })
    .from(registrations)
    .where(
      and(
        inArray(registrations.eventId, eventIds),
        eq(registrations.status, 'registered'),
      ),
    )
    .groupBy(registrations.eventId);

  const countByEventId = new Map(
    counts.map((row) => [row.eventId, Number(row.total)]),
  );

  return eventList.map((event) => ({
    ...event,
    registeredCount: countByEventId.get(event.id) ?? 0,
  }));
}

type EventInput = {
  title: string;
  description: string;
  category: string;
  organization: string;
  venue: string;
  eventDate: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  registrationDeadline: Date;
  status: (typeof EVENT_STATUSES)[number];
};

function readEventInput(body: Record<string, unknown>): EventInput {
  const title = asText(body.title);
  const description = asText(body.description);
  const category = asText(body.category) || 'Academic';
  const organization = asText(body.organization);
  const venue = asText(body.venue);
  const eventDate = parseDate(body.eventDate);
  const startTime = asText(body.startTime);
  const endTime = asText(body.endTime);
  const capacity = asPositiveInt(body.capacity);
  const registrationDeadline = parseDate(body.registrationDeadline);
  const status = asText(body.status) || 'draft';

  if (title.length < 3) {
    throw new ApiError(400, 'Event title must be at least 3 characters.');
  }
  if (description.length < 10) {
    throw new ApiError(400, 'Event description must be at least 10 characters.');
  }
  if (!isCpcCategory(category)) {
    throw new ApiError(
      400,
      'Please choose a valid CPC event category.',
    );
  }
  if (!isCpcOrganization(organization)) {
    throw new ApiError(
      400,
      'Please choose the CPC organization hosting this event.',
    );
  }
  if (!venue) {
    throw new ApiError(400, 'Event venue is required.');
  }
  if (!eventDate) {
    throw new ApiError(400, 'Please provide a valid event date.');
  }
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    throw new ApiError(400, 'Start and end time must use the HH:MM format.');
  }
  if (endTime <= startTime) {
    throw new ApiError(400, 'End time must be later than start time.');
  }
  if (!capacity) {
    throw new ApiError(400, 'Capacity must be a positive whole number.');
  }
  if (!registrationDeadline) {
    throw new ApiError(400, 'Please provide a valid registration deadline.');
  }
  if (registrationDeadline.getTime() > eventDate.getTime()) {
    throw new ApiError(
      400,
      'The registration deadline must be on or before the event date.',
    );
  }
  if (!EVENT_STATUSES.includes(status as EventInput['status'])) {
    throw new ApiError(400, 'Invalid event status.');
  }

  return {
    title,
    description,
    category,
    organization,
    venue,
    eventDate,
    startTime,
    endTime,
    capacity,
    registrationDeadline,
    status: status as EventInput['status'],
  };
}

// GET /api/events
export async function listEvents(req: Request, res: Response): Promise<void> {
  const isAdmin = req.user?.role === 'admin';
  const search = asText(req.query.search);
  const statusFilter = asText(req.query.status);

  const conditions = [];

  if (!isAdmin) {
    conditions.push(eq(events.status, 'published'));
  } else if (EVENT_STATUSES.includes(statusFilter as EventInput['status'])) {
    conditions.push(eq(events.status, statusFilter as EventInput['status']));
  }

  if (search) {
    const pattern = `%${search}%`;

    conditions.push(
      or(
        like(events.title, pattern),
        like(events.venue, pattern),
        like(events.category, pattern),
        like(events.organization, pattern),
      ),
    );
  }

  const eventList = await db
    .select()
    .from(events)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(events.eventDate));

  res.json({ events: await withRegistrationCounts(eventList) });
}

// GET /api/events/:id
export async function getEvent(req: Request, res: Response): Promise<void> {
  const eventId = Number(req.params.id);

  if (!Number.isInteger(eventId)) {
    throw new ApiError(400, 'Invalid event id.');
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  if (req.user?.role !== 'admin' && event.status !== 'published') {
    throw new ApiError(404, 'Event not found.');
  }

  const [withCount] = await withRegistrationCounts([event]);

  let myRegistration = null;

  if (req.user) {
    const [registration] = await db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, eventId),
          eq(registrations.userId, req.user.id),
        ),
      )
      .limit(1);

    myRegistration = registration ?? null;
  }

  res.json({ event: { ...withCount, myRegistration } });
}

// POST /api/events (admin only)
export async function createEvent(req: Request, res: Response): Promise<void> {
  const input = readEventInput(req.body);

  const [event] = await db
    .insert(events)
    .values({ ...input, createdBy: req.user!.id })
    .returning();

  await recordAudit({
    req,
    action: 'event.create',
    details: {
      eventId: event.id,
      title: event.title,
      status: event.status,
      capacity: event.capacity,
    },
  });

  res.status(201).json({
    message: 'Event created successfully.',
    event: { ...event, registeredCount: 0 },
  });
}

// PUT /api/events/:id (admin only)
export async function updateEvent(req: Request, res: Response): Promise<void> {
  const eventId = Number(req.params.id);

  if (!Number.isInteger(eventId)) {
    throw new ApiError(400, 'Invalid event id.');
  }

  const input = readEventInput(req.body);
  let previous: Event | undefined;

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .for('update');

    if (!locked) {
      throw new ApiError(404, 'Event not found.');
    }

    previous = locked;

    const [confirmed] = await tx
      .select({ total: count() })
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, eventId),
          eq(registrations.status, 'registered'),
        ),
      );

    if (input.capacity < Number(confirmed.total)) {
      throw new ApiError(
        400,
        `Capacity cannot be lower than the ${Number(confirmed.total)} confirmed registration${Number(confirmed.total) === 1 ? '' : 's'}.`,
      );
    }

    await tx.update(events).set(input).where(eq(events.id, eventId));
  });

  if (!previous) {
    throw new ApiError(404, 'Event not found.');
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  const [withCount] = await withRegistrationCounts([event]);

  await recordAudit({
    req,
    action: 'event.update',
    details: {
      eventId,
      title: event.title,
      previous: {
        title: previous.title,
        status: previous.status,
        venue: previous.venue,
        capacity: previous.capacity,
        eventDate: previous.eventDate,
        registrationDeadline: previous.registrationDeadline,
      },
      current: {
        title: event.title,
        status: event.status,
        venue: event.venue,
        capacity: event.capacity,
        eventDate: event.eventDate,
        registrationDeadline: event.registrationDeadline,
      },
    },
  });

  res.json({ message: 'Event updated successfully.', event: withCount });
}

// PATCH /api/events/:id/status (admin only)
export async function updateEventStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const eventId = Number(req.params.id);
  const status = asText(req.body.status);

  if (!Number.isInteger(eventId)) {
    throw new ApiError(400, 'Invalid event id.');
  }

  if (!EVENT_STATUSES.includes(status as EventInput['status'])) {
    throw new ApiError(400, 'Invalid event status.');
  }

  const [existing] = await db
    .select({ id: events.id, title: events.title, status: events.status })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, 'Event not found.');
  }

  await db
    .update(events)
    .set({ status: status as EventInput['status'] })
    .where(eq(events.id, eventId));

  await recordAudit({
    req,
    action: 'event.status_change',
    details: {
      eventId,
      title: existing.title,
      from: existing.status,
      to: status,
    },
  });

  res.json({ message: `Event status changed to ${status}.` });
}

// DELETE /api/events/:id (admin only)
export async function deleteEvent(req: Request, res: Response): Promise<void> {
  const eventId = Number(req.params.id);

  if (!Number.isInteger(eventId)) {
    throw new ApiError(400, 'Invalid event id.');
  }

  const [existing] = await db
    .select({ id: events.id, title: events.title, status: events.status })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, 'Event not found.');
  }

  const [registrationCount] = await db
    .select({ total: count() })
    .from(registrations)
    .where(eq(registrations.eventId, eventId));

  await db.delete(events).where(eq(events.id, eventId));

  await recordAudit({
    req,
    action: 'event.delete',
    details: {
      eventId,
      title: existing.title,
      status: existing.status,
      registrationsRemoved: Number(registrationCount.total),
    },
  });

  res.json({ message: 'Event deleted successfully.' });
}
