/**
 * Cleanup Script - Remove All Vendors
 * 
 * This script removes all vendors from:
 * 1. Firebase Firestore (vendors collection)
 * 2. Supabase (vendors table)
 * 
 * WARNING: This is a destructive operation and cannot be undone!
 * 
 * Run: node cleanup-vendors.js
 */

import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

console.log('\n⚠️  ===== VENDOR CLEANUP SCRIPT =====\n');
console.log('⚠️  WARNING: This will DELETE ALL vendors from:');
console.log('   1. Firebase Firestore (vendors collection)');
console.log('   2. Supabase (vendors table)');
console.log('   3. Firebase Auth users (optional)\n');

// Ask for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  const answer = await askQuestion('Are you sure you want to delete ALL vendors? (yes/no): ');
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Cleanup cancelled.');
    rl.close();
    process.exit(0);
  }

  console.log('\n🔄 Starting cleanup process...\n');

  // 1. Initialize Firebase Admin
  console.log('🔥 Step 1: Connecting to Firebase...\n');
  
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Firebase credentials missing!');
    rl.close();
    process.exit(1);
  }

  // Normalize private key
  privateKey = privateKey.trim();
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  try {
    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    }, 'cleanup-app');

    const db = getFirestore(app);
    console.log('✅ Connected to Firebase Firestore\n');

    // Get all vendors from Firestore
    const vendorsSnapshot = await db.collection('vendors').get();
    console.log(`📊 Found ${vendorsSnapshot.size} vendors in Firestore\n`);

    if (vendorsSnapshot.size > 0) {
      console.log('Vendors to be deleted:');
      vendorsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. ${data.shopName || 'Unknown'} (${data.email || 'no-email'}) - ID: ${doc.id}`);
      });
      console.log('');

      const confirmDelete = await askQuestion(`Delete these ${vendorsSnapshot.size} vendors from Firestore? (yes/no): `);
      
      if (confirmDelete.toLowerCase() === 'yes') {
        // Delete from Firestore
        const batch = db.batch();
        vendorsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ Deleted ${vendorsSnapshot.size} vendors from Firestore\n`);
      } else {
        console.log('⏭️  Skipped Firestore deletion\n');
      }
    } else {
      console.log('ℹ️  No vendors found in Firestore\n');
    }

  } catch (error) {
    console.error('❌ Firebase Error:', error.message);
  }

  // 2. Initialize Supabase
  console.log('🔵 Step 2: Connecting to Supabase...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase credentials missing!');
    rl.close();
    process.exit(1);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Connected to Supabase\n');

    // Get all vendors from Supabase
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('id, name, email');

    if (error) {
      throw error;
    }

    console.log(`📊 Found ${vendors.length} vendors in Supabase\n`);

    if (vendors.length > 0) {
      console.log('Vendors to be deleted:');
      vendors.forEach((vendor, index) => {
        console.log(`   ${index + 1}. ${vendor.name} (${vendor.email}) - ID: ${vendor.id}`);
      });
      console.log('');

      const confirmDelete = await askQuestion(`Delete these ${vendors.length} vendors from Supabase? (yes/no): `);
      
      if (confirmDelete.toLowerCase() === 'yes') {
        // Delete from Supabase
        const vendorIds = vendors.map(v => v.id);
        const { error: deleteError } = await supabase
          .from('vendors')
          .delete()
          .in('id', vendorIds);

        if (deleteError) {
          throw deleteError;
        }

        console.log(`✅ Deleted ${vendors.length} vendors from Supabase\n`);
      } else {
        console.log('⏭️  Skipped Supabase deletion\n');
      }
    } else {
      console.log('ℹ️  No vendors found in Supabase\n');
    }

  } catch (error) {
    console.error('❌ Supabase Error:', error.message);
  }

  console.log('✅ ===== CLEANUP COMPLETE =====\n');
  console.log('📝 Next Steps:');
  console.log('   1. Test signup at: http://localhost:3000/signup');
  console.log('   2. Or production: https://merchant.kiptech.in/signup\n');

  rl.close();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  rl.close();
  process.exit(1);
});











