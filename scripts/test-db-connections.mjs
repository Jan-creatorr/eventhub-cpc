
import 'dotenv/config';
import mysql from 'mysql2/promise';
import pg from 'pg';

const { Client } = pg;

let mysqlConnection;
let neonConnection;

try {
  // Test XAMPP MySQL
  mysqlConnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });

  await mysqlConnection.query('SELECT 1');
  console.log('MySQL: CONNECTION SUCCESSFUL');

  // Test Neon PostgreSQL
  neonConnection = new Client({
    connectionString: process.env.DIRECT_URL,
    connectionTimeoutMillis: 10000,
  });

  await neonConnection.connect();
  await neonConnection.query('SELECT 1');

  console.log('Neon: CONNECTION SUCCESSFUL');

  // Check Neon tables
  const result = await neonConnection.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  console.log(
    'Neon tables:',
    result.rows.map(row => row.table_name).join(', ')
  );

} catch (error) {
  console.error('CONNECTION TEST FAILED:', error.message);
  process.exitCode = 1;

} finally {
  if (mysqlConnection) await mysqlConnection.end();
  if (neonConnection) await neonConnection.end();
}
