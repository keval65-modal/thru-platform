#!/usr/bin/env node

/**
 * Utility script to wipe all vendors (and their menu items) from Supabase.
 *
 * Usage:
 *   node cleanup-supabase-vendors.js
 *
 * Automatically loads .env/.env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanup() {
  try {
    console.log('🧹 Starting Supabase cleanup...');

    console.log('  • Deleting menu_items…');
    const { error: menuError } = await supabase
      .from('menu_items')
      .delete()
      .neq('vendor_id', null);
    if (menuError && menuError.code !== 'PGRST116') {
      throw menuError;
    }

    console.log('  • Deleting vendors…');
    const { error: vendorError } = await supabase
      .from('vendors')
      .delete()
      .neq('id', '');
    if (vendorError && vendorError.code !== 'PGRST116') {
      throw vendorError;
    }

    console.log('✅ Supabase vendors table is now empty.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message ?? error);
    process.exit(1);
  }
}

cleanup();

