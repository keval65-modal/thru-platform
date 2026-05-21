#!/usr/bin/env node

/**
 * Utility to delete ALL Supabase Auth users using the service role key.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node cleanup-supabase-auth-users.js
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
  process.env.SUPABASE_CONFIRM_AUTH_PURGE === 'true';

if (!confirmationProvided) {
  console.error('🚫 Aborting: set SUPABASE_CONFIRM_AUTH_PURGE=true or pass --force to delete users.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false },
});

async function listAllUsers(perPage = 1000) {
  let page = 1;
  const users = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    if (!data?.users?.length) {
      break;
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function run() {
  try {
    console.log('🔍 Fetching Supabase Auth users...');
    const users = await listAllUsers();
    console.log(`Found ${users.length} users to delete.`);

    for (const user of users) {
      const label = user.email || user.phone || user.id;
      process.stdout.write(`🗑️  Deleting ${label}... `);
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`failed (${error.message})`);
        continue;
      }
      console.log('done');
    }

    console.log('✅ Supabase Auth users cleared.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message || error);
    process.exit(1);
  }
}

run();


