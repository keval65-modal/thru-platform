# 🚀 Complete Supabase Migration Guide

## Overview
We're migrating the vendor app from Firebase to Supabase completely.

---

## ✅ What's Already Done

### 1. Vendors Table (Already exists)
The `vendors` table is already set up in Supabase with all necessary columns.

### 2. Code Migration
- ✅ Created `src/lib/supabase-auth.ts` - All Supabase auth functions
- ✅ Created `src/app/signup/actions-supabase.ts` - New Supabase-based signup
- ✅ Removed dependency on Firebase Auth, Firestore, and Storage

---

## 🔧 Supabase Setup Required

### Step 1: Enable Auth Email Provider
1. Go to: https://supabase.com/dashboard
2. Select your project: **wrrdzzvotznletjclzcp**
3. Go to **Authentication** → **Providers**
4. Enable **Email** provider
5. **Disable email confirmation** for testing (you can enable it later)
   - Go to **Authentication** → **Settings**
   - Turn OFF "Enable email confirmations"

### Step 2: Create Storage Bucket for Vendor Images
Run this SQL in Supabase SQL Editor:

```sql
-- Create storage bucket for vendor images
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-images', 'vendor-images', true);

-- Allow public access to read images
CREATE POLICY "Public Access for Vendor Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'vendor-images');

-- Allow authenticated users to upload their own images
CREATE POLICY "Vendors can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vendor-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow vendors to update their own images
CREATE POLICY "Vendors can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'vendor-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow vendors to delete their own images
CREATE POLICY "Vendors can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'vendor-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 3: Update Vendors Table RLS Policies
Make sure the vendors table allows signup:

```sql
-- Drop existing policies if any
DROP POLICY IF EXISTS "Vendors can manage their own data" ON vendors;
DROP POLICY IF EXISTS "Public can view active vendors" ON vendors;

-- Allow vendors to insert their own profile during signup
CREATE POLICY "Vendors can insert their own profile"
ON vendors FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow vendors to update their own profile
CREATE POLICY "Vendors can update their own profile"
ON vendors FOR UPDATE
USING (auth.uid() = id);

-- Allow vendors to read their own profile
CREATE POLICY "Vendors can read their own profile"
ON vendors FOR SELECT
USING (auth.uid() = id);

-- Allow public to view active vendors (for user app)
CREATE POLICY "Public can view active vendors"
ON vendors FOR SELECT
USING (is_active = true AND is_active_on_thru = true);
```

---

## 📝 Update Signup Form

Update `src/app/signup/page.tsx` to use the new action:

```typescript
// Change this line:
import { handleSignup } from './actions';

// To this:
import { handleSignupSupabase as handleSignup } from './actions-supabase';
```

Or update `src/components/auth/SignupForm.tsx` if that's where the action is called.

---

## 🧪 Testing

### Test Signup:
1. Go to: http://localhost:3000/signup
2. Fill in the form
3. Click "Register"

### Expected Results:
```
🚀 ===== SUPABASE SIGNUP ACTION STARTED =====
📝 Environment Check: ✅ All PRESENT
📋 Validating form data...
✅ Form validation passed
📧 Step 1: Creating Supabase Auth user...
✅ Supabase Auth user created: [UUID]
📸 Step 2: Uploading shop image...
✅ Image uploaded: [URL]
💾 Step 3: Creating vendor profile...
✅ Vendor profile created successfully!
🍪 Step 4: Creating session cookie...
✅ Session cookie set
🎉 ===== SIGNUP COMPLETE - REDIRECTING TO DASHBOARD =====
```

---

## 🗑️ Cleanup Firebase (Optional)

Once Supabase signup is working, you can:

1. **Remove Firebase dependencies:**
```bash
npm uninstall firebase firebase-admin
```

2. **Delete Firebase files:**
- `src/lib/firebase-admin.ts`
- `src/lib/firebase.ts`
- `src/app/signup/actions.ts` (old Firebase version)

3. **Remove Firebase env vars from Vercel:**
- All `FIREBASE_*` variables

---

## 📊 Benefits of Supabase Migration

### Before (Firebase + Supabase):
- ❌ Two databases to manage
- ❌ Complex syncing logic
- ❌ More environment variables
- ❌ Higher complexity
- ❌ More points of failure

### After (Supabase Only):
- ✅ Single database
- ✅ No syncing needed
- ✅ Fewer environment variables
- ✅ Simpler architecture
- ✅ Easier to maintain
- ✅ PostgreSQL power (better queries, joins, etc.)
- ✅ Real-time subscriptions built-in
- ✅ Better developer experience

---

## 🚀 Next Steps

1. **Run the SQL scripts** in Supabase SQL Editor
2. **Update the signup form** to use new action
3. **Test signup** locally
4. **Test login** (will need to update login action too)
5. **Deploy to production**
6. **Remove Firebase completely**

---

**Ready to proceed?** Let me know and I'll help you update the signup form component!











