# Admin Setup on Vercel

This guide explains how to set up the admin account on your Vercel deployment.

## Prerequisites

✅ Environment variables are already set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## Option 1: Setup via API Endpoint (Recommended)

### Step 1: Deploy to Vercel

Make sure your latest code is deployed to Vercel with the admin setup API route.

### Step 2: Call the Setup Endpoint

Once deployed, call the setup endpoint:

**Using curl:**
```bash
curl -X POST https://your-app.vercel.app/api/admin/setup
```

**Using browser/Postman:**
1. Go to: `https://your-app.vercel.app/api/admin/setup`
2. Use POST method
3. Or use the GET method first to check status: `https://your-app.vercel.app/api/admin/setup`

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "https://your-app.vercel.app/api/admin/setup" -Method POST
```

### Step 3: Verify Setup

Check if setup was successful:
```bash
curl https://your-app.vercel.app/api/admin/setup
```

You should see:
```json
{
  "setup": true,
  "adminUserExists": true,
  "vendorProfileExists": true,
  "isAdmin": true,
  "userId": "..."
}
```

### Step 4: Login

1. Go to: `https://your-app.vercel.app/login`
2. Login with:
   - **Email**: `keval@thru.app`
   - **Password**: `Let'sGoThru123!`
3. You should be redirected to `/admin`

---

## Option 2: Secure Setup (With Token)

If you want to add security, set an optional token in Vercel:

### Step 1: Add Setup Token to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Name**: `ADMIN_SETUP_TOKEN`
   - **Value**: (any secure random string, e.g., `your-secret-token-here`)
3. Redeploy

### Step 2: Call Setup with Token

```bash
curl -X POST https://your-app.vercel.app/api/admin/setup \
  -H "Authorization: Bearer your-secret-token-here"
```

Or in PowerShell:
```powershell
$headers = @{ "Authorization" = "Bearer your-secret-token-here" }
Invoke-RestMethod -Uri "https://your-app.vercel.app/api/admin/setup" -Method POST -Headers $headers
```

---

## Option 3: Setup via Vercel CLI (Local)

If you have Vercel CLI installed:

### Step 1: Install Vercel CLI (if not installed)

```bash
npm i -g vercel
```

### Step 2: Link to your project

```bash
cd "F:\Cursor Projects\FirebaseImports\thru-vendor-firebase-main\thru-vendor-firebase-main"
vercel link
```

### Step 3: Pull environment variables

```bash
vercel env pull .env.local
```

### Step 4: Run setup script locally

```bash
npm run setup:admin
```

This will use the production Supabase database.

---

## Admin Credentials

After setup, use these credentials to login:

- **Email**: `keval@thru.app`
- **Password**: `Let'sGoThru123!`

⚠️ **Important**: Change the password after first login in production!

---

## Troubleshooting

### "Missing Supabase configuration"
- ✅ Check that all environment variables are set in Vercel
- ✅ Redeploy after adding environment variables
- ✅ Verify variable names are correct (case-sensitive)

### "Failed to create auth user"
- ✅ Check Supabase project is active
- ✅ Verify Service Role Key is correct
- ✅ Check Supabase Auth is enabled

### "Failed to create vendor profile"
- ✅ Verify `vendors` table exists in Supabase
- ✅ Check table has `role` column
- ✅ Verify RLS policies allow service role to insert

### Setup endpoint returns 404
- ✅ Make sure code is deployed to Vercel
- ✅ Check the route exists: `/api/admin/setup`
- ✅ Verify deployment was successful

---

## Quick Setup Commands

**Check setup status:**
```bash
curl https://your-app.vercel.app/api/admin/setup
```

**Run setup:**
```bash
curl -X POST https://your-app.vercel.app/api/admin/setup
```

**Run setup with token (if configured):**
```bash
curl -X POST https://your-app.vercel.app/api/admin/setup \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Next Steps

After setup:
1. ✅ Login as admin
2. ✅ Verify admin panel access
3. ✅ Test maps feature at `/admin/map`
4. ✅ Consider changing the admin password
5. ✅ Remove or secure the setup endpoint if needed
