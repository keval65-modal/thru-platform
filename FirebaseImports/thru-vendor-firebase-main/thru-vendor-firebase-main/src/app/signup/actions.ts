
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { adminDb, adminAuth, adminStorage } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Vendor } from '@/lib/inventoryModels';
import { validateUserForSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { vendorServiceServer } from '@/lib/supabase-server';

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

const signupFormSchema = z.object({
  shopName: z.string().min(2),
  storeCategory: z.string().min(1),
  ownerName: z.string().min(2),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  phoneCountryCode: z.string().min(1),
  phoneNumber: z.string().regex(/^\d{7,15}$/),
  gender: z.string().optional(),
  city: z.string().min(2),
  weeklyCloseOn: z.string().min(1),
  openingTime: z.string().min(1),
  closingTime: z.string().min(1),
  shopFullAddress: z.string().min(10),
  latitude: z.preprocess(val => parseFloat(String(val)), z.number()),
  longitude: z.preprocess(val => parseFloat(String(val)), z.number()),
  shopImage: z.any().optional(),
}).refine(data => {
    if(data.openingTime && data.closingTime) {
        const openTimeIndex = timeOptions.indexOf(data.openingTime);
        const closeTimeIndex = timeOptions.indexOf(data.closingTime);
        if (data.openingTime === "12:00 AM (Midnight)" && data.closingTime === "12:00 AM (Midnight)") return true;
        return closeTimeIndex > openTimeIndex;
    }
    return true;
}, { message: "Closing time must be after opening time.", path: ["closingTime"]});

export type SignupFormState = {
  success: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string[]>;
};

// Helper function to convert FormData to a plain object
function formDataToObject(formData: FormData): Record<string, any> {
    return Object.fromEntries((formData as any).entries());
}


export async function handleSignup(
  prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  console.log('🚀 ===== SIGNUP ACTION STARTED =====');
  console.log('📝 Environment Check:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : '❌ MISSING');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : '❌ MISSING');
  console.log('- FIREBASE_ADMIN_PROJECT_ID:', process.env.FIREBASE_ADMIN_PROJECT_ID ? 'PRESENT' : '❌ MISSING');
  console.log('- FIREBASE_ADMIN_CLIENT_EMAIL:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? 'PRESENT' : '❌ MISSING');
  console.log('- FIREBASE_ADMIN_PRIVATE_KEY:', process.env.FIREBASE_ADMIN_PRIVATE_KEY ? 'PRESENT' : '❌ MISSING');
  
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
      console.error("❌ Signup validation errors:", validatedFields.error.flatten().fieldErrors);
      return {
        success: false,
        error: "Invalid form data. Please check your inputs.",
        fields: validatedFields.error.flatten().fieldErrors,
      };
    }

    console.log('✅ Form validation passed');
    const { email, password, shopImage, ...vendorData } = validatedFields.data;
    // 1. Get fresh Firebase Admin instances
    const auth = adminAuth();
    const db = adminDb();
    const storage = adminStorage();
    
    if (!auth || !db || !storage) {
      console.error('❌ CRITICAL: Firebase Admin not initialized!');
      console.error('auth:', auth ? 'OK' : 'NULL');
      console.error('db:', db ? 'OK' : 'NULL');
      console.error('storage:', storage ? 'OK' : 'NULL');
      return { success: false, error: 'Server configuration error. Please contact support.' };
    }
    
    console.log('✅ Firebase Admin instances obtained successfully');
    
    // 2. Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: vendorData.ownerName,
      emailVerified: false,
    });
    const uid = userRecord.uid;
    console.log(`Successfully created new user: ${email} (${uid})`);

    // Explicitly cast storeCategory to the specific Vendor type
    const typedStoreCategory = vendorData.storeCategory as Vendor['storeCategory'];

    const dataToSave: Omit<Vendor, 'id'> = {
        ...vendorData,
        storeCategory: typedStoreCategory, // Use the correctly typed category
        email: email,
        fullPhoneNumber: `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`,
        isActiveOnThru: true,
        role: 'vendor',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        type: typedStoreCategory, // Also assign the typed category here
    };

    // 2. Upload image to Storage if it exists
    if (shopImage && shopImage.size > 0) {
        const bucket = storage.bucket();
        const imagePath = `vendor_shop_images/${uid}/shop_image.jpg`;
        const file = bucket.file(imagePath);
        const buffer = Buffer.from(await shopImage.arrayBuffer());
        
        await file.save(buffer, { metadata: { contentType: shopImage.type } });
        
        dataToSave.shopImageUrl = `https://storage.googleapis.com/${bucket.name}/${imagePath}`;
        console.log(`Image uploaded and public URL set for ${uid}: ${dataToSave.shopImageUrl}`);
    } else {
        dataToSave.shopImageUrl = `https://placehold.co/150x100.png?text=${encodeURIComponent(vendorData.shopName.substring(0,10))}`;
    }

    // 3. Create vendor document in Firestore with the same UID
    await db.collection('vendors').doc(uid).set(dataToSave);
    console.log(`Successfully created vendor document for ${uid}`);

    // 3b. ALSO save to Supabase so user app can find this vendor!
    const supabaseResult = await vendorServiceServer.upsertVendor({
      id: uid,
      name: vendorData.shopName,
      email: email,
      phone: `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`,
      address: vendorData.shopFullAddress,
      city: vendorData.city,
      latitude: vendorData.latitude,
      longitude: vendorData.longitude,
      store_type: vendorData.storeCategory,
      owner_name: vendorData.ownerName,
      opening_time: vendorData.openingTime,
      closing_time: vendorData.closingTime,
      weekly_close_on: vendorData.weeklyCloseOn,
      image_url: dataToSave.shopImageUrl
    });
    
    if (supabaseResult.success) {
      console.log(`✅ Successfully synced vendor ${uid} to Supabase - visible to users!`);
    } else {
      console.error(`⚠️ Warning: Vendor saved to Firebase but Supabase sync failed: ${supabaseResult.error}`);
      // Don't fail signup if Supabase fails - vendor is already in Firebase
    }

    // 4. Validate user and set session cookie
    const sessionResult = await validateUserForSession(uid);
    if (!sessionResult.success) {
        console.error(`CRITICAL: User ${uid} created but session validation failed: ${sessionResult.error}`);
        return { success: false, error: "Account created, but failed to log in. Please try logging in manually." };
    }

    const cookieStore = cookies();
    cookieStore.set('thru_vendor_auth_token', uid, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    });
  
    // 5. Redirect to dashboard on success. MUST be called after all successful async operations inside the try block.
    redirect('/orders');

  } catch (error: any) {
    console.error('❌❌❌ ERROR during signup process:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    try {
      console.error('Full error JSON:', JSON.stringify(error, null, 2));
    } catch (e) {
      console.error('Could not stringify error');
    }
    
    let errorMessage = "An unexpected error occurred during signup.";
    if (error.code === 'auth/email-already-exists') {
      errorMessage = "An account with this email address already exists. Please login instead.";
    } else if (error.message) {
      // Include the actual error message for debugging
      errorMessage = `Signup failed: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}
