import type { Request, Response } from 'express';
import { and, asc, count, countDistinct, eq, gte } from 'drizzle-orm';
import { db } from '../db';
import { events, registrations, users } from '../db/schema';
import { withRegistrationCounts } from './event.controller';

// GET /api/public/events
// A tiny, read-only window into EventHub for the landing page. It only ever
// exposes published, upcoming CPC events.
export async function listPublicEvents(
  _req: Request,
  res: Response,
): Promise<void> {
  const now = new Date();

  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.status, 'published'), gte(events.eventDate, now)))
    .orderBy(asc(events.eventDate))
    .limit(6);

  res.json({ events: await withRegistrationCounts(rows) });
}

// GET /api/public/stats
// Headline numbers shown on the marketing page.
export async function getPublicStats(
  _req: Request,
  res: Response,
): Promise<void> {
  const now = new Date();

  const [studentCount] = await db
    .select({ total: count() })
    .from(users)
    .where(and(eq(users.role, 'user'), eq(users.isActive, true)));

  const [eventCount] = await db
    .select({ total: count() })
    .from(events)
    .where(and(eq(events.status, 'published'), gte(events.eventDate, now)));

  const [registrationCount] = await db
    .select({ total: count() })
    .from(registrations)
    .where(eq(registrations.status, 'registered'));

  const [organizationCount] = await db
    .select({ total: countDistinct(events.organization) })
    .from(events);

  res.json({
    stats: {
      students: Number(studentCount.total),
      upcomingEvents: Number(eventCount.total),
      registrations: Number(registrationCount.total),
      organizations: Number(organizationCount.total),
    },
  });
}
