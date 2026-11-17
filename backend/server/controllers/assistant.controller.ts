import type { Request, Response } from 'express';
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
} from 'drizzle-orm';
import { db } from '../db';
import { events, registrations, users } from '../db/schema';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from '../utils/audit';
import { withRegistrationCounts } from './event.controller';
import {
  askAssistantModel,
  buildLocalReply,
  classifyScope,
  isUnsafeAssistantReply,
  refusalFor,
  sanitizeHistory,
  type AssistantContext,
} from '../services/assistant';

type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

async function buildAssistantContext(
  userId: number,
  user: NonNullable<Request['user']>,
): Promise<AssistantContext> {
  const now = new Date();

  const [
    [studentCount],
    [eventCount],
    [registrationCount],
    [organizationCount],
    upcomingRows,
    myRegistrationRows,
  ] = await Promise.all([
    db
      .select({ total: count() })
      .from(users)
      .where(and(eq(users.role, 'user'), eq(users.isActive, true))),
    db
      .select({ total: count() })
      .from(events)
      .where(and(eq(events.status, 'published'), gte(events.eventDate, now))),
    db
      .select({ total: count() })
      .from(registrations)
      .where(eq(registrations.status, 'registered')),
    db
      .select({ total: countDistinct(events.organization) })
      .from(events),
    db
      .select()
      .from(events)
      .where(and(eq(events.status, 'published'), gte(events.eventDate, now)))
      .orderBy(asc(events.eventDate))
      .limit(8),
    db
      .select({
        status: registrations.status,
        event: events,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .where(eq(registrations.userId, userId))
      .orderBy(desc(registrations.registeredAt))
      .limit(12),
  ]);

  const upcomingEvents = await withRegistrationCounts(upcomingRows);

  return {
    user: {
      fullName: user.fullName,
      role: user.role,
      course: user.course,
      yearLevel: user.yearLevel,
    },
    stats: {
      students: Number(studentCount.total),
      upcomingEvents: Number(eventCount.total),
      registrations: Number(registrationCount.total),
      organizations: Number(organizationCount.total),
    },
    upcomingEvents: upcomingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      category: event.category,
      organization: event.organization,
      venue: event.venue,
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime,
      capacity: event.capacity,
      registrationDeadline: event.registrationDeadline,
      registeredCount: event.registeredCount,
    })),
    myRegistrations: myRegistrationRows.map((row) => ({
      eventTitle: row.event.title,
      status: row.status,
      eventDate: row.event.eventDate,
      venue: row.event.venue,
    })),
  };
}

function readHistory(value: unknown): ChatHistoryItem[] {
  if (!Array.isArray(value)) return [];

  const history: ChatHistoryItem[] = [];

  for (const item of value.slice(-8)) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;

    if (
      (role === 'user' || role === 'assistant') &&
      typeof content === 'string' &&
      content.trim()
    ) {
      history.push({
        role,
        content: content.trim().slice(0, 1000),
      });
    }
  }

  return history;
}

// POST /api/assistant/chat
// The assistant is intentionally scoped to EventHub. Every message passes a
// system-topic guard before it can reach the language model.
export async function chat(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new ApiError(401, 'Please log in to use the EventHub assistant.');
  }

  const message =
    typeof req.body?.message === 'string' ? req.body.message.trim() : '';

  if (!message) {
    throw new ApiError(400, 'Please type a question for the assistant.');
  }
  if (message.length > 1000) {
    throw new ApiError(
      400,
      'Your question is too long. Please keep it under 1,000 characters.',
    );
  }

  const history = readHistory(req.body?.history);
  const previousUserMessages = history
    .filter((item) => item.role === 'user')
    .map((item) => item.content);

  const scope = classifyScope(message, previousUserMessages);

  if (scope !== 'on-topic') {
    await recordAudit({
      req,
      userId: req.user.id,
      action: 'assistant.chat',
      outcome: scope === 'sensitive' ? 'warning' : 'failure',
      details: { scope, messageLength: message.length },
    });

    res.json({
      reply: refusalFor(scope),
      scope,
      source: 'guardrail',
    });
    return;
  }

  const context = await buildAssistantContext(req.user.id, req.user);
  let reply = buildLocalReply(message, context);
  let source: 'knowledge-base' | 'ai' = 'knowledge-base';
  const safeHistory = sanitizeHistory(history);

  if (env.assistant.apiKey) {
    try {
      const aiReply = await askAssistantModel(message, safeHistory, context);
      if (aiReply && !isUnsafeAssistantReply(aiReply)) {
        reply = aiReply;
        source = 'ai';
      } else if (aiReply) {
        console.warn(
          'EventHub assistant provider reply failed the output guard; using the built-in knowledge base.',
        );
      }
    } catch (error) {
      console.warn(
        'EventHub assistant provider unavailable, using the built-in knowledge base:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  await recordAudit({
    req,
    userId: req.user.id,
    action: 'assistant.chat',
    details: {
      scope,
      source,
      messageLength: message.length,
      historyEntries: safeHistory.length,
      upcomingEvents: context.upcomingEvents.length,
    },
  });

  res.json({ reply, scope, source });
}
