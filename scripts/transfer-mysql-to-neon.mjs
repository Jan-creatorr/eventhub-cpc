
import 'dotenv/config';
import mysql from 'mysql2/promise';
import pg from 'pg';

const { Pool } = pg;

const tables = [
  {
    name: 'users',
    columns: [
      'id', 'full_name', 'email', 'student_id', 'course',
      'year_level', 'password_hash', 'role', 'is_active',
      'created_at', 'updated_at',
    ],
  },
  {
    name: 'events',
    columns: [
      'id', 'title', 'description', 'category', 'organization',
      'venue', 'event_date', 'start_time', 'end_time',
      'capacity', 'registration_deadline', 'status',
      'created_by', 'created_at', 'updated_at',
    ],
  },
  {
    name: 'event_registrations',
    columns: [
      'id', 'user_id', 'event_id', 'status',
      'registered_at', 'cancelled_at',
    ],
  },
  {
    name: 'refresh_tokens',
    columns: [
      'id', 'user_id', 'token_hash', 'family_id',
      'expires_at', 'revoked_at', 'user_agent',
      'ip_address', 'created_at',
    ],
  },
  {
    name: 'security_audit_logs',
    columns: [
      'id', 'user_id', 'action', 'outcome',
      'ip_address', 'user_agent', 'details',
      'nonce', 'previous_hash', 'entry_hash', 'created_at',
    ],
  },
];

if (!process.argv.includes('--confirm-transfer')) {
  console.error('Transfer not started. Review the script first.');
  process.exit(1);
}

for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME', 'DATABASE_URL', 'DIRECT_URL']) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const mysqlConnection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  dateStrings: true,
});

const neonPool = new Pool({
  connectionString: process.env.DIRECT_URL,
  max: 2,
  connectionTimeoutMillis: 10000,
});

let client;
let transactionStarted = false;

try {
  client = await neonPool.connect();

  const sourceData = {};
  const sourceCounts = {};

  for (const table of tables) {
    const [rows] = await mysqlConnection.query(
      `SELECT * FROM \`${table.name}\` ORDER BY id`
    );

    sourceData[table.name] = rows;
    sourceCounts[table.name] = rows.length;
    console.log(`Source ${table.name}: ${rows.length} rows`);
  }

  await client.query('BEGIN');
  transactionStarted = true;

  for (const table of tables) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM "${table.name}"`
    );

    if (result.rows[0].total !== 0) {
      throw new Error(
        `Neon table "${table.name}" is not empty. Transfer stopped.`
      );
    }
  }

  for (const table of tables) {
    const rows = sourceData[table.name];
    if (rows.length === 0) continue;

    const columnNames = table.columns
      .map((column) => `"${column}"`)
      .join(', ');

    const placeholders = table.columns
      .map((_, index) => `$${index + 1}`)
      .join(', ');

    const sql = `
      INSERT INTO "${table.name}" (${columnNames})
      VALUES (${placeholders})
    `;

    for (const row of rows) {
      const values = table.columns.map((column) => {
        const value = row[column];

        if (table.name === 'users' && column === 'is_active') {
          return Boolean(value);
        }

        return value;
      });

      await client.query(sql, values);
    }

    console.log(`Transferred ${rows.length} rows into ${table.name}`);
  }

  for (const table of tables) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM "${table.name}"`
    );

    const destinationCount = result.rows[0].total;
    const sourceCount = sourceCounts[table.name];

    if (destinationCount !== sourceCount) {
      throw new Error(
        `Count mismatch in ${table.name}: source=${sourceCount}, Neon=${destinationCount}`
      );
    }

    console.log(`Verified ${table.name}: ${destinationCount} rows`);
  }

  for (const table of tables) {
    await client.query(
      `
        SELECT setval(
          pg_get_serial_sequence($1, 'id'),
          COALESCE((SELECT MAX(id) FROM "${table.name}"), 1),
          EXISTS (SELECT 1 FROM "${table.name}")
        )
      `,
      [table.name]
    );
  }

  await client.query('COMMIT');
  transactionStarted = false;

  console.log('\nSUCCESS: MySQL data transferred to Neon.');
  console.log('All five tables passed row-count verification.');

} catch (error) {
  if (transactionStarted && client) {
    await client.query('ROLLBACK');
    console.error('Transfer rolled back. Neon data was not committed.');
  }

  console.error('\nTRANSFER FAILED:', error.message);
  process.exitCode = 1;

} finally {
  if (client) client.release();
  await mysqlConnection.end();
  await neonPool.end();
}
