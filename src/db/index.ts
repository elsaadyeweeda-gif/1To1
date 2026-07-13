import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema'; // Extensionless import to support Angular compiler config

/**
 * Creates and configures a connection pool using the Object Method.
 * This connection utilizes the application-level user credentials (SQL_USER)
 * provided by the container environment.
 */
export const createPool = () => {
  const host = process.env['SQL_HOST'];
  const user = process.env['SQL_USER'];
  const password = process.env['SQL_PASSWORD'];
  const database = process.env['SQL_DB_NAME'];

  if (!host || !user || !password || !database) {
    console.warn('Database environment variables are not fully set up yet. Pooling client is in idle setup.');
  }

  return new Pool({
    host: host,
    user: user,
    password: password,
    database: database,
    connectionTimeoutMillis: 15000,
  });
};

// Create the pool instance
const pool = createPool();

// Global handler to prevent unhandled pool errors from crashing the Node.js application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// Initialize and export Drizzle ORM instance bound to the schema and pooling pool
export const db = drizzle(pool, { schema });
