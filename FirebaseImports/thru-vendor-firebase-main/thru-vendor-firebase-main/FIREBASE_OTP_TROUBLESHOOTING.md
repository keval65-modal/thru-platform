# 🔧 Firebase OTP Troubleshooting & Customization Guide

## 🚨 Current Issue: 400 Error on OTP Send

Based on your console logs, you're seeing:
```
Failed to load resource: the server responded with a status of 400
Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow
```

## 🔍 Common Causes & Solutions

### 1. **Firebase Project Not on Blaze Plan**
**Problem:** Firebase free tier (Spark) does NOT support SMS OTP.

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Usage and billing**
4. Upgrade to **Blaze Plan** (Pay as you go)
5. Add a payment method

**Note:** Blaze plan is pay-as-you-go. SMS costs ~$0.01 per message in India.

### 2. **Phone Authentication Not Enabled**
**Problem:** Phone authentication might not be enabled in Firebase.

**Solution:**
1. Go to Firebase Console → **Authentication** → **Sign-in method**
2. Click on **Phone** provider
3. Click **Enable**
4. Save

### 3. **reCAPTCHA Enterprise Not Configured**
**Problem:** The error mentions reCAPTCHA Enterprise, but it might not be set up correctly.

**Solution:**
1. Go to Firebase Console → **Authentication** → **Settings** → **reCAPTCHA Enterprise**
2. Ensure reCAPTCHA Enterprise is enabled
3. Or switch to reCAPTCHA v2:
   - Go to **Authentication** → **Settings** → **reCAPTCHA**
   - Select **reCAPTCHA v2** instead of Enterprise

### 4. **Phone Number Format Issues**
**Problem:** Phone number might not be in correct format.

**Current format:** `+917249111637` ✅ (This looks correct)

**Verify:**
- Must start with `+`
- Must include country code
- No spaces or dashes

### 5. **Test Phone Numbers (For Development)**
**Solution:** Add test phone numbers to avoid SMS costs during development:

1. Go to Firebase Console → **Authentication** → **Sign-in method**
2. Scroll to **Phone numbers for testing**
3. Click **Add phone number**
4. Add: `+917249111637` with OTP: `123456`
5. Save

Now when you test, Firebase will use the test OTP instead of sending real SMS.

### 6. **API Key Restrictions**
**Problem:** Firebase API key might have restrictions blocking OTP.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **Credentials**
4. Find your Firebase API key
5. Check **Application restrictions** - should allow your domain
6. Check **API restrictions** - should include:
   - Identity Toolkit API
   - Firebase Installations API

## 📝 Customizing OTP Message

### Method 1: Firebase Console (Recommended)

1. **Go to Firebase Console:**
   - Navigate to **Authentication** → **Templates**
   - Click on **Phone number sign-in** template

2. **Customize the SMS Template:**
   ```
   Your Thru verification code is: %CODE%
   
   This code will expire in 10 minutes.
   
   If you didn't request this code, please ignore this message.
   ```

3. **Available Variables:**
   - `%CODE%` - The 6-digit verification code
   - `%LINK%` - Deep link (if using app)
   - `%APP_NAME%` - Your app name

4. **Save the template**

### Method 2: Programmatic Customization (Advanced)

If you need more control, you can customize via Firebase Admin SDK:

```typescript
// In your server-side code
import { getAuth } from 'firebase-admin/auth';

const auth = getAuth();

// Update SMS template
await auth.updateProjectConfig({
  smsRegionConfig: {
    allowlistOnly: false,
  },
});

// Note: SMS template customization is primarily done through Console
```

### Method 3: Custom SMS Provider (Alternative)

If you want full control over SMS messages, you can:
1. Use a custom SMS provider (Twilio, AWS SNS, etc.)
2. Implement your own OTP generation
3. Send SMS via your provider
4. Verify OTP in your backend

## 🔧 Quick Fix Steps

1. **Check Firebase Plan:**
   ```bash
   # Go to Firebase Console → Project Settings → Usage and billing
   # Ensure you're on Blaze plan
   ```

2. **Enable Phone Auth:**
   ```
   Firebase Console → Authentication → Sign-in method → Phone → Enable
   ```

3. **Add Test Phone Number:**
   ```
   Firebase Console → Authentication → Sign-in method → Phone
   → Scroll to "Phone numbers for testing"
   → Add: +917249111637, OTP: 123456
   ```

4. **Check API Key:**
   ```
   Google Cloud Console → APIs & Services → Credentials
   → Check API restrictions include Identity Toolkit API
   ```

5. **Verify reCAPTCHA:**
   ```
   Firebase Console → Authentication → Settings
   → Check reCAPTCHA configuration
   ```

## 🧪 Testing

After fixing the issues:

1. **Test with test phone number:**
   - Use the test number you added
   - OTP will always be `123456`

2. **Test with real phone:**
   - Remove test number or use different number
   - Real SMS will be sent

3. **Check console logs:**
   - Should see: `✅ OTP sent successfully`
   - No 400 errors

## 📊 Monitoring

Monitor OTP delivery:
1. Firebase Console → **Authentication** → **Users**
2. Check if phone numbers are being verified
3. Check **Usage** tab for SMS quota

## 🆘 Still Not Working?

If OTP still doesn't work after trying above:

1. **Check Firebase Status:** https://status.firebase.google.com/
2. **Check Project Quota:** Firebase Console → Usage and billing
3. **Review Error Details:** Check browser Network tab for full error response
4. **Contact Firebase Support:** If quota/billing is correct

## 💡 Alternative: Use Supabase Auth Phone

If Firebase OTP continues to have issues, consider using Supabase's built-in phone authentication which might be simpler for your use case.
