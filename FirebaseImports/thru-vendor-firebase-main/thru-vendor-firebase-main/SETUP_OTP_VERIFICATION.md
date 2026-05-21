# 🔐 Setup Guide: Phone OTP Verification

## Architecture Overview

### **Hybrid Approach:**
- ✅ **Supabase**: All data storage (vendors, orders, menu items, etc.)
- ✅ **Firebase**: ONLY for SMS OTP verification
- ✅ **Result**: Best of both worlds - reliable SMS + powerful database

---

## 📋 Step 1: Setup Supabase (Email & Phone Unique Constraints)

### Run this SQL in Supabase SQL Editor:

```sql
-- 1. Add unique constraints for email and phone
ALTER TABLE vendors
ADD CONSTRAINT vendors_email_unique UNIQUE (email);

ALTER TABLE vendors
ADD CONSTRAINT vendors_phone_unique UNIQUE (phone);

-- 2. Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_phone ON vendors(phone);

-- 3. Verify constraints were added
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'vendors' 
AND constraint_type = 'UNIQUE';
```

---

## 📋 Step 2: Enable Firebase Phone Authentication

### A. Go to Firebase Console:
1. Go to: https://console.firebase.google.com/
2. Select your project: **thru-3940d**
3. Go to **Authentication** → **Sign-in method**
4. Click on **Phone** provider
5. Click **Enable**
6. Save

### B. Configure Phone Auth Settings:
1. In same screen, scroll to **Phone numbers for testing** (optional, for development)
2. Add test numbers if you want to test without using real SMS:
   ```
   +911234567890 → 123456
   +919876543210 → 654321
   ```

### C. Add Your App SHA-256 (if testing on Android):
- Not needed for web/localhost testing
- Only required for production Android app

---

## 📋 Step 3: Install Firebase SDK

```bash
npm install firebase
```

---

## 📋 Step 4: Verify Environment Variables

Make sure these are in your `.env.local`:

```bash
# Supabase (for data)
NEXT_PUBLIC_SUPABASE_URL=https://wrrdzzvotznletjclzcp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Firebase (ONLY for OTP)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=thru-3940d.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=thru-3940d
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=thru-3940d.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

---

## 📋 Step 5: Update Signup Page

Replace the import in `src/app/signup/page.tsx`:

```typescript
// OLD
import { SignupForm } from '@/components/auth/SignupForm';

// NEW
import { SignupFormWithOTP } from '@/components/auth/SignupFormWithOTP';

// Then use it:
export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignupFormWithOTP />
    </main>
  );
}
```

---

## 🧪 Testing the OTP Flow

### **Step 1: Start Dev Server**
```bash
npm run dev
```

### **Step 2: Go to Signup**
```
http://localhost:3000/signup
```

### **Step 3: Test Signup Flow**

#### **Phase 1: Basic Info**
1. Enter email, password, owner name, shop name
2. Click "Next: Verify Phone"

#### **Phase 2: Phone Verification**
1. Select country code (default: +91 for India)
2. Enter phone number (10 digits)
3. Click "Send Verification Code"
4. Check your phone for SMS
5. Enter the 6-digit code
6. Click "Verify Code"

#### **Phase 3: Shop Details**
1. Fill in shop address, location, hours, category
2. Upload shop image (optional)
3. Click "Complete Registration"

### **Expected Console Logs:**
```
✅ Firebase initialized for OTP service
📱 Sending OTP to: +919876543210
✅ OTP sent successfully
🔐 Verifying OTP code: 123456
✅ OTP verified successfully
🚀 ===== SUPABASE SIGNUP ACTION STARTED =====
✅ Supabase Auth user created: [UUID]
✅ Vendor profile created successfully!
🎉 ===== SIGNUP COMPLETE - REDIRECTING TO DASHBOARD =====
```

---

## 🚨 Troubleshooting

### **Error: "reCAPTCHA not initialized"**
- **Cause:** Firebase reCAPTCHA not loaded
- **Fix:** Ensure Firebase is initialized before rendering form
- **Check:** Browser console for Firebase initialization logs

### **Error: "Invalid phone number"**
- **Cause:** Phone number not in international format
- **Fix:** Always include country code (+91, +1, etc.)
- **Format:** `+[country code][phone number]`
  - Correct: `+919876543210`
  - Wrong: `9876543210`

### **Error: "Too many requests"**
- **Cause:** Rate limiting on SMS
- **Fix:** Wait 1 hour or use test phone numbers
- **Prevention:** Add test numbers in Firebase Console

### **Error: "SMS quota exceeded"**
- **Cause:** Firebase free tier SMS limit reached
- **Fix:** Upgrade to Blaze plan or use test numbers
- **Limit:** 10 SMS/day on free tier

### **Error: "auth/captcha-check-failed"**
- **Cause:** reCAPTCHA verification failed
- **Fix:** 
  1. Check if you're on localhost (reCAPTCHA works on localhost)
  2. Clear browser cache
  3. Try in incognito mode

---

## 💰 Firebase Pricing (SMS)

### **Free Tier (Spark Plan):**
- ❌ **SMS NOT included** in free tier
- Must upgrade to Blaze plan for production SMS

### **Blaze Plan (Pay as you go):**
- ✅ **$0.01 per SMS** in India
- ✅ **$0.01-0.03 per SMS** in US/Europe
- ✅ Only pay for what you use
- ✅ Very affordable for startups

### **Cost Estimate:**
- 100 signups/day = 100 SMS = **$1/day = $30/month**
- 500 signups/day = 500 SMS = **$5/day = $150/month**

---

## 🎯 Benefits of This Approach

### **Why Firebase OTP?**
- ✅ Reliable SMS delivery worldwide
- ✅ Built-in spam protection
- ✅ Rate limiting included
- ✅ reCAPTCHA integration
- ✅ 10+ years of proven reliability
- ✅ Simple API

### **Why Supabase Data?**
- ✅ PostgreSQL power (complex queries, joins)
- ✅ Real-time subscriptions
- ✅ Row Level Security (RLS)
- ✅ Auto-generated APIs
- ✅ Better DX (developer experience)
- ✅ Open source

### **Best of Both Worlds!**
- 🔐 Firebase → SMS/OTP (what it's best at)
- 📊 Supabase → Everything else (what it's best at)

---

## 📝 Next Steps

1. ✅ Run SQL to add unique constraints
2. ✅ Enable Firebase Phone Auth
3. ✅ Update signup page to use new component
4. ✅ Test locally with your phone number
5. ✅ Deploy to production
6. ✅ Monitor Firebase usage/costs

---

**Ready to implement?** Let me know and I'll help you test it!











