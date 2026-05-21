# 🔥 Firebase Setup for Vendor App

## ❌ **Problem:**
Vendor signup is failing with Firebase errors:
```
Failed to load resource: the server responded with a status of 400
@firebase/firestore: Firestore (11.10.0): WebChannelConnection RPC 'Listen'
```

**Root Cause:** Firebase environment variables are missing from Vercel!

---

## ✅ **Solution: Add Firebase Credentials to Vercel**

### **Step 1: Get Firebase Credentials from User App**

Both apps should share the same Firebase project. Get the credentials from your user app's Vercel settings:

1. **Go to User App Vercel Project:**
   - https://vercel.com/keval65-modals-projects/thru-user-app29082025-master/settings/environment-variables

2. **Copy these values:**
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (optional)
   ```

---

### **Step 2: Add to Vendor App Vercel Project**

1. **Go to Vendor App Settings:**
   - https://vercel.com/keval65-modals-projects/thru-vendor-dashboard/settings/environment-variables

2. **Add ALL Firebase variables** (copy from user app)

3. **Also add Supabase variables** (for menu management):
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://umxuzocajimjkipqxaaz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVteHV6b2NhamltamtpcHF4YWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczNDAwMzIsImV4cCI6MjA1MjkxNjAzMn0.wr0FmNe2_cXEKZrgA-Mzv2WIbz9wTSMhwKVzfLZTFEo
   ```

---

### **Step 3: Redeploy Vendor App**

After adding env vars, redeploy from your local directory:

```powershell
cd "F:\Cursor Projects\FirebaseImports\thru-vendor-firebase-main\thru-vendor-firebase-main"
vercel --prod
```

---

## 🧪 **Test:**

1. Go to: https://merchant.kiptech.in/signup
2. Fill in vendor details
3. Submit registration
4. ✅ Should work without Firebase errors!

---

## 📋 **Complete Environment Variables Needed:**

```bash
# Firebase (for Auth/Orders) - COPY FROM USER APP
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Supabase (for Menu/Vendor Data)
NEXT_PUBLIC_SUPABASE_URL=https://umxuzocajimjkipqxaaz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVteHV6b2NhamltamtpcHF4YWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczNDAwMzIsImV4cCI6MjA1MjkxNjAzMn0.wr0FmNe2_cXEKZrgA-Mzv2WIbz9wTSMhwKVzfLZTFEo
```

---

## 🤔 **Why Both Firebase & Supabase?**

- **Firebase:** Used for vendor authentication, existing orders (legacy)
- **Supabase:** Used for vendor profiles, menu items (new features)
- This hybrid approach maintains backward compatibility while adding new features














