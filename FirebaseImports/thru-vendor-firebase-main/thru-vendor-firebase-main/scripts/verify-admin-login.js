#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.ADMIN_EMAIL || 'keval@thru.app';
const password = process.env.ADMIN_PASSWORD || "Let'sGoThru123!";

const svc = createClient(url, serviceKey);
const anon = createClient(url, anonKey);

(async () => {
  const { data: auth, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Auth failed:', error.message);
    process.exit(1);
  }
  const uid = auth.user.id;
  console.log('Auth OK, uid:', uid);

  const { data: row } = await svc.from('vendors').select('id, role, email, name').eq('id', uid).maybeSingle();
  if (!row) {
    console.error('Vendor row missing for auth uid — run: node scripts/setup-admin-user.js');
    process.exit(1);
  }
  console.log('Vendor row:', row);
  if (row.role !== 'admin') {
    console.error('Vendor role is not admin — run setup-admin-user.js');
    process.exit(1);
  }
  console.log('Admin login prerequisites OK');
})();
