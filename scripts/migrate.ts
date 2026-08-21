/**
 * Apply pending migrations from src/lib/db/migrations.
 *
 * This is the deploy path. `db:push` diffs the schema and applies the result
 * directly — no version history, no rollback, and it will happily drop a column
 * it thinks is gone. That is fine against a scratch database and unacceptable
 * once real orders exist, so push stays a local convenience and CI runs this.
 *
 * Adopting an existing database: a database created with `db:push` already has
 * every table in 0000, so the baseline must be recorded as applied rather than
 * run. Use `npm run db:migrate -- --baseline` once, then never again.
 */
import { config } from 'dotenv';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

config({ path: '.env.local' });

const MIGRATIONS_FOLDER = 'src/lib/db/migrations';
const baseline = process.argv.includes('--baseline');

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  return url;
}

/**
 * Drizzle records applied migrations by the hash of the SQL file, in
 * drizzle.__drizzle_migrations. Inserting those rows without executing the SQL
 * is how an already-provisioned database adopts a baseline.
 */
async function markBaselineApplied(pool: Pool): Promise<void> {
  const journal = JSON.parse(
    readFileSync(join(MIGRATIONS_FOLDER, 'meta', '_journal.json'), 'utf8'),
  ) as { entries: Array<{ tag: string; when: number }> };

  await pool.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  for (const entry of journal.entries) {
    const sql = readFileSync(join(MIGRATIONS_FOLDER, `${entry.tag}.sql`), 'utf8');
    const hash = createHash('sha256').update(sql).digest('hex');

    const { rowCount } = await pool.query('SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1', [
      hash,
    ]);
    if (rowCount && rowCount > 0) {
      console.log(`  = ${entry.tag} already recorded`);
      continue;
    }

    await pool.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)', [
      hash,
      entry.when,
    ]);
    console.log(`  + ${entry.tag} recorded as applied (not executed)`);
  }
}

async function main() {
  const pool = new Pool({ connectionString: connectionString(), ssl: true, max: 1 });

  try {
    if (baseline) {
      console.log('Baseline: recording existing migrations as applied without running them.\n');
      await markBaselineApplied(pool);
      console.log('\nDone. Run without --baseline from now on.');
      return;
    }

    console.log(`Applying migrations from ${MIGRATIONS_FOLDER}...`);
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
    console.log('Done. Database is at the latest migration.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});
