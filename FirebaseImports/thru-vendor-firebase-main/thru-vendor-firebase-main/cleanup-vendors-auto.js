/**
 * Automatic Vendor Cleanup Script
 * 
 * This script automatically removes all vendors from Firebase and Supabase
 * WITHOUT confirmation prompts (use with caution!)
 * 
 * Run: node cleanup-vendors-auto.js
 */

import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

console.log('\n🔄 ===== AUTOMATIC VENDOR CLEANUP =====\n');

async function main() {
  let firestoreCount = 0;
  let supabaseCount = 0;

  // 1. Clean Firebase Firestore
  console.log('🔥 Step 1: Cleaning Firebase Firestore...\n');
  
  try {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Firebase credentials missing!');
    } else {
      // Normalize private key
      privateKey = privateKey.trim();
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      const app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      }, 'cleanup-app-auto');

      const db = getFirestore(app);
      const vendorsSnapshot = await db.collection('vendors').get();
      firestoreCount = vendorsSnapshot.size;

      console.log(`   Found ${firestoreCount} vendors in Firestore`);

      if (firestoreCount > 0) {
        // List vendors
        vendorsSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`   ${index + 1}. ${data.shopName || 'Unknown'} (${data.email || 'no-email'})`);
        });

        // Delete all
        const batch = db.batch();
        vendorsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`   ✅ Deleted ${firestoreCount} vendors from Firestore\n`);
      } else {
        console.log('   ℹ️  No vendors found in Firestore\n');
      }
    }
  } catch (error) {
    console.error('   ❌ Firebase Error:', error.message, '\n');
  }

  // 2. Clean Supabase
  console.log('🔵 Step 2: Cleaning Supabase...\n');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Supabase credentials missing!');
    } else {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Get all vendors
      const { data: vendors, error: fetchError } = await supabase
        .from('vendors')
        .select('id, name, email');

      if (fetchError) {
        throw fetchError;
      }

      supabaseCount = vendors.length;
      console.log(`   Found ${supabaseCount} vendors in Supabase`);

      if (supabaseCount > 0) {
        // List vendors
        vendors.forEach((vendor, index) => {
          console.log(`   ${index + 1}. ${vendor.name} (${vendor.email})`);
        });

        // Delete all
        const vendorIds = vendors.map(v => v.id);
        const { error: deleteError } = await supabase
          .from('vendors')
          .delete()
          .in('id', vendorIds);

        if (deleteError) {
          throw deleteError;
        }

        console.log(`   ✅ Deleted ${supabaseCount} vendors from Supabase\n`);
      } else {
        console.log('   ℹ️  No vendors found in Supabase\n');
      }
    }
  } catch (error) {
    console.error('   ❌ Supabase Error:', error.message, '\n');
  }

  // Summary
  console.log('✅ ===== CLEANUP COMPLETE =====\n');
  console.log('📊 Summary:');
  console.log(`   - Firestore: ${firestoreCount} vendors deleted`);
  console.log(`   - Supabase: ${supabaseCount} vendors deleted\n`);
  console.log('📝 Next Steps:');
  console.log('   1. Test signup at: http://localhost:3000/signup');
  console.log('   2. Or production: https://merchant.kiptech.in/signup\n');

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});











