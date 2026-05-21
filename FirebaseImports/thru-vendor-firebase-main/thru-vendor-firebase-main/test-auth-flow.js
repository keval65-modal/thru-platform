/**
 * Test Script for Vendor App Authentication
 * 
 * This script tests:
 * 1. Environment variables are loaded
 * 2. Firebase Admin SDK initializes correctly
 * 3. Supabase connection works
 * 
 * Run: node test-auth-flow.js
 */

import dotenv from 'dotenv';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

// Load both .env and .env.local
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

console.log('\n🔍 ===== VENDOR APP AUTH DIAGNOSTIC =====\n');

// 1. Check Environment Variables
console.log('📝 Step 1: Checking Environment Variables...\n');

const envChecks = {
  'FIREBASE_ADMIN_PROJECT_ID': process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  'FIREBASE_ADMIN_CLIENT_EMAIL': process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL,
  'FIREBASE_ADMIN_PRIVATE_KEY': process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY,
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'NEXT_PUBLIC_FIREBASE_API_KEY': process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID': process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  'NEXT_PUBLIC_FIREBASE_APP_ID': process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let allPresent = true;
for (const [key, value] of Object.entries(envChecks)) {
  const present = !!value;
  console.log(`${present ? '✅' : '❌'} ${key}: ${present ? 'PRESENT' : 'MISSING'}`);
  if (!present) allPresent = false;
}

if (!allPresent) {
  console.log('\n❌ CRITICAL: Some environment variables are missing!');
  console.log('📝 Copy .env.local.example to .env.local and fill in the values.');
  process.exit(1);
}

console.log('\n✅ All environment variables present!\n');

// 2. Test Firebase Admin SDK Initialization
console.log('🔥 Step 2: Testing Firebase Admin SDK...\n');

try {
  const projectId = envChecks.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = envChecks.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = envChecks.FIREBASE_ADMIN_PRIVATE_KEY;

  // Normalize private key
  privateKey = privateKey.trim();
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  console.log(`   Project ID: ${projectId}`);
  console.log(`   Client Email: ${clientEmail.substring(0, 30)}...`);
  console.log(`   Private Key: ${privateKey.substring(0, 50)}...`);

  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  }, 'test-vendor-app');

  console.log('\n✅ Firebase Admin App initialized successfully!');

  const auth = getAuth(app);
  console.log('✅ Firebase Auth service obtained');

  const db = getFirestore(app);
  console.log('✅ Firestore service obtained');

  // Test Firestore connection
  const testDoc = await db.collection('vendors').limit(1).get();
  console.log(`✅ Firestore connection successful (${testDoc.size} vendors found)`);

} catch (error) {
  console.error('\n❌ Firebase Admin SDK Error:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
}

// 3. Test Supabase Connection
console.log('\n🔵 Step 3: Testing Supabase Connection...\n');

try {
  const supabase = createClient(
    envChecks.NEXT_PUBLIC_SUPABASE_URL,
    envChecks.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log(`   Supabase URL: ${envChecks.NEXT_PUBLIC_SUPABASE_URL}`);

  // Test query
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, email')
    .limit(5);

  if (error) {
    throw error;
  }

  console.log(`\n✅ Supabase connection successful!`);
  console.log(`   Found ${data.length} vendors in database`);
  
  if (data.length > 0) {
    console.log('\n   Sample vendors:');
    data.forEach(v => {
      console.log(`   - ${v.name} (${v.email})`);
    });
  }

} catch (error) {
  console.error('\n❌ Supabase Connection Error:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
}

console.log('\n✅ ===== ALL TESTS PASSED! =====\n');
console.log('🎯 Next Steps:');
console.log('   1. Run: npm run dev');
console.log('   2. Go to: http://localhost:3000/signup');
console.log('   3. Try signing up with test data');
console.log('   4. Watch the terminal for error messages\n');

process.exit(0);

