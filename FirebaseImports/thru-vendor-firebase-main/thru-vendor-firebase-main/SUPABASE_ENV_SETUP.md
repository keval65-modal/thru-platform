# Supabase Environment Setup for Vendor App

## ⚙️ **Add these to your `.env.local` file:**

```env
# Supabase Configuration (for Menu Management)
NEXT_PUBLIC_SUPABASE_URL=https://umxuzocajimjkipqxaaz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVteHV6b2NhamltamtpcHF4YWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczNDAwMzIsImV4cCI6MjA1MjkxNjAzMn0.wr0FmNe2_cXEKZrgA-Mzv2WIbz9wTSMhwKVzfLZTFEo
```

## 📝 **Steps:**

1. Open `.env.local` in the vendor app root
2. Add the lines above
3. Keep your existing Firebase environment variables
4. Restart the dev server: `npm run dev`

## ✅ **What This Enables:**

- ✅ Menu management page at `/menu`
- ✅ Fresh Supabase database for menus only
- ✅ Existing Firebase auth/orders unchanged














