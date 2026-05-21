#!/usr/bin/env node

/**
 * Script to create one test vendor login per shop category in Supabase.
 *
 * Creates:
 * - Supabase Auth users (email/password, email_confirm=true)
 * - Matching rows in the `vendors` table (id = auth user id)
 *
 * Usage:
 *   node scripts/setup-test-vendors.js
 *
 * Requires environment variables in .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌ MISSING');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌ MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEST_PASSWORD = process.env.TEST_VENDOR_PASSWORD || 'TestVendor123!';
const TEST_EMAIL_DOMAIN = process.env.TEST_VENDOR_EMAIL_DOMAIN || 'thru.app';

// Keep this list in sync with the UI category list (Signup/Profile/Admin edit).
const SHOP_CATEGORIES = [
  'Grocery Store',
  'Restaurant',
  'Bakery',
  'Boutique',
  'Electronics',
  'Cafe',
  'Pharmacy',
  'Liquor Shop',
  'Pet Shop',
  'Gift Shop',
  'Other',
];

function normalizeStoreType(category) {
  return String(category || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function slugifyCategory(category) {
  return normalizeStoreType(category)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeTestEmail(category) {
  // Example: vendor-test-restaurant@thru.app
  const slug = slugifyCategory(category) || 'other';
  return `vendor-test-${slug}@${TEST_EMAIL_DOMAIN}`;
}

function makeTestPhone(index) {
  // Reserve +910000000000 for admin per ADMIN_SETUP.md
  // Start vendors at +910000000001 and increment.
  const base = 1000000000; // 10 digits
  const n = base + (index + 1);
  return `+91${String(n).padStart(10, '0')}`;
}

async function getUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function createOrUpdateAuthUser({ email, password }) {
  let user = await getUserByEmail(email);
  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (error) throw error;
    user = data.user || user;
    return { user, created: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return { user: data.user, created: true };
}

async function upsertVendorProfile({
  id,
  email,
  phone,
  storeType,
  displayName,
  ownerName,
}) {
  const now = new Date().toISOString();

  // Keep fields aligned with what the app expects for "registration complete"
  // (name, owner_name, phone, address, city, location.coordinates, opening_time, closing_time).
  const vendorRow = {
    id,
    name: displayName,
    owner_name: ownerName,
    email,
    phone,
    store_type: storeType,
    city: 'Pune',
    address: 'Test Address, Pune, Maharashtra',
    location: { type: 'Point', coordinates: [73.856743, 18.52043] },
    weekly_close_on: 'Never Closed',
    opening_time: '09:00 AM',
    closing_time: '09:00 PM',
    is_active: true,
    is_active_on_thru: true,
    grocery_enabled: true,
    role: 'vendor',
    updated_at: now,
    created_at: now,
    image_url: `https://placehold.co/150x100.png?text=${encodeURIComponent(displayName.slice(0, 18))}`,
  };

  const { data, error } = await supabase
    .from('vendors')
    .upsert([vendorRow], { onConflict: 'id' })
    .select('id, name, email, phone, store_type, role')
    .single();

  if (error) throw error;
  return data;
}

async function main() {
  console.log('🔧 Creating test vendor accounts (one per category)...');
  console.log(`   Supabase URL: ${supabaseUrl}`);
  console.log(`   Email domain: ${TEST_EMAIL_DOMAIN}`);
  console.log(`   Password: ${TEST_PASSWORD}`);

  const results = [];

  for (let i = 0; i < SHOP_CATEGORIES.length; i++) {
    const category = SHOP_CATEGORIES[i];
    const email = makeTestEmail(category);
    const phone = makeTestPhone(i);
    const storeType = normalizeStoreType(category);

    const displayName = `Test ${category}`;
    const ownerName = 'Test Owner';

    try {
      const { user, created } = await createOrUpdateAuthUser({ email, password: TEST_PASSWORD });
      if (!user?.id) throw new Error('Supabase did not return a user id');

      const vendor = await upsertVendorProfile({
        id: user.id,
        email,
        phone,
        storeType,
        displayName,
        ownerName,
      });

      results.push({
        category,
        email,
        password: TEST_PASSWORD,
        phone,
        userId: user.id,
        auth: created ? 'created' : 'updated',
        vendorId: vendor.id,
      });

      console.log(`✅ ${category}: ${email} (${created ? 'created' : 'updated'})`);
    } catch (err) {
      console.error(`❌ Failed for category "${category}" (${email}):`, err?.message || err);
      process.exitCode = 1;
    }
  }

  console.log('\n📋 Test vendor logins (use Email + Password on /login):\n');
  results.forEach((r) => {
    console.log(`- ${r.category}`);
    console.log(`  Email:    ${r.email}`);
    console.log(`  Password: ${r.password}`);
    console.log(`  Phone:    ${r.phone}`);
    console.log(`  UID:      ${r.userId}`);
  });

  if (process.exitCode) {
    console.log('\n⚠️ Completed with errors. Fix the failing category above and re-run the script.');
  } else {
    console.log('\n✅ All test vendor accounts are ready.');
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err?.message || err);
  process.exit(1);
});

