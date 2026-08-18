import { db, pool } from '../src/lib/db/index';
import { products } from '../src/lib/db/schema';

async function main() {
  const rows = await db.select({ slug: products.slug }).from(products).limit(3);
  console.log('connected, sample:', rows.map((r) => r.slug).join(', '));
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
