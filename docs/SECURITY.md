# Security implementation (CIA triad)

EventHub implements the CIA triad as application controls, not just as a
display page. The Security Center (`/security`) describes these controls and
shows live check results where a check is possible.

## Confidentiality

- **Authentication and roles** — `authenticate` verifies a signed JWT and loads
  the current user; `requireAdmin` protects organizer routes. Students cannot
  open admin endpoints or another student's registrations.
- **Password hashing** — bcrypt cost 12. Plain-text passwords are never stored
  or audited.
- **Session cookies** — refresh tokens are stored in an httpOnly, SameSite=Lax
  cookie (`secure` in production). Page scripts cannot read them.
- **Bearer access tokens** — short-lived access tokens are sent in the
  `Authorization` header, which also prevents ordinary cross-site form posts
  from calling protected APIs.
- **CORS and CSRF** — CORS is restricted to `CLIENT_URL`; cookie-based
  `refresh`/`logout` routes additionally reject unexpected `Origin` headers.
- **Response headers** — CSP, `nosniff`, `X-Frame-Options: DENY`, referrer and
  permissions policies, HSTS in production, and `no-store` on API responses.
- **Injection safety** — Drizzle/parameterized queries, React output escaping,
  server-side CPC category/organization allow-lists, and bounded JSON bodies.
- **Audit redaction** — sensitive keys such as password, token, secret, cookie,
  authorization, and hash are redacted before audit details are stored.
- **Environment handling** — configuration is read through `server/config/env.ts`
  from `.env`; secrets are never returned by an API or sent to the AI model.

## Integrity

- **Hash-chained audit log** — each `security_audit_logs` row stores a nonce,
  previous hash, and SHA-256 entry hash. Writes are serialized in-process and
  `verifyAuditChain()` recomputes the chain for the Security Center.
- **Audited actions** — login, registration, cancellation, event create/update/
  status/delete, student role/status changes, and assistant requests.
- **Duplicate registration prevention** — unique index
  `unique_user_event (user_id, event_id)` plus an in-transaction check.
- **Capacity and deadline validation** — registration locks the event row with
  `SELECT ... FOR UPDATE`, checks publication status, event date, deadline, and
  remaining slots before inserting. Event updates use the same row-lock pattern
  so capacity cannot be lowered below confirmed registrations.
- **Transactional writes** — registration, cancellation, and event capacity
  updates run in database transactions.
- **Role and ownership checks** — only the owner can cancel a registration;
  only admins can change event status, student roles, or account status.
- **Refresh-token integrity** — only SHA-256 hashes are stored, every refresh
  rotates the token, and replaying a used token revokes the whole family.
- **Validation** — server-side email, password, student ID, course, year level,
  date, time, capacity, and status checks.

## Availability

- **Connection pooling** — a bounded MySQL pool with a listener for pool-level
  errors, so a connection error does not crash the process.
- **Degraded startup** — the API starts even if MySQL is temporarily down and
  reports the state through health checks; the pool retries on later requests.
- **Health check** — `GET /api/health` performs a bounded `SELECT 1` probe and
  returns 200 (`ok`) or 503 (`degraded`) with the database status.
- **Central error handling** — clean JSON errors for malformed JSON, duplicate
  records, missing references, database outages, and unexpected failures.
- **Rate limiting** — sign-in and assistant endpoints are rate limited.
- **AI failure isolation** — provider timeouts/errors fall back to the local
  knowledge base instead of failing the request.
- **Graceful shutdown** — SIGINT/SIGTERM close the HTTP server and pool with a
  bounded shutdown window.
- **Backup and recovery** — see `docs/BACKUP_RECOVERY.md`.

## What the Security Center actually checks

| Displayed item | Source |
| --- | --- |
| Database reachable | Live `SELECT 1` probe via `checkDatabase()` |
| Audit chain valid | Recomputed SHA-256 chain via `verifyAuditChain()` |
| Active sessions | Count of unrevoked, unexpired refresh tokens for the signed-in user |
| Refresh cookie flags | Read from the same options object used to set the cookie |
| Scope guard / output guard | Runtime probe calls in `checkAssistantGuards()` |
| Token lifetimes and provider | Configuration values used by the server |

Implemented controls that cannot be reduced to a single live boolean (for
example, token rotation and reuse detection code paths) are described in the
control lists rather than shown as fake status badges.

## Production checklist

1. Set long random `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values.
2. Set `NODE_ENV=production` so cookies are `secure` and HSTS is sent.
3. Restrict `CLIENT_URL` to the real frontend origin.
4. Use a dedicated database user with least-necessary privileges.
5. Configure AI credentials only if an external model is wanted; keep `.env`
   private and never commit it.
6. Schedule backups and rehearse restoration (`docs/BACKUP_RECOVERY.md`).
7. Run `npm run test`, `npm run lint`, and `npm run build` after changes.

Known limitation: the in-memory rate limiter is per process. A multi-instance
deployment should move it to a shared store such as Redis.
