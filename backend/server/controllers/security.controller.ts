import type { Request, Response } from 'express';
import { and, count, desc, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db';
import {
  refreshTokens,
  securityAuditLogs,
  type SecurityAuditLog,
} from '../db/schema';
import { env } from '../config/env';
import { checkAssistantGuards } from '../services/assistant';
import { checkDatabase } from '../services/health';
import { verifyAuditChain } from '../utils/audit';
import { REFRESH_COOKIE_OPTIONS } from '../utils/tokens';

type Control = {
  name: string;
  detail: string;
};

function control(name: string, detail: string): Control {
  return { name, detail };
}

// GET /api/security/overview
// A live summary of how EventHub implements confidentiality, integrity, and
// availability, plus the current user's refresh-token session status.
export async function getSecurityOverview(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const assistantGuards = checkAssistantGuards();

  const [[activeSessionRow], database] = await Promise.all([
    db
      .select({ total: count() })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      ),
    checkDatabase(),
  ]);

  let audit: {
    available: boolean;
    total: number;
    lastHash: string | null;
    checked: number;
    chainValid: boolean;
  } = {
    available: false,
    total: 0,
    lastHash: null,
    checked: 0,
    chainValid: false,
  };

  try {
    const [totalRow] = await db
      .select({ total: count() })
      .from(securityAuditLogs);
    const [lastRow] = await db
      .select({ entryHash: securityAuditLogs.entryHash })
      .from(securityAuditLogs)
      .orderBy(desc(securityAuditLogs.id))
      .limit(1);
    const verification = await verifyAuditChain(250);

    audit = {
      available: true,
      total: Number(totalRow.total),
      lastHash: lastRow?.entryHash ?? null,
      checked: verification.checked,
      chainValid: verification.valid,
    };
  } catch (error) {
    console.warn(
      'Security overview could not verify the audit chain:',
      error instanceof Error ? error.message : error,
    );
  }

  res.json({
    confidentiality: [
      control(
        'bcrypt password hashing',
        'Passwords are hashed with bcrypt cost 12. Plain-text passwords are never stored.',
      ),
      control(
        'HTTP-only refresh cookie',
        'Refresh tokens live in an httpOnly, sameSite cookie that page scripts cannot read.',
      ),
      control(
        'Role-based access control',
        'Student and organizer routes are protected by authenticate and requireAdmin middleware.',
      ),
      control(
        'Security headers',
        'CSP, nosniff, anti-clickjacking, referrer, and permissions policies are sent on every response.',
      ),
      control(
        'No-store API responses',
        'API responses are marked no-store so private account data is not cached.',
      ),
      control(
        'Audit redaction',
        'Passwords, tokens, secrets, and hashes are redacted before anything is written to the audit trail.',
      ),
    ],
    integrity: [
      control(
        'Signed JWT sessions',
        'Access and refresh tokens are signed, so their contents cannot be changed without detection.',
      ),
      control(
        'Hashed refresh tokens',
        'Only SHA-256 hashes of refresh tokens are stored in the database.',
      ),
      control(
        'Rotation and reuse detection',
        'Every refresh rotates the token. Replaying a used token revokes the entire token family.',
      ),
      control(
        'Tamper-evident audit chain',
        'Each audit entry hashes the previous entry, so editing or deleting a row breaks the chain.',
      ),
      control(
        'Server-side validation and DB constraints',
        'Inputs are validated on the server, and unique indexes protect student IDs and registrations.',
      ),
      control(
        'Transactional capacity checks',
        'Registration row locks prevent two students from taking the same last slot.',
      ),
    ],
    availability: [
      control(
        'Rate limiting',
        'Sign-in and assistant endpoints are rate limited to slow brute-force and flooding attempts.',
      ),
      control(
        'Connection pooling',
        'MySQL connections are reused through a bounded pool to keep the API responsive.',
      ),
      control(
        'Central error handling',
        'Unexpected failures return clean JSON responses instead of crashing the server.',
      ),
      control(
        'Automatic session refresh',
        'The frontend silently refreshes expired access tokens so active users are not interrupted.',
      ),
      control(
        'Health check',
        'The /api/health endpoint confirms the API and database are reachable.',
      ),
      control(
        'Graceful AI fallback',
        'If the external AI provider is unavailable, the assistant falls back to the built-in knowledge base.',
      ),
    ],
    session: {
      accessTokenMinutes: env.jwt.accessTokenMinutes,
      refreshTokenDays: env.jwt.refreshTokenDays,
      activeSessions: Number(activeSessionRow.total),
      cookieHttpOnly: REFRESH_COOKIE_OPTIONS.httpOnly,
      cookieSameSite: REFRESH_COOKIE_OPTIONS.sameSite,
      cookieSecure: REFRESH_COOKIE_OPTIONS.secure,
    },
    assistant: {
      scopeGuard: assistantGuards.scopeGuard,
      provider: env.assistant.apiKey
        ? `External AI model (${env.assistant.model})`
        : 'Built-in EventHub knowledge base',
      systemOnly: assistantGuards.systemOnly,
    },
    checks: {
      database,
      auditChain: audit.available && audit.chainValid,
    },
    audit,
  });
}

// GET /api/security/audit (admin only)
export async function listAuditLogs(
  req: Request,
  res: Response,
): Promise<void> {
  const requested = Number(req.query.limit);
  const limit = Number.isInteger(requested)
    ? Math.min(100, Math.max(1, requested))
    : 40;

  const logs: Pick<
    SecurityAuditLog,
    | 'id'
    | 'userId'
    | 'action'
    | 'outcome'
    | 'ipAddress'
    | 'userAgent'
    | 'details'
    | 'previousHash'
    | 'entryHash'
    | 'createdAt'
  >[] = await db
    .select({
      id: securityAuditLogs.id,
      userId: securityAuditLogs.userId,
      action: securityAuditLogs.action,
      outcome: securityAuditLogs.outcome,
      ipAddress: securityAuditLogs.ipAddress,
      userAgent: securityAuditLogs.userAgent,
      details: securityAuditLogs.details,
      previousHash: securityAuditLogs.previousHash,
      entryHash: securityAuditLogs.entryHash,
      createdAt: securityAuditLogs.createdAt,
    })
    .from(securityAuditLogs)
    .orderBy(desc(securityAuditLogs.id))
    .limit(limit);

  const chain = await verifyAuditChain(Math.max(limit, 250));

  res.json({ logs, chain });
}
