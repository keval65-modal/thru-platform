/**
 * Apply saved_destinations schema to production Supabase.
 *
 * Usage (set DATABASE_URL from Supabase Dashboard → Settings → Database → URI):
 *   npx tsx scripts/apply-saved-destinations-schema.ts
 *
 * Or:
 *   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" npx tsx scripts/apply-saved-destinations-schema.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: path.join(__dirname, '..', '.env.vercel.tmp') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const sqlFile = path.join(
  __dirname,
  '..',
  'src',
  'lib',
  'supabase',
  'sql',
  'saved-destinations-schema.sql'
);

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  if (!databaseUrl) {
    console.error('Missing DATABASE_URL or SUPABASE_DATABASE_URL');
    process.exit(1);
  }

  const ddl = fs.readFileSync(sqlFile, 'utf8');
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    console.log('Applying saved destinations schema…');
    await sql.unsafe(ddl);
    console.log('Done — saved_destinations + destination_travel_patterns are ready.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
