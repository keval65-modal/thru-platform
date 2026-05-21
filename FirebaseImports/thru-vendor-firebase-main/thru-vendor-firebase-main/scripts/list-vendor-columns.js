#!/usr/bin/env node

/**
 * Lists columns present in the Supabase `vendors` table.
 * Requires SUPABASE_DB_CONNECTION_STRING (service role) in env or .env.local.
 */

const { Client } = require('pg');

const connectionString =
  process.env.SUPABASE_DB_CONNECTION_STRING ||
  process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ Missing SUPABASE_DB_CONNECTION_STRING (or SUPABASE_DB_URL).');
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  const { rows } = await client.query(
    `
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'vendors'
      order by ordinal_position;
    `
  );

  console.table(rows);
  await client.end();
}

run().catch((err) => {
  console.error('Failed to list columns:', err.message || err);
  process.exit(1);
});







