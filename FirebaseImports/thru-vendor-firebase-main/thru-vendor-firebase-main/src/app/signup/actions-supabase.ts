/**
 * Vendor Signup Action - Supabase Version
 * 
 * This replaces the Firebase-based signup with pure Supabase
 */

'use server';

import { z } from 'zod';
import { cookies, headers } from 'next/headers';
import {
  signUpVendor,
  createVendorProfile,
  uploadVendorImage,
  linkSupabaseUserPhone,
  getSupabaseDbClient,
} from '@/lib/supabase-auth';
import { sendMerchantWelcomeAfterVerification } from '@/services/whatsapp/sendMerchantWelcomeAfterVerification';
import {
  deleteIncompleteRegistration,
  merchantHasSignedAgreement,
} from '@/lib/incomplete-registration';
import { adminAuth } from '@/lib/firebase-admin';
import { isValidIfscFormat, isValidUpiId } from '@/lib/ifsc';
import { normalizeAccountNumber } from '@/lib/bank-account';
import { hasCompleteBankInput, saveVendorBankAccount } from '@/lib/vendor-bank';

const timeOptions = [
    "12:00 AM (Midnight)", "12:30 AM", "01:00 AM", "01:30 AM", "02:00 AM", "02:30 AM",
    "03:00 AM", "03:30 AM", "04:00 AM", "04:30 AM", "05:00 AM", "05:30 AM",
    "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM",
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM (Noon)", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
    "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"
];

const boolPreprocess = (value: any) => {
  if (typeof value === 'string') {
    return value === 'true' || value === 'on';
  }
  return Boolean(value);
};

const signupFormSchema = z.object({
  shopName: z.string().min(2),
  storeCategory: z.string().min(1),
  ownerName: z.string().min(2),
  // Email is truly optional for signup; blank or missing values are allowed.
  email: z
    .preprocess(
      (val) => {
        if (!val || (typeof val === 'string' && val.trim() === '')) return undefined;
        return typeof val === 'string' ? val.trim().toLowerCase() : val;
      },
      z.string().email().optional()
    )
    .optional(),
  password: z.string().min(8),
  phoneCountryCode: z.string().min(1),
  phoneNumber: z.string().regex(/^\d{7,15}$/),
  gender: z.string().optional(),
  city: z.string().min(2),
  weeklyCloseOn: z.string().min(1),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  shopFullAddress: z.string().min(10),
  latitude: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined;
      const n = parseFloat(String(val));
      return Number.isFinite(n) ? n : undefined;
    },
    z.number({ invalid_type_error: 'Latitude must be a number.' }).min(-90).max(90)
  ).refine((v) => v !== undefined, { message: 'Latitude is required. Use address search or enter manually.' }),
  longitude: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined;
      const n = parseFloat(String(val));
      return Number.isFinite(n) ? n : undefined;
    },
    z.number({ invalid_type_error: 'Longitude must be a number.' }).min(-180).max(180)
  ).refine((v) => v !== undefined, { message: 'Longitude is required. Use address search or enter manually.' }),
  alwaysOpen: z.preprocess(boolPreprocess, z.boolean()).default(false),
  firebaseIdToken: z.string().min(10, { message: 'Phone verification token missing.' }),
  shopImage: z.any().optional(),
  // Bank details (optional)
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  confirmAccountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  bankName: z.string().optional(),
  branchName: z.string().optional(),
  upiId: z.string().optional(),
  preferred_language: z.enum(['en', 'hi', 'mr']),
  whatsapp_consent: z.preprocess(boolPreprocess, z.boolean()).refine((v) => v === true, {
    message:
      'You must agree to receive onboarding updates and related WhatsApp communications from Thru to continue.',
  }),
}).superRefine((data, ctx) => {
  if (!data.alwaysOpen) {
    if (!data.openingTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['openingTime'],
        message: 'Opening time is required unless the shop is always open.',
      });
    }

    if (!data.closingTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closingTime'],
        message: 'Closing time is required unless the shop is always open.',
      });
    }

    if (data.openingTime && data.closingTime) {
      const openTimeIndex = timeOptions.indexOf(data.openingTime);
      const closeTimeIndex = timeOptions.indexOf(data.closingTime);
      if (openTimeIndex === -1 || closeTimeIndex === -1 || closeTimeIndex <= openTimeIndex) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['closingTime'],
          message: 'Closing time must be after opening time.',
        });
      }
    }
  }

  const accountNumber = normalizeAccountNumber(data.accountNumber ?? '');
  const confirmAccountNumber = normalizeAccountNumber(data.confirmAccountNumber ?? '');
  if (accountNumber || confirmAccountNumber) {
    if (!accountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountNumber'],
        message: 'Account number is required.',
      });
    }
    if (!confirmAccountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmAccountNumber'],
        message: 'Please re-enter your account number in the confirm field.',
      });
    }
    if (accountNumber && confirmAccountNumber && accountNumber !== confirmAccountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmAccountNumber'],
        message: 'Account numbers do not match.',
      });
    }
  }

  const hasAnyBankField = !!(
    data.accountHolderName?.trim() ||
    data.accountNumber?.trim() ||
    data.confirmAccountNumber?.trim() ||
    data.ifscCode?.trim() ||
    data.bankName?.trim() ||
    data.branchName?.trim() ||
    data.upiId?.trim()
  );

  if (hasAnyBankField) {
    if (!data.accountHolderName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountHolderName'],
        message: 'Account holder name is required when adding bank details.',
      });
    }
    if (!data.ifscCode?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ifscCode'],
        message: 'IFSC code is required when adding bank details.',
      });
    } else if (!isValidIfscFormat(data.ifscCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ifscCode'],
        message: 'Invalid IFSC format (e.g. SBIN0001234).',
      });
    }
    if (!data.bankName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bankName'],
        message: 'Bank name is required when adding bank details.',
      });
    }
  }

  const upi = (data.upiId ?? '').trim();
  if (upi && !isValidUpiId(upi)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['upiId'],
      message: 'Invalid UPI ID format (e.g. name@bank).',
    });
  }
});

