import type { Request, Response } from 'express';
import { and, asc, count, desc, eq, gte } from 'drizzle-orm';
import { db } from '../db';
import { events, registrations, users } from '../db/schema';
import { withRegistrationCounts } from './event.controller';

// GET /api/dashboard
// Returns the data needed by the dashboard of whichever role is logged in.
export async function getDashboard(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const now = new Date();

  const upcomingEventRows = await db
    .select()
    .from(events)
    .where(and(eq(events.status, 'published'), gte(events.eventDate, now)))
    .orderBy(asc(events.eventDate))
    .limit(6);

  const upcomingEvents = await withRegistrationCounts(upcomingEventRows);

  const recentEventRows = await db
    .select()
    .from(events)
    .where(eq(events.status, 'published'))
    .orderBy(desc(events.createdAt))
    .limit(4);

  const recentEvents = await withRegistrationCounts(recentEventRows);

  if (user.role === 'admin') {
    const [userCount] = await db
      .select({ total: count() })
      .from(users)
      .where(eq(users.role, 'user'));
    const [eventCount] = await db.select({ total: count() }).from(events);
    const [registrationCount] = await db
      .select({ total: count() })
      .from(registrations)
      .where(eq(registrations.status, 'registered'));

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
      role: 'admin',
      stats: {
        totalUsers: Number(userCount.total),
        totalEvents: Number(eventCount.total),
        totalRegistrations: Number(registrationCount.total),
        upcomingEvents: upcomingEvents.length,
      },
      upcomingEvents,
      recentEvents,
      recentRegistrations,
    });
    return;
  }

  // Normal user dashboard
  const [myRegistrationCount] = await db
    .select({ total: count() })
    .from(registrations)
    .where(
      and(
        eq(registrations.userId, user.id),
        eq(registrations.status, 'registered'),
      ),
    );

  const [myUpcomingCount] = await db
    .select({ total: count() })
    .from(registrations)
    .innerJoin(events, eq(registrations.eventId, events.id))
    .where(
      and(
        eq(registrations.userId, user.id),
        eq(registrations.status, 'registered'),
        gte(events.eventDate, now),
      ),
    );

  const myRegistrations = await db
    .select({
      id: registrations.id,
      status: registrations.status,
      registeredAt: registrations.registeredAt,
      event: events,
    })
    .from(registrations)
    .innerJoin(events, eq(registrations.eventId, events.id))
    .where(
      and(
        eq(registrations.userId, user.id),
        eq(registrations.status, 'registered'),
      ),
    )
    .orderBy(asc(events.eventDate))
    .limit(5);

  res.json({
    role: 'user',
    stats: {
      myRegistrations: Number(myRegistrationCount.total),
      upcomingRegistrations: Number(myUpcomingCount.total),
    },
    upcomingEvents,
    recentEvents,
    myRegistrations,
  });
}
