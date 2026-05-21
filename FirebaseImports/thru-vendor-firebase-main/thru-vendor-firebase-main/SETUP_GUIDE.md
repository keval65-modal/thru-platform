# Admin Account & Maps Setup Guide

This guide will walk you through setting up the admin account and verifying the maps feature.

## Prerequisites

Before starting, make sure you have:
- ✅ Node.js installed
- ✅ Access to your Supabase project
- ✅ Your Supabase Service Role Key
- ✅ Google Maps API Key (for maps feature)

---

## Step 1: Get Your Supabase Credentials

### 1.1 Get Supabase URL and Service Role Key

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **service_role** key (⚠️ This is secret - keep it safe!)

### 1.2 Get Google Maps API Key (for maps)

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Select your project (or create one)
3. Go to **APIs & Services** → **Credentials**
4. Create an API Key or use an existing one
5. Make sure the **Maps JavaScript API** is enabled
6. Copy your API key

---

## Step 2: Create Environment File

### 2.1 Navigate to the vendor app directory

```bash
cd "F:\Cursor Projects\FirebaseImports\thru-vendor-firebase-main\thru-vendor-firebase-main"
```

### 2.2 Create or edit `.env.local` file

Create a file named `.env.local` in the root directory (same level as `package.json`).

### 2.3 Add your environment variables

Open `.env.local` and add:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Google Maps API Key (for maps feature)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Replace the placeholders with your actual values:**
- `your_supabase_url_here` → Your Supabase Project URL
- `your_anon_key_here` → Your Supabase anon/public key
- `your_service_role_key_here` → Your Supabase service_role key
- `your_google_maps_api_key_here` → Your Google Maps API key

**Example:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://umxuzocajimjkipqxaaz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 3: Set Up Admin Account

### 3.1 Run the admin setup script

From the vendor app directory, run:

```bash
npm run setup:admin
```

Or directly:

```bash
node scripts/setup-admin-user.js
```

### 3.2 What the script does

The script will:
1. ✅ Check if admin user exists in Supabase Auth
2. ✅ Create admin user with email: `keval@thru.app`
3. ✅ Set password: `Let'sGoThru123!`
4. ✅ Create vendor profile with `role='admin'`
5. ✅ Display success message with credentials

### 3.3 Expected output

If successful, you should see:
```
🔧 Setting up admin user...
   Email: keval@thru.app

📋 Step 1: Checking if admin user exists...
✅ Admin user already exists in Auth (ID: xxxxx)
🔐 Updating admin password...
✅ Password updated

📋 Step 3: Checking vendor profile...
✅ Vendor profile already exists
✅ Role is already set to admin

✅ Admin user setup complete!

📝 Login credentials:
   Email: keval@thru.app
   Password: Let'sGoThru123!

⚠️  Please keep these credentials secure!
```

### 3.4 Troubleshooting

**Error: "Missing required environment variables"**
- ✅ Make sure `.env.local` exists
- ✅ Check that all variables are set correctly
- ✅ Restart your terminal/command prompt

**Error: "Supabase connection failed"**
- ✅ Verify your Supabase URL is correct
- ✅ Check that your Service Role Key is valid
- ✅ Ensure your Supabase project is active

**Error: "User already exists"**
- ✅ This is normal if you've run the script before
- ✅ The script will update the password and role

---

## Step 4: Verify Admin Account

### 4.1 Start the development server

```bash
npm run dev
```

The app should start on `http://localhost:9003` (or the port shown)

### 4.2 Log in as admin

1. Navigate to: `http://localhost:9003/login`
2. Enter:
   - **Email**: `keval@thru.app`
   - **Password**: `Let'sGoThru123!`
3. Click **Login**
4. You should be automatically redirected to `/admin`

### 4.3 Verify admin access

You should see:
- ✅ Admin Panel header with "Admin Panel - Vendor Management"
- ✅ List of all vendors
- ✅ "View Shops Map" button in the header
- ✅ Admin navigation options

---

## Step 5: Verify Maps Feature

### 5.1 Access the maps page

1. From the admin panel, click **"View Shops Map"** button
2. Or navigate directly to: `http://localhost:9003/admin/map`

### 5.2 What you should see

- ✅ Google Maps interface
- ✅ Shop markers (green for active, red for inactive)
- ✅ Statistics showing total/active/inactive shops
- ✅ Clickable markers with shop details

### 5.3 Troubleshooting maps

**Map doesn't load / "Google Maps API key not configured"**
- ✅ Check that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `.env.local`
- ✅ Restart the dev server after adding the key
- ✅ Verify the API key is valid in Google Cloud Console

**No markers showing**
- ✅ Check if vendors have valid location coordinates in the database
- ✅ Verify vendors have `location` field populated
- ✅ Check browser console for errors

**"Failed to load Google Maps"**
- ✅ Verify Maps JavaScript API is enabled in Google Cloud Console
- ✅ Check API key restrictions (should allow your domain)
- ✅ Verify billing is enabled for Google Cloud project

---

## Step 6: Test Admin Functions

### 6.1 Test vendor management

1. Go to `/admin`
2. Verify you can see all vendors
3. Try editing a vendor (click edit icon)
4. Verify you can change `isActiveOnThru` status

### 6.2 Test maps

1. Go to `/admin/map`
2. Verify map loads with markers
3. Click on markers to see shop details
4. Check that active/inactive shops show different colors

---

## Quick Reference

### Admin Credentials
- **Email**: `keval@thru.app`
- **Password**: `Let'sGoThru123!`

### Important URLs
- Admin Panel: `http://localhost:9003/admin`
- Maps Page: `http://localhost:9003/admin/map`
- Login: `http://localhost:9003/login`

### Environment Variables Needed
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

### Supabase SQL (run once)
- **KYC**: run `src/lib/supabase/kyc-schema.sql`
- **Vendor Onboarding (Bank + WhatsApp consent + Agreements)**: run `src/lib/supabase/onboarding-schema.sql`

---

## Next Steps

Once everything is working:
1. ✅ Test admin login
2. ✅ Verify maps display correctly
3. ✅ Test vendor management features
4. ✅ **Before git push**: Make sure `.env.local` is in `.gitignore` (it should be by default)

---

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Check the terminal/server logs
3. Verify all environment variables are set correctly
4. Ensure Supabase and Google Maps APIs are properly configured
