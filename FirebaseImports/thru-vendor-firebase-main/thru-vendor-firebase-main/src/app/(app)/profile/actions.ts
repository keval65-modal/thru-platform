
'use server';

import { z } from 'zod';
import type { Vendor } from '@/lib/inventoryModels';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { getSupabaseDbClient, uploadVendorImage } from '@/lib/supabase-auth';

const generateTimeOptions = () => {
    const options = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hour12 = h === 0 ? 12 : h % 12 === 0 ? 12 : h % 12;
            const period = h < 12 || h === 24 ? "AM" : "PM";
            const displayHour = hour12 < 10 ? `0${hour12}` : hour12;
            const displayMinute = m < 10 ? `0${m}` : m;
            let timeValue = `${displayHour}:${displayMinute} ${period}`;
            if (h === 0 && m === 0) timeValue = "12:00 AM (Midnight)";
            if (h === 12 && m === 0) timeValue = "12:00 PM (Noon)";
            options.push(timeValue.replace("12:00 AM (Midnight) AM", "12:00 AM (Midnight)").replace("12:00 PM (Noon) PM", "12:00 PM (Noon)"));
        }
    }
    return options;
};
const timeOptions = generateTimeOptions();

// Schema for validating profile updates
const UpdateProfileSchema = z.object({
  shopName: z.string().min(1, "Shop name is required."),
  storeCategory: z.string().min(1, "Store category is required."),
  ownerName: z.string().min(1, "Owner name is required."),
  phoneCountryCode: z.string().min(1, "Country code is required."),
  phoneNumber: z.string().min(1, "Phone number is required.").regex(/^\d{7,15}$/, { message: "Please enter a valid phone number (7-15 digits)." }),
  gender: z.string().optional(),
  city: z.string().min(1, "City is required."),
  weeklyCloseOn: z.string().min(1, "Weekly close day is required."),
  openingTime: z.string().min(1, "Opening time is required."),
  closingTime: z.string().min(1, "Closing time is required."),
  shopFullAddress: z.string().min(1, "Full address is required."),
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


export async function getVendorDetails(): Promise<{ vendor?: Vendor; error?: string }> {
  const session = await getSession();
  if (!session?.isAuthenticated || !session.uid) {
    return { error: "User not authenticated." };
  }

  try {
    const supabase = getSupabaseDbClient();
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', session.uid)
      .maybeSingle();

    if (error) {
      console.error('[getVendorDetails] Supabase error:', error);
      return { error: 'Failed to fetch vendor details.' };
    }

    if (!data) {
      return { error: 'Vendor details not found.' };
    }

    // Map Supabase vendor row -> existing Vendor model shape expected by the form.
    // Keep both legacy keys (shopImageUrl, etc.) and Supabase keys to avoid breaking UI.
    const location = (data as any).location;
    const coords =
      location?.coordinates && Array.isArray(location.coordinates) && location.coordinates.length >= 2
        ? { longitude: location.coordinates[0], latitude: location.coordinates[1] }
        : { longitude: null, latitude: null };

    const vendor: any = {
      id: data.id,
      email: data.email,
      shopName: data.name,
      ownerName: (data as any).owner_name,
      storeCategory: (data as any).store_type ? String((data as any).store_type) : '',
      type: (data as any).store_type ? String((data as any).store_type) : '',
      phoneCountryCode: session.phoneCountryCode ?? '+91',
      phoneNumber: session.phoneNumber ?? '',
      fullPhoneNumber: (data as any).phone,
      city: (data as any).city,
      weeklyCloseOn: (data as any).weekly_close_on,
      openingTime: (data as any).opening_time,
      closingTime: (data as any).closing_time,
      shopFullAddress: (data as any).address,
      latitude: coords.latitude,
      longitude: coords.longitude,
      shopImageUrl: (data as any).image_url,
      gender: (data as any).gender ?? '',
    };

    return { vendor };
  } catch (error) {
    console.error("Error fetching vendor details:", error);
    return { error: "Failed to fetch vendor details." };
  }
}

export type UpdateProfileFormState = {
  success?: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string[]>; // For field-specific errors
};

// Helper function to convert FormData to a plain object
function formDataToObject(formData: FormData): Record<string, any> {
  const obj: Record<string, any> = {};
  const entries = (formData as unknown as Iterable<[string, FormDataEntryValue]>);

  for (const [key, value] of entries) {
    obj[key] = value;
  }

  return obj;
}

export async function updateVendorProfile(
  prevState: UpdateProfileFormState,
  formData: FormData
): Promise<UpdateProfileFormState> {
  const session = await getSession();
  if (!session?.isAuthenticated || !session.uid) {
    return { error: "User not authenticated. Cannot update profile." };
  }
  const vendorId = session.uid;

  const rawData = formDataToObject(formData);
  const shopImageFile = formData.get('shopImage') as File | null;
  
  const dataToValidate = { ...rawData };
  if (shopImageFile && shopImageFile.size > 0) {
    dataToValidate.shopImage = shopImageFile;
  } else {
    delete dataToValidate.shopImage;
  }

  const validatedFields = UpdateProfileSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    console.error("Profile update validation errors:", validatedFields.error.flatten().fieldErrors);
    return {
      error: "Invalid form data. Please check your inputs.",
      fields: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { shopImage, ...vendorData } = validatedFields.data;
  
  const typedStoreCategory = vendorData.storeCategory as Vendor['storeCategory'];

  // This is the correct way to construct the update object to avoid type conflicts.
  const dataToUpdate: Omit<Partial<Vendor>, 'storeCategory' | 'type'> & { storeCategory: Vendor['storeCategory'], type: Vendor['storeCategory'], updatedAt: Timestamp } = {
    ...vendorData,
    storeCategory: typedStoreCategory,
    type: typedStoreCategory, // Ensure 'type' is updated if 'storeCategory' changes
    fullPhoneNumber: `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`,
    // `updatedAt` is kept for compatibility with existing Vendor model but will not be written to Supabase as-is.
    updatedAt: undefined as any,
  };

  try {
    const supabase = getSupabaseDbClient();

    let imageUrl: string | undefined;
    if (shopImage && shopImage.size > 0) {
      const upload = await uploadVendorImage(vendorId, shopImage as File);
      if (!upload.success || !upload.url) {
        return { success: false, error: upload.error || 'Failed to upload image.' };
      }
      imageUrl = upload.url;
    }

    const phone = `${vendorData.phoneCountryCode}${vendorData.phoneNumber}`;

    const updatePayload: any = {
      name: vendorData.shopName,
      owner_name: vendorData.ownerName,
      phone,
      address: vendorData.shopFullAddress,
      city: vendorData.city,
      location: {
        type: 'Point',
        coordinates: [vendorData.longitude, vendorData.latitude],
      },
      store_type: String(vendorData.storeCategory).toLowerCase(),
      opening_time: vendorData.openingTime,
      closing_time: vendorData.closingTime,
      weekly_close_on: vendorData.weeklyCloseOn,
      updated_at: new Date().toISOString(),
      ...(imageUrl ? { image_url: imageUrl } : {}),
    };

    const { error } = await supabase
      .from('vendors')
      .update(updatePayload)
      .eq('id', vendorId);

    if (error) {
      console.error('[updateVendorProfile] Supabase error:', error);
      return { success: false, error: error.message || 'Failed to update vendor profile.' };
    }

    revalidatePath('/profile');
    return { success: true, message: "Profile updated successfully!" };

  } catch (error) {
    console.error(`Error updating vendor profile for ${vendorId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to update profile. ${errorMessage}` };
  }
}
