# ✅ Fix Vendor Signup - Quick Checklist

## 🔴 **Current Status: BROKEN**
- Error: `Failed to load resource: 400`
- Cause: Firebase credentials missing from Vercel

---

## 📝 **Fix Steps:**

### ☐ **1. Copy Firebase Credentials from User App**

**Go to:** https://vercel.com/keval65-modals-projects/thru-user-app29082025-master/settings/environment-variables

**Copy these 7 values:**
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

---

### ☐ **2. Add to Vendor App Vercel**

**Go to:** https://vercel.com/keval65-modals-projects/thru-vendor-dashboard/settings/environment-variables

**Click "Add New" for EACH variable:**

1. Click **"Add New"**
2. **Name:** `NEXT_PUBLIC_FIREBASE_API_KEY`
3. **Value:** (paste from user app)
4. **Environment:** Check all (Production, Preview, Development)
5. Click **"Save"**
6. **Repeat for all 7 Firebase variables!**

---

### ☐ **3. Add Supabase Credentials**

While you're there, also add these 2:

**Name:** `NEXT_PUBLIC_SUPABASE_URL`  
**Value:** `https://umxuzocajimjkipqxaaz.supabase.co`

**Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVteHV6b2NhamltamtpcHF4YWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczNDAwMzIsImV4cCI6MjA1MjkxNjAzMn0.wr0FmNe2_cXEKZrgA-Mzv2WIbz9wTSMhwKVzfLZTFEo`

---

### ☐ **4. Redeploy**

**From PowerShell:**
```powershell
cd "F:\Cursor Projects\FirebaseImports\thru-vendor-firebase-main\thru-vendor-firebase-main"
vercel --prod
```

Wait for deployment to complete (~30 seconds)

---

### ☐ **5. Test Signup**

1. Go to: https://merchant.kiptech.in/signup
2. Fill in form (use test data)
3. Click "Register"
4. ✅ Should work without errors!

---

## 🎯 **Quick Reference - What to Copy Where:**

```
FROM: User App Vercel Settings
  ↓
COPY: 7 Firebase env vars
  ↓
TO: Vendor App Vercel Settings
  ↓
REDEPLOY: vendor app
  ↓
TEST: signup at merchant.kiptech.in/signup
```

---

## 📸 **Expected Result:**

**Before:** 
- Console errors
- 400 status
- Firebase connection fails

**After:**
- No console errors
- Registration succeeds
- Vendor saved to database

---

## ⚠️ **Important Notes:**

1. **Both apps share same Firebase project** (for auth/orders)
2. **Only vendor app needs Supabase** (for menu/profiles)
3. **Must redeploy after adding env vars**
4. **Check all 3 environments** (Production, Preview, Development) when adding vars

---

## 🆘 **Still Not Working?**

Double-check:
- [ ] All 7 Firebase vars are added
- [ ] No typos in variable names (copy-paste exactly)
- [ ] Values don't have extra spaces
- [ ] You redeployed AFTER adding vars
- [ ] Check browser console for new errors














