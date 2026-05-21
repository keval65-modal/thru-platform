#!/usr/bin/env node

/**
 * Utility to wipe vendors + menu items from Supabase using the service role key.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node cleanup-supabase-vendors.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const confirmationProvided =
  process.argv.includes('--force') ||
  process.env.SUPABASE_CONFIRM_VENDOR_PURGE === 'true';

if (!confirmationProvided) {
  console.error('🚫 Aborting: set SUPABASE_CONFIRM_VENDOR_PURGE=true or pass --force to delete vendor data.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false },
});

async function truncateTable(table, primaryKey = 'id') {
  const { error } = await supabase.from(table).delete().not(primaryKey, 'is', null);
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
}

async function run() {
  try {
    console.log('🧹 Purging Supabase tables...');
    await truncateTable('menu_items');
    await truncateTable('vendors');
    console.log('✅ Supabase vendor data cleared.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message || error);
    process.exit(1);
  }
}

run();

