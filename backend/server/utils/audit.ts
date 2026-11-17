import crypto from 'node:crypto';
import type { Request } from 'express';
import { desc } from 'drizzle-orm';
import { db } from '../db';
import { securityAuditLogs } from '../db/schema';

// Never let passwords, tokens, secrets, or hashes leak into the audit trail.
const SENSITIVE_KEY_PATTERN =
  /pass(word)?|token|secret|authorization|cookie|jwt|hash|api.?key/i;

export type AuditOutcome = 'success' | 'failure' | 'warning';

type AuditInput = {
  action: string;
  outcome?: AuditOutcome;
  userId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown>;
  req?: Request;
};

type AuditHashInput = {
  action: string;
  outcome: string;
  userId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: string;
  nonce: string;
  previousHash: string;
};

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[redacted]';

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redact(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : redact(item, depth + 1),
      ]),
    );
  }

  if (typeof value === 'string') return value.slice(0, 500);
  return value;
}

export function sanitizeAuditDetails(
  details?: Record<string, unknown>,
): string {
  if (!details) return '{}';

  try {
    return JSON.stringify(redact(details)).slice(0, 2000);
  } catch {
    return '{"note":"details unavailable"}';
  }
}

function hashEntry(input: AuditHashInput): string {
  return crypto
    .createHash('sha256')
    .update(
      [
        input.action,
        input.outcome,
        input.userId ?? '',
        input.ipAddress ?? '',
        input.userAgent ?? '',
        input.details,
        input.nonce,
        input.previousHash,
      ].join('|'),
    )
    .digest('hex');
}

function requestIp(req?: Request): string | null {
  if (!req) return null;
  const value = req.ip ?? req.socket.remoteAddress ?? '';
  return value ? String(value).slice(0, 64) : null;
}

function requestUserAgent(req?: Request): string | null {
  if (!req) return null;
  const value = req.headers['user-agent'];
  return value ? String(value).slice(0, 255) : null;
}

// Appends one tamper-evident entry to the audit chain. Writes are serialized
// inside this process so two simultaneous requests cannot read the same
// previous hash and fork the chain. Logging must never break the request
// itself, so failures are reported to the console only.
let auditWriteQueue: Promise<void> = Promise.resolve();

async function writeAudit(input: AuditInput): Promise<void> {
  try {
    const [latest] = await db
      .select({ entryHash: securityAuditLogs.entryHash })
      .from(securityAuditLogs)
      .orderBy(desc(securityAuditLogs.id))
      .limit(1);

    const previousHash = latest?.entryHash ?? 'GENESIS';
    const nonce = crypto.randomUUID();
    const details = sanitizeAuditDetails(input.details);
    const userId = input.userId ?? input.req?.user?.id ?? null;
    const ipAddress = input.ipAddress ?? requestIp(input.req);
    const userAgent = input.userAgent ?? requestUserAgent(input.req);

    const entryHash = hashEntry({
      action: input.action,
      outcome: input.outcome ?? 'success',
      userId,
      ipAddress,
      userAgent,
      details,
      nonce,
      previousHash,
    });

    await db.insert(securityAuditLogs).values({
      userId,
      action: input.action,
      outcome: input.outcome ?? 'success',
      ipAddress,
      userAgent,
      details,
      nonce,
      previousHash,
      entryHash,
    });
  } catch (error) {
    console.error(
      'Could not write audit log:',
      error instanceof Error ? error.message : error,
    );
  }
}

export function recordAudit(input: AuditInput): Promise<void> {
  const write = auditWriteQueue.then(() => writeAudit(input));
  auditWriteQueue = write.catch(() => undefined);
  return write;
}

// Recomputes the hashes for the newest entries and checks that each row is
// linked to the row before it. A broken link means the log was tampered with.
export async function verifyAuditChain(
  limit = 250,
): Promise<{ checked: number; valid: boolean }> {
  const rows = await db
    .select({
      action: securityAuditLogs.action,
      outcome: securityAuditLogs.outcome,
      userId: securityAuditLogs.userId,
      ipAddress: securityAuditLogs.ipAddress,
      userAgent: securityAuditLogs.userAgent,
      details: securityAuditLogs.details,
      nonce: securityAuditLogs.nonce,
      previousHash: securityAuditLogs.previousHash,
      entryHash: securityAuditLogs.entryHash,
    })
    .from(securityAuditLogs)
    .orderBy(desc(securityAuditLogs.id))
    .limit(limit);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const expected = hashEntry({ ...row, outcome: row.outcome });

    if (expected !== row.entryHash) {
      return { checked: index + 1, valid: false };
    }

    const older = rows[index + 1];
    if (older && row.previousHash !== older.entryHash) {
      return { checked: index + 1, valid: false };
    }
  }

  return { checked: rows.length, valid: true };
}
