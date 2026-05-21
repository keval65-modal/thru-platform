import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'keval@thru.app';
const ADMIN_PASSWORD = "Let'sGoThru123!";

// Optional: Add a secret token for security (set in Vercel env vars as ADMIN_SETUP_TOKEN)
// If not set, anyone with the URL can run this (only once though)
const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN;

export async function POST(request: NextRequest) {
  try {
    // Optional security check
    if (SETUP_TOKEN) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${SETUP_TOKEN}`) {
        return NextResponse.json(
          { error: 'Unauthorized. Provide Authorization: Bearer <ADMIN_SETUP_TOKEN>' },
          { status: 401 }
        );
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration. Check environment variables.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Setting up admin user...');
    console.log(`   Email: ${ADMIN_EMAIL}`);

    // Step 1: Check if user already exists
    console.log('\n📋 Step 1: Checking if admin user exists...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      return NextResponse.json(
        { error: `Failed to list users: ${listError.message}` },
        { status: 500 }
      );
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
        return NextResponse.json(
          { error: `Failed to update password: ${updateError.message}` },
          { status: 500 }
        );
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
        return NextResponse.json(
          { error: `Failed to create auth user: ${authError.message}` },
          { status: 500 }
        );
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
      return NextResponse.json(
        { error: `Failed to check vendor profile: ${vendorCheckError.message}` },
        { status: 500 }
      );
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
          return NextResponse.json(
            { error: `Failed to update role: ${updateRoleError.message}` },
            { status: 500 }
          );
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
        return NextResponse.json(
          { error: `Failed to create vendor profile: ${vendorError.message}` },
          { status: 500 }
        );
      }

      console.log('✅ Vendor profile created with admin role');
    }

    console.log('\n✅ Admin user setup complete!');

    return NextResponse.json({
      success: true,
      message: 'Admin user setup complete!',
      credentials: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
      userId: adminUser.id,
      warning: 'Please keep these credentials secure!',
    });

  } catch (error: any) {
    console.error('\n❌ Failed to setup admin user:', error.message || error);
    return NextResponse.json(
      { error: `Setup failed: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// GET endpoint to check setup status
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if admin user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminUser = existingUsers?.users.find(u => u.email === ADMIN_EMAIL);

    if (!adminUser) {
      return NextResponse.json({
        setup: false,
        message: 'Admin user not found. Run POST to setup.',
      });
    }

    // Check if vendor profile exists
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, role')
      .eq('id', adminUser.id)
      .maybeSingle();

    return NextResponse.json({
      setup: true,
      adminUserExists: true,
      vendorProfileExists: !!vendor,
      isAdmin: vendor?.role === 'admin',
      userId: adminUser.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
