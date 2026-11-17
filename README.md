# EventHub

Event registration for **Cordova Public College (CPC)**. EventHub is a
CPC-only platform where students browse campus events, register for slots,
and manage their tickets, while CPC organizers create events and track
registrations.

## Highlights

- **Login-first access** — visitors only see the EventHub sign-in screen.
  The home page with upcoming events and campus features loads after login.
- **CPC-only accounts** — registration accepts any valid email address. A CPC student ID, course,
  and year level keep accounts tied to the college. Server-side validation is
  enforced.
- **CPC-only events** — categories and hosting organizations come from the
  official CPC lists in `server/config/cpc.ts` and `src/lib/cpc.ts`.
- **Student experience** — dashboard, event search and filters, event
  details, capacity tracking, and My Registrations with cancellation.
- **Organizer tools** — event CRUD, publish/draft/cancel status, participant
  lists, student account management, and a registrations report with CSV
  export.
- **Secure sessions** — short-lived JWT access tokens plus rotating,
  hashed refresh tokens stored in an httpOnly cookie.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Express · Drizzle ORM ·
MySQL / MariaDB (XAMPP)

## Project structure

```text
frontend/   React app (src, public, index.html, vite.config.ts)
backend/    Express API (server), Drizzle schema and migrations, drizzle.config.ts
```

Both folders share the single `package.json` and `node_modules` at the repo
root.

## Getting started

1. Install dependencies.

   ```bash
   npm install
   ```

2. Start MySQL (XAMPP) and create the database and app user.

   ```sql
   CREATE DATABASE eventhub_cpc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'eventhub'@'localhost' IDENTIFIED BY 'replace-with-your-password';
   GRANT ALL PRIVILEGES ON eventhub_cpc.* TO 'eventhub'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. Copy `.env.example` to `.env` and set your own database credentials and JWT
   secrets. Keep `VITE_API_URL=/api` for the Vite dev proxy. The AI Assistant
   works without a key; see [docs/AI_ASSISTANT.md](docs/AI_ASSISTANT.md) for
   optional provider configuration.

4. Push the schema and seed sample CPC data.

   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Run the API and the web app together.

   ```bash
   npm run dev
   ```

   `npm run dev` starts both the API and Vite. The app runs at
   `http://localhost:5173` and the API at `http://localhost:4000`. If you only
   want the frontend, use `npm run vite`.

## Seed accounts

| Role                | Email                    | Password      |
| ------------------- | ------------------------ | ------------- |
| Admin (organizer)   | `admin@cpc.edu.ph`       | `Admin123!`   |
| Student             | `student@cpc.edu.ph`     | `Student123!` |
| Student             | `maria.santos@cpc.edu.ph`| `Student123!` |
| Student             | `kevin.reyes@cpc.edu.ph` | `Student123!` |

These accounts are development samples from `npm run db:seed`. Change or remove
them before any real deployment.

## AI Assistant

The signed-in assistant answers only CPC event, registration, navigation, and
EventHub security questions. It uses the live database, refuses unrelated or
sensitive requests, screens chat history, validates generated replies, and
falls back to a local knowledge base when no AI provider is configured or the
provider fails. It is read-only and never changes registrations.
See [docs/AI_ASSISTANT.md](docs/AI_ASSISTANT.md).

## Security Center

The `/security` page explains the implemented Confidentiality, Integrity, and
Availability controls. It shows live results for database reachability, the
audit hash chain, session count, refresh cookie flags, and assistant guard
probes rather than unverified scores. See [docs/SECURITY.md](docs/SECURITY.md).

## Testing and backups

```bash
npm run typecheck:server
npm run typecheck:tests
npm run lint
npm run build
npm test
npm run db:backup
```

`npm test` runs unit tests plus API integration tests. The API tests target
`http://localhost:4001` by default; set `API_URL` and optional
`API_TEST_*` credentials to target another environment. Backup and restore
instructions are in [docs/BACKUP_RECOVERY.md](docs/BACKUP_RECOVERY.md).

## Scripts

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the API and Vite together              |
| `npm run vite`          | Start only the Vite dev server               |
| `npm run server`        | Start the API with file watching             |
| `npm run dev:all`       | Alias for `npm run dev`                      |
| `npm run db:push`       | Apply the Drizzle schema to MySQL            |
| `npm run db:seed`       | Insert sample CPC accounts and events        |
| `npm run db:generate`   | Generate SQL migrations                      |
| `npm run db:backup`     | Dump the configured database to `backups/`   |
| `npm run db:restore -- -BackupFile <path>` | Restore a dump after confirmation |
| `npm run build`         | Type-check and build the production frontend |
| `npm run typecheck:server` | Type-check the Express server            |
| `npm run typecheck:tests` | Type-check unit and API tests             |
| `npm test`              | Run unit and API integration tests          |
| `npm run test:assistant` | Run AI scope and prompt-injection tests    |
| `npm run test:api`      | Run API authentication/integrity tests      |
| `npm run lint`          | Lint the project                             |

## Production

`npm run build` outputs the frontend to `frontend/dist/`. When that folder
exists, the Express server serves the built app and falls back to
`index.html` for client-side routes, so `npm run server:start` can host the
whole system on port `4000` unless `PORT` is overridden in `.env` or the
process environment. Set `NODE_ENV=production`, replace both JWT secrets, and
restrict `CLIENT_URL` before going live.

Any valid email address may be used to create and access an EventHub account.
Accounts remain tied to a CPC student ID and course, and event organizers can
manage access from the admin dashboard.
