# Database backup and recovery

These scripts back up the MySQL/MariaDB database configured in `.env`. They read
credentials from `.env` at run time, pass the password through `MYSQL_PWD`
(never on the command line or in logs), and require a MySQL client tool.

## Prerequisites

- `mysqldump.exe` and `mysql.exe` on `PATH`, or installed in XAMPP's
  `C:\xampp\mysql\bin` folder.
- A populated `.env` in the project root.
- A database user with permission to dump the EventHub database.

## Create a backup

```powershell
npm run db:backup
```

Optional destination:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1 -OutputDirectory "D:\eventhub-backups"
```

The script writes `eventhub_cpc-yyyyMMdd-HHmmss.sql` (including `CREATE DATABASE`
and table data) into `backups/` by default and prints its SHA-256 hash. Store
backups outside the project folder and exclude the `backups/` directory from
version control.

## Restore a backup

Restoring overwrites the configured database and its data. The script asks for
a typed `YES` confirmation.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore-db.ps1 -BackupFile "D:\eventhub-backups\eventhub_cpc-20261117-120000.sql"
```

For non-interactive use only, after verifying the backup:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore-db.ps1 -BackupFile ".\backups\eventhub_cpc-....sql" -Confirm YES
```

After a restore:

1. Start the API and check `http://localhost:4001/api/health` (or your `PORT`).
2. Run `npm run test:api` against the restored database.
3. Sign in and confirm events, registrations, and audit history are present.
4. If restoring an older schema, apply migrations with `npm run db:migrate`.

## Suggested schedule

For a live deployment, schedule `npm run db:backup` nightly and keep at least
seven daily plus four weekly copies in a separate location. Periodically restore
a copy into a disposable database to prove the backup is usable.
