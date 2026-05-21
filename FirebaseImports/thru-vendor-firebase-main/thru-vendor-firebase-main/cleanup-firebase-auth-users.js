/**
 * Firebase Auth Users Cleanup
 * 
 * Lists and deletes ALL Firebase Auth users
 * (This is the user accounts created during signup)
 * 
 * Run: node cleanup-firebase-auth-users.js
 */

import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

console.log('\n🔐 ===== FIREBASE AUTH USERS CLEANUP =====\n');

async function main() {
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
  }, 'cleanup-auth-only');

  const auth = getAuth(app);

  console.log('📋 Listing all Firebase Auth users...\n');

  try {
    // List all users (paginated)
    let allUsers = [];
    let nextPageToken;
    
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      allUsers = allUsers.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`   Found ${allUsers.length} Auth users\n`);

    if (allUsers.length === 0) {
      console.log('✅ No Auth users to delete!\n');
      process.exit(0);
    }

    // Display all users
    console.log('👤 Users to be deleted:\n');
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email || 'No email'}`);
      console.log(`      UID: ${user.uid}`);
      console.log(`      Created: ${new Date(user.metadata.creationTime).toLocaleString()}`);
      console.log(`      Last Sign In: ${user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'Never'}`);
      console.log('');
    });

    // Delete all users
    console.log('🗑️  Deleting all Auth users...\n');
    
    let deletedCount = 0;
    let failedCount = 0;

    for (const user of allUsers) {
      try {
        await auth.deleteUser(user.uid);
        console.log(`   ✅ Deleted: ${user.email || user.uid}`);
        deletedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to delete ${user.email || user.uid}: ${error.message}`);
        failedCount++;
      }
    }

    console.log('\n✅ ===== CLEANUP COMPLETE =====\n');
    console.log('📊 Summary:');
    console.log(`   - Total users found: ${allUsers.length}`);
    console.log(`   - Successfully deleted: ${deletedCount}`);
    console.log(`   - Failed: ${failedCount}\n`);
    console.log('📝 You can now sign up with ANY email address!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});