export type SignupFormState = {
  success: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string[]>;
};

function formDataToObject(formData: FormData): Record<string, any> {
    return Object.fromEntries((formData as any).entries());
}

export async function handleSignupSupabase(
  prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  console.log('\n🚀 ===== SUPABASE SIGNUP ACTION STARTED =====');
  console.log('📝 Environment Check:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : '❌ MISSING');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : '❌ MISSING');
  
  try {
    const rawData = formDataToObject(formData);
    const shopImageFile = formData.get('shopImage') as File | null;
    
    const dataToValidate = { ...rawData };
    if (shopImageFile && shopImageFile.size > 0) {
      dataToValidate.shopImage = shopImageFile;
    } else {
      delete dataToValidate.shopImage;
    }

    console.log('📋 Validating form data...');
    const validatedFields = signupFormSchema.safeParse(dataToValidate);

    if (!validatedFields.success) {
      const fieldErrors = validatedFields.error.flatten().fieldErrors;
      console.error('❌ Signup validation errors:', fieldErrors);
      const firstMessage = Object.values(fieldErrors).flat().find(Boolean);
      return {
        success: false,
        error: firstMessage ?? 'Invalid form data. Please check your inputs.',
        fields: fieldErrors,
      };
    }

    console.log('✅ Form validation passed');
    const {
      email,
      password,
      shopImage,
      firebaseIdToken,
      whatsapp_consent: whatsappConsent,
      preferred_language: preferredLanguage,
      ...vendorData
    } = validatedFields.data;

    console.log('\n📱 Step 0: Verifying Firebase OTP token...');
    const adminAuthInstance = adminAuth();
    if (!adminAuthInstance) {
      console.error('❌ Firebase Admin not initialized - cannot verify OTP token');
      return { success: false, error: 'Server configuration error: unable to verify phone number. Please try again shortly.' };
    }

    let verifiedPhoneNumber = '';
    try {
      const decoded = await adminAuthInstance.verifyIdToken(firebaseIdToken);
      verifiedPhoneNumber = decoded.phone_number ?? '';
      console.log('✅ Firebase OTP token verified for phone:', verifiedPhoneNumber);
    } catch (error: any) {
      console.error('❌ Failed to verify Firebase OTP token:', error?.message || error);
      return { success: false, error: 'Phone verification failed. Please request a new OTP and try again.' };
    }

    const submittedPhone = `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`.replace(/[\s-]/g, '');
    const normalizedVerified = verifiedPhoneNumber.replace(/[\s-]/g, '');

    if (!normalizedVerified || normalizedVerified !== submittedPhone) {
      console.error('❌ Phone mismatch:', { submittedPhone, normalizedVerified });
      return { success: false, error: 'Verified phone number does not match the provided number. Please verify again.' };
    }

    // 0.5. Check if user already exists before attempting to create
    console.log('\n🔍 Step 0.5: Checking if user already exists...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!listError && existingUsers) {
        const normalizedPhone = submittedPhone.replace(/[\s-]/g, '');
        const existingUser = existingUsers.users.find(u => {
          if (!u.phone) return false;
          const userPhone = u.phone.replace(/[\s-]/g, '');
          // Match exact, or try variations
          return userPhone === normalizedPhone || 
                 userPhone === normalizedPhone.replace(/^\+/, '') ||
                 `+${userPhone}` === normalizedPhone ||
                 userPhone.replace(/^91/, '+91') === normalizedPhone ||
                 (email && u.email?.toLowerCase() === email.toLowerCase());
        });

        if (existingUser) {
          console.log('⚠️ User already exists:', existingUser.id);
          const signed = await merchantHasSignedAgreement(supabaseAdmin, existingUser.id);
          if (signed) {
            console.log('✅ User already completed agreement — treat as login');
            const cookieStore = cookies();
            cookieStore.set('thru_vendor_auth_token', existingUser.id, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: 60 * 60 * 24 * 7,
              path: '/',
            });
            return {
              success: true,
              message: 'Account already exists. Logging you in...',
            };
          }
          console.log('🧹 Removing incomplete registration (no signed agreement)');
          await deleteIncompleteRegistration(existingUser.id);
        } else {
          console.log('✅ No existing user found - proceeding with signup');
        }
      }
    }

    // 1. Create Supabase Auth user
    console.log('\n📧 Step 1: Creating Supabase Auth user...');
    const { success: authSuccess, user, error: authError, phoneLinked } = await signUpVendor(
      email ?? null,
      password,
      submittedPhone
    );
    
    let uid: string | null = null;
    
    if (!authSuccess || !user) {
      console.error('❌ Auth creation failed:', authError);
      console.error('Error details:', JSON.stringify(authError, null, 2));
      
      // Check for various Supabase error messages
      const errorLower = authError?.toLowerCase() || '';
      const isDuplicateError = errorLower.includes('already registered') || 
          errorLower.includes('user already registered') ||
          errorLower.includes('already exists') ||
          errorLower.includes('duplicate') ||
          errorLower.includes('email address is already in use') ||
          errorLower.includes('phone number is already in use');
      
      if (isDuplicateError) {
        // User already exists - check if we can use the existing user
        console.log('⚠️ User already exists, checking if we can use existing user...');
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          const normalizedPhone = submittedPhone.replace(/[\s-]/g, '');
          
          // Find the existing user
          const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (!listError && existingUsers) {
            const existingUser = existingUsers.users.find(u => {
              if (!u.phone) return false;
              const userPhone = u.phone.replace(/[\s-]/g, '');
              return userPhone === normalizedPhone || 
                     userPhone === normalizedPhone.replace(/^\+/, '') ||
                     `+${userPhone}` === normalizedPhone ||
                     userPhone.replace(/^91/, '+91') === normalizedPhone ||
                     (email && u.email?.toLowerCase() === email.toLowerCase());
            });

            if (existingUser) {
              const signed = await merchantHasSignedAgreement(supabaseAdmin, existingUser.id);
              if (signed) {
                console.log('❌ User exists and completed agreement');
                const cookieStore = cookies();
                cookieStore.set('thru_vendor_auth_token', existingUser.id, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  maxAge: 60 * 60 * 24 * 7,
                  path: '/',
                });
                return {
                  success: true,
                  message: 'Account already exists. Logging you in...',
                };
              }
              console.log('🧹 Removing incomplete registration before retry');
              await deleteIncompleteRegistration(existingUser.id);
            } else {
              // Couldn't find existing user - this is strange, return error
              console.error('❌ Error says user exists but we cannot find them');
              return { 
                success: false, 
                error: 'An account with this phone number or email already exists. Please login instead.' 
              };
            }
          } else {
            return { 
              success: false, 
              error: 'An account with this phone number or email already exists. Please login instead.' 
            };
          }
        } else {
          return { 
            success: false, 
            error: 'An account with this phone number or email already exists. Please login instead.' 
          };
        }
      } else if (errorLower.includes('security purposes') || errorLower.includes('rate limit')) {
        return { 
          success: false, 
          error: "We received too many signup attempts. Please wait a minute before trying again." 
        };
      } else {
        // Other errors - return failure
        console.error('Full auth error:', authError);
        return { 
          success: false, 
          error: `Signup failed: ${authError || 'Unknown error'}` 
        };
      }
    } else {
      // User created successfully
      uid = user.id;
      console.log(`✅ Supabase Auth user created: ${uid}`);
    }

    // If we don't have a uid at this point, something went wrong
    if (!uid) {
      console.error('❌ No user ID available - cannot proceed with signup');
      return { success: false, error: 'Failed to create or find user account. Please try again.' };
    }

    // 2. Upload shop image to Supabase Storage (if provided)
    let shopImageUrl = `https://placehold.co/150x100.png?text=${encodeURIComponent(vendorData.shopName.substring(0,10))}`;
    
    if (shopImage && shopImage.size > 0) {
      console.log('\n📸 Step 2: Uploading shop image to Supabase Storage...');
      const uploadResult = await uploadVendorImage(uid, shopImage);
      
      if (uploadResult.success && uploadResult.url) {
        shopImageUrl = uploadResult.url;
        console.log(`✅ Image uploaded: ${shopImageUrl}`);
      } else {
        console.warn(`⚠️ Image upload failed: ${uploadResult.error}, using placeholder`);
      }
    } else {
      console.log('\n⏭️  Step 2: No image provided, using placeholder');
    }

    // Only try to link phone if user was just created (not if we're using existing user)
    if (authSuccess && user && !phoneLinked) {
      console.log('\n🔗 Step 3: Linking Supabase Auth user to verified phone number...');
      const { success: linkPhoneSuccess, error: linkPhoneError } = await linkSupabaseUserPhone(uid, submittedPhone);

      if (!linkPhoneSuccess) {
        console.error('❌ Failed to link phone to Supabase user:', linkPhoneError);
        // Don't fail here - phone might already be linked
        console.warn('⚠️ Continuing despite phone link failure - phone may already be linked');
      }
    } else {
      console.log('🔗 Phone number already linked or using existing user');
    }

    // 4. Create vendor profile in Supabase
    console.log('\n💾 Step 4: Creating vendor profile in Supabase...');
    const openingTimeValue = vendorData.alwaysOpen ? 'Always Open' : (vendorData.openingTime ?? 'Not Provided');
    const closingTimeValue = vendorData.alwaysOpen ? 'Always Open' : (vendorData.closingTime ?? 'Not Provided');
    
    const vendorProfile: any = {
      id: uid, // Same as Auth user ID
      name: vendorData.shopName,
      email: email,
      phone: `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`,
      address: vendorData.shopFullAddress,
      city: vendorData.city,
      location: {
        type: 'Point',
        coordinates: [vendorData.longitude, vendorData.latitude]
      },
      store_type: vendorData.storeCategory.toLowerCase(),
      owner_name: vendorData.ownerName,
      opening_time: openingTimeValue,
      closing_time: closingTimeValue,
      weekly_close_on: vendorData.weeklyCloseOn,
      image_url: shopImageUrl,
      is_active: false,
      is_active_on_thru: false,
      grocery_enabled: true,
      always_open: vendorData.alwaysOpen,
      preferred_language: preferredLanguage,
      phone_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { success: profileSuccess, error: profileError } = await createVendorProfile(vendorProfile);
    
    if (!profileSuccess) {
      console.error('❌ Vendor profile creation failed:', profileError);
      return { success: false, error: `Failed to create vendor profile: ${profileError}` };
    }

    console.log('✅ Vendor profile created successfully!');

    const bankInput = {
      accountHolderName: vendorData.accountHolderName ?? '',
      accountNumber: normalizeAccountNumber(vendorData.accountNumber ?? ''),
      ifscCode: vendorData.ifscCode ?? '',
      bankName: vendorData.bankName ?? '',
      branchName: vendorData.branchName ?? null,
      upiId: vendorData.upiId ?? null,
    };

    if (hasCompleteBankInput(bankInput)) {
      console.log('💳 Saving bank account to vendor_bank_accounts...');
      const bankResult = await saveVendorBankAccount(uid, bankInput);
      if (!bankResult.success) {
        console.error('❌ Bank account save failed:', bankResult.error);
        const hint = bankResult.error?.includes('vendor_bank_accounts')
          ? ' Run src/lib/supabase/onboarding-schema.sql in Supabase SQL Editor.'
          : '';
        return {
          success: false,
          error: `Shop registered but bank details could not be saved: ${bankResult.error}.${hint}`,
        };
      }
      console.log('✅ Bank account saved');
    }

    const phoneForWelcome = submittedPhone.startsWith('+')
      ? submittedPhone
      : `+${submittedPhone.replace(/^\+/, '')}`;
    console.log('[signup] Sending merchant_welcome WhatsApp (awaiting completion)...', {
      merchantId: uid,
    });
    try {
      await sendMerchantWelcomeAfterVerification({
        merchantId: uid,
        phoneE164: phoneForWelcome,
        ownerName: vendorData.ownerName,
        skipPhoneVerifiedCheck: true,
        whatsappConsent,
      });
      console.log('[signup] merchant_welcome WhatsApp finished');
    } catch (e: unknown) {
      console.error('[signup] merchant welcome WhatsApp task failed:', e instanceof Error ? e.message : e);
    }

    try {
      const headerList = await headers();
      const forwarded = headerList.get('x-forwarded-for');
      const ip = forwarded?.split(',')[0]?.trim() || headerList.get('x-real-ip') || null;
      const ua = headerList.get('user-agent') || null;
      const db = getSupabaseDbClient();
      const { error: consentErr } = await db.from('merchant_consents').insert({
        merchant_id: uid,
        whatsapp_consent: whatsappConsent,
        consented_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: ua,
      });
      if (consentErr) {
        console.warn('⚠️ merchant_consents insert failed (run SQL migration if needed):', consentErr.message);
      }
    } catch (consentCatch: any) {
      console.warn('⚠️ merchant_consents insert exception:', consentCatch?.message || consentCatch);
    }

    // 5. Set session cookie
    console.log('\n🍪 Step 5: Creating session cookie...');
    const cookieStore = cookies();
    cookieStore.set('thru_vendor_auth_token', uid, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    });

    console.log('✅ Session cookie set');
    console.log('\n🎉 ===== SIGNUP COMPLETE =====\n');

    return {
      success: true,
      message: 'Signup complete. Continue to your merchant agreement.',
    };

  } catch (error: any) {
    console.error('\n❌❌❌ ERROR during signup process:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    let errorMessage = "An unexpected error occurred during signup.";
    if (error.message) {
      errorMessage = `Signup failed: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}


