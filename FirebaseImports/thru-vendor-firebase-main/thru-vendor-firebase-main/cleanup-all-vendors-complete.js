/**
 * Complete Vendor Cleanup Script
 * 
 * This script removes:
 * 1. Firebase Auth Users (email/password accounts)
 * 2. Firebase Firestore vendor documents
 * 3. Supabase vendor records
 * 
 * Run: node cleanup-all-vendors-complete.js
 */

import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

console.log('\n🔄 ===== COMPLETE VENDOR CLEANUP (Auth + Firestore + Supabase) =====\n');

async function main() {
  let authCount = 0;
  let firestoreCount = 0;
  let supabaseCount = 0;
  const deletedAuthUsers = [];

  // Initialize Firebase Admin
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Firebase credentials missing!');
    process.exit(1);
  }

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
  }, 'cleanup-complete');

  const auth = getAuth(app);
  const db = getFirestore(app);

  // 1. Get all vendor emails from Firestore first (to know which Auth users to delete)
  console.log('🔥 Step 1: Finding all vendors in Firestore...\n');
  
  try {
    const vendorsSnapshot = await db.collection('vendors').get();
    firestoreCount = vendorsSnapshot.size;

    console.log(`   Found ${firestoreCount} vendors in Firestore`);

    const vendorEmails = [];
    const vendorUIDs = [];

    if (firestoreCount > 0) {
      vendorsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const email = data.email || 'no-email';
        const uid = doc.id;
        
        console.log(`   ${index + 1}. ${data.shopName || 'Unknown'} (${email}) - UID: ${uid}`);
        
        if (email !== 'no-email') {
          vendorEmails.push(email);
        }
        vendorUIDs.push(uid);
      });

      // Delete Firestore documents
      const batch = db.batch();
      vendorsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`   ✅ Deleted ${firestoreCount} vendor documents from Firestore\n`);

      // 2. Delete Firebase Auth users by UID
      console.log('🔐 Step 2: Deleting Firebase Auth users...\n');
      
      for (const uid of vendorUIDs) {
        try {
          const userRecord = await auth.getUser(uid);
          await auth.deleteUser(uid);
          deletedAuthUsers.push(userRecord.email || uid);
          console.log(`   ✅ Deleted Auth user: ${userRecord.email || uid}`);
          authCount++;
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            console.log(`   ⏭️  Auth user not found for UID: ${uid}`);
          } else {
            console.log(`   ⚠️  Could not delete Auth user ${uid}: ${error.message}`);
          }
        }
      }
      console.log(`   ✅ Deleted ${authCount} Auth users\n`);
    } else {
      console.log('   ℹ️  No vendors found in Firestore\n');
    }
  } catch (error) {
    console.error('   ❌ Firebase Error:', error.message, '\n');
  }

  // 3. Clean Supabase
  console.log('🔵 Step 3: Cleaning Supabase...\n');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Supabase credentials missing!');
    } else {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data: vendors, error: fetchError } = await supabase
        .from('vendors')
        .select('id, name, email');

      if (fetchError) {
        throw fetchError;
      }

      supabaseCount = vendors.length;
      console.log(`   Found ${supabaseCount} vendors in Supabase`);

      if (supabaseCount > 0) {
        vendors.forEach((vendor, index) => {
          console.log(`   ${index + 1}. ${vendor.name} (${vendor.email})`);
        });

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
  console.log('✅ ===== COMPLETE CLEANUP FINISHED =====\n');
  console.log('📊 Summary:');
  console.log(`   - Firebase Auth: ${authCount} users deleted`);
  console.log(`   - Firestore: ${firestoreCount} vendor documents deleted`);
  console.log(`   - Supabase: ${supabaseCount} vendor records deleted\n`);
  
  if (deletedAuthUsers.length > 0) {
    console.log('📧 Deleted Auth users:');
    deletedAuthUsers.forEach((email, index) => {
      console.log(`   ${index + 1}. ${email}`);
    });
    console.log('');
  }

  console.log('📝 Next Steps:');
  console.log('   1. All vendor accounts completely removed');
  console.log('   2. You can now sign up with ANY email address');
  console.log('   3. Test at: http://localhost:3000/signup');
  console.log('   4. Or production: https://merchant.kiptech.in/signup\n');

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});











