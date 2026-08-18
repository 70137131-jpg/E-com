import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * A single pool per process. Next.js hot-reloads modules in development, so the
 * pool is cached on globalThis to avoid exhausting Neon's connection limit.
 */
const globalForDb = globalThis as unknown as { __pool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  }
  return new Pool({
    connectionString,
    // Neon presents a valid certificate chain, so verify it properly.
    ssl: true,
    max: 5,
  });
}

export const pool = globalForDb.__pool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalForDb.__pool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export { schema };
