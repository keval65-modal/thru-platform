#!/usr/bin/env node

/**
 * Script to create the admin user in Supabase
 * 
 * This creates:
 * 1. A Supabase Auth user with email: keval@thru.app
 * 2. A vendor profile in the vendors table with role='admin'
 * 
 * Usage: node scripts/setup-admin-user.js
 * 
 * Requires environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

// Load environment variables from .env.local
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

const ADMIN_EMAIL = 'keval@thru.app';
const ADMIN_PASSWORD = "Let'sGoThru123!";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdminUser() {
  try {
    console.log('🔧 Setting up admin user...');
    console.log(`   Email: ${ADMIN_EMAIL}`);

    // Step 1: Check if user already exists
    console.log('\n📋 Step 1: Checking if admin user exists...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      throw listError;
    }

    let adminUser = existingUsers.users.find(u => u.email === ADMIN_EMAIL);

    if (adminUser) {
      console.log(`✅ Admin user already exists in Auth (ID: ${adminUser.id})`);
      
      // Update password if needed
      console.log('🔐 Updating admin password...');
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        { password: ADMIN_PASSWORD }
      );
      
      if (updateError) {
        console.error('❌ Error updating password:', updateError.message);
        throw updateError;
      }
      console.log('✅ Password updated');
    } else {
      // Step 2: Create Supabase Auth user
      console.log('\n📋 Step 2: Creating Supabase Auth user...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });

      if (authError) {
        console.error('❌ Error creating auth user:', authError.message);
        throw authError;
      }

      adminUser = authData.user;
      console.log(`✅ Admin user created in Auth (ID: ${adminUser.id})`);
    }

    // Step 3: Check if vendor profile exists
    console.log('\n📋 Step 3: Checking vendor profile...');
    const { data: existingVendor, error: vendorCheckError } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', adminUser.id)
      .maybeSingle();

    if (vendorCheckError && vendorCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking vendor profile:', vendorCheckError.message);
      throw vendorCheckError;
    }

    if (existingVendor) {
      console.log('✅ Vendor profile already exists');
      
      // Update role to admin if not already set
      if (existingVendor.role !== 'admin') {
        console.log('🔧 Updating role to admin...');
        const { error: updateRoleError } = await supabase
          .from('vendors')
          .update({ role: 'admin' })
          .eq('id', adminUser.id);

        if (updateRoleError) {
          console.error('❌ Error updating role:', updateRoleError.message);
          throw updateRoleError;
        }
        console.log('✅ Role updated to admin');
      } else {
        console.log('✅ Role is already set to admin');
      }
    } else {
      // Step 4: Create vendor profile with admin role
      console.log('\n📋 Step 4: Creating vendor profile with admin role...');
      const now = new Date().toISOString();
      const vendorData = {
        id: adminUser.id,
        name: 'Thru Platform Admin',
        owner_name: 'Admin',
        email: ADMIN_EMAIL,
        phone: '+910000000000',
        store_type: 'Other',
        city: 'N/A',
        address: 'N/A',
        location: { type: 'Point', coordinates: [0, 0] },
        weekly_close_on: 'Never Closed',
        opening_time: '12:00 AM (Midnight)',
        closing_time: '12:00 AM (Midnight)',
        is_active_on_thru: true,
        role: 'admin',
        created_at: now,
        updated_at: now,
      };

      const { data: vendorDataResult, error: vendorError } = await supabase
        .from('vendors')
        .insert([vendorData])
        .select()
        .single();

      if (vendorError) {
        console.error('❌ Error creating vendor profile:', vendorError.message);
        throw vendorError;
      }

      console.log('✅ Vendor profile created with admin role');
    }

    console.log('\n✅ Admin user setup complete!');
    console.log('\n📝 Login credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️  Please keep these credentials secure!');

  } catch (error) {
    console.error('\n❌ Failed to setup admin user:', error.message || error);
    process.exit(1);
  }
}

setupAdminUser();
