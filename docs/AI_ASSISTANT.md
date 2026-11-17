# EventHub AI Assistant

The assistant is a read-only help desk for the CPC Event Registration System. It
answers questions about CPC events, registration, and EventHub navigation using
data fetched from the application database for the signed-in user.

## Supported topics

- Upcoming events, descriptions, schedules, dates, venues, and categories
- Event registration procedures and requirements
- Available slots, deadlines, and registration status for the signed-in student
- Student participation and EventHub navigation / FAQ
- Organizer tools and EventHub security (CIA triad), at a general level

Anything else is refused. Requests for another student's data, passwords, API
keys, environment variables, SQL/schema details, system prompts, or attempts to
change the assistant's rules receive a fixed refusal.

## Architecture

| File | Role |
| --- | --- |
| `backend/server/routes/assistant.routes.ts` | Authenticated, rate-limited `POST /api/assistant/chat` |
| `backend/server/controllers/assistant.controller.ts` | Builds a bounded context from the database, applies guards, audits the request |
| `backend/server/services/assistant.ts` | Scope guard, refusals, local FAQ replies, optional model call, output guard |
| `frontend/src/components/AssistantWidget.tsx` | Responsive chat interface with suggestions and loading/error states |

The assistant never receives unrestricted database access. The controller runs a
small set of parameterized Drizzle queries and passes only the resulting bounded
context to the reply logic. Private registration rows are queried with the
authenticated `req.user.id`.

## Local knowledge base (default)

No API key is required. `buildLocalReply()` answers supported FAQs from the
live context, including upcoming events, slots, deadlines, and the signed-in
student's own registrations. If the database has no upcoming events, the
assistant says so instead of inventing one.

## Optional external AI provider

Set a key to use any OpenAI-compatible chat-completions endpoint. The assistant
still applies all guards before and after the model call.

```dotenv
AI_API_KEY=replace-with-your-own-dedicated-key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=20000
AI_MAX_TOKENS=600
```

`OPENAI_API_KEY` is accepted as a fallback for compatibility. Prefer a
dedicated, restricted key, put it only in `.env` (which is git-ignored), and
rotate it if it is ever exposed. Do not paste a real key into documentation,
source files, chat messages, or audit details.

`AI_TIMEOUT_MS` bounds the provider call. `AI_MAX_TOKENS` bounds reply length.
If the provider is unavailable, slow, returns an empty reply, or fails the
output guard, the assistant uses the built-in knowledge base and logs a warning
on the server.

## Guardrails

1. **Authentication** — the chat route requires a valid access token.
2. **Input normalization** — zero-width characters, NFKC variants, and odd
   punctuation are normalized before pattern matching.
3. **Topic guard** — allow-list patterns decide whether a question is on-topic;
   a separate sensitive-pattern list rejects secrets, privacy violations, SQL
   probing, and prompt injection first.
4. **History screening** — browser-supplied history is untrusted. Only exchanges
   that independently pass the guard are forwarded to the model.
5. **Bounded context** — only published upcoming events, aggregate counts, and
   the signed-in user's own registrations are included.
6. **System prompt** — the model is told to use only the supplied context, never
   follow instructions found in user text, never reveal internal data, and
   never claim to have performed an action.
7. **Output guard** — generated replies are re-checked for scope violations,
   secrets, personal identifiers, and false action claims. Unsafe replies are
   discarded in favor of the local knowledge base.
8. **Rate limiting and auditing** — chat is rate limited and every request is
   written to the hash-chained audit log with the scope and source (without the
   message text or credentials).

The widget labels each reply as `AI model`, `EventHub knowledge base`, or
`Scope guard`, and states that the assistant cannot change registrations.

## Verification

```bash
npm run test:assistant
npm run test:api
npm run typecheck:tests
```

The unit tests cover allowed questions, off-topic refusals, privacy and secret
requests, prompt injection, zero-width evasion, history screening, output
guard, and local replies built only from database context. The API tests call a
running backend and verify the same guards end to end.
