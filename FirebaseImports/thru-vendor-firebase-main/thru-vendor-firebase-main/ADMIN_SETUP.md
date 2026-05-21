# Admin User Setup

This document explains how to set up the admin user for the Thru vendor platform.

## Admin Credentials

- **Email**: `keval@thru.app`
- **Password**: `Let'sGoThru123!`

## Setup Instructions

### Prerequisites

Ensure you have the following environment variables set in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Running the Setup Script

1. Navigate to the project root directory:
   ```bash
   cd thru-vendor-firebase-main
   ```

2. Run the setup script:
   ```bash
   node scripts/setup-admin-user.js
   ```

The script will:
- Create a Supabase Auth user with email `keval@thru.app`
- Set the password to `Let'sGoThru123!`
- Create a vendor profile in the `vendors` table with `role='admin'`
- If the user already exists, it will update the password and ensure the role is set to `admin`

### Manual Setup (Alternative)

If you prefer to set up the admin user manually:

1. **Create Supabase Auth User**:
   - Go to Supabase Dashboard → Authentication → Users
   - Click "Add User" → "Create new user"
   - Email: `keval@thru.app`
   - Password: `Let'sGoThru123!`
   - Confirm email: ✅ (checked)

2. **Create Vendor Profile**:
   - Go to Supabase Dashboard → Table Editor → `vendors`
   - Insert a new row with:
     - `id`: (Use the UUID from the auth user created above)
     - `name`: `Thru Platform Admin`
     - `owner_name`: `Admin`
     - `email`: `keval@thru.app`
     - `phone`: `+910000000000`
     - `store_type`: `Other`
     - `city`: `N/A`
     - `address`: `N/A`
     - `location`: `{"type": "Point", "coordinates": [0, 0]}`
     - `weekly_close_on`: `Never Closed`
     - `opening_time`: `12:00 AM (Midnight)`
     - `closing_time`: `12:00 AM (Midnight)`
     - `is_active_on_thru`: `true`
     - `role`: `admin` ⚠️ **IMPORTANT: Must be 'admin'**
     - `created_at`: (current timestamp)
     - `updated_at`: (current timestamp)

## Login

After setup, you can log in to the admin panel:

1. Navigate to the login page: `/login`
2. Enter email: `keval@thru.app`
3. Enter password: `Let'sGoThru123!`
4. Click "Login"
5. You will be automatically redirected to `/admin`

## Security Notes

⚠️ **Important Security Considerations**:

- Change the default password in production
- Store credentials securely (use environment variables or a password manager)
- Limit access to admin credentials
- Consider implementing 2FA for admin accounts in the future

## Troubleshooting

### "Access Denied" Error

If you see an "Access Denied" message:
- Verify that the `role` field in the vendors table is set to `'admin'` (not `'vendor'`)
- Check that the vendor profile exists and is linked to the correct auth user ID

### "Vendor profile not found" Error

- Ensure the vendor profile was created in the `vendors` table
- Verify that the `id` in the vendors table matches the auth user ID

### Password Reset

To reset the admin password, run the setup script again - it will update the existing password.
