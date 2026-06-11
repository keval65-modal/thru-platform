
'use server';

import { z } from 'zod';
import { getSupabaseDbClient, getSupabaseServiceDbClient, uploadVendorImage } from '@/lib/supabase-auth';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { Vendor } from '@/lib/inventoryModels';
import { KycState } from '@/types/kyc';

// Schema for validation
const UpdateVendorByAdminSchema = z.object({
  shopName: z.string().min(1, 'Shop name is required.'),
  ownerName: z.string().min(1, 'Owner name is required.'),
  storeCategory: z.string().min(1, 'Store category is required.'),
  isActiveOnThru: z
    .string()
    .optional()
    .transform((val) => val === 'on'), // Correctly handle checkbox state
});


// Helper types
export type UpdateVendorByAdminFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string[]>;
};

export type DeleteVendorResult = {
  success: boolean;
  error?: string;
  message?: string;
};

export type UploadVendorShopImageResult = {
  success: boolean;
  imageUrl?: string;
  error?: string;
};

// Authentication check
async function verifyAdmin() {
  const session = await getSession();
  if (!session.isAuthenticated || session.role !== 'admin') {
    throw new Error('You are not authorized to perform this action.');
  }
  return session;
}

// Fetch all vendors
export async function getAllVendors(): Promise<{
  vendors?: Vendor[];
  error?: string;
}> {
  try {
    await verifyAdmin();
    const supabase = getSupabaseDbClient();
    
    // We also want to know if they have submitted KYC, so we left join vendor_kyc
    const { data, error } = await supabase
      .from('vendors')
      .select('*, vendor_kyc(data)');
      
    if (error) throw error;

    const vendors = data.map((row: any) => {
      // row.vendor_kyc is an array due to one-to-many relationship possibility, 
      // but it's 1:1, so we take first.
      // actually with select('*, vendor_kyc(data)') and 1:1 it might be an object or array.
      // Usually supabase returns array for relations unless single() is used or relation is unique.
      // Let's assume array for safety.
      
      const kycData = Array.isArray(row.vendor_kyc) ? row.vendor_kyc[0]?.data : row.vendor_kyc?.data;
      
      return {
        id: row.id,
        shopName: row.name, // Map name to shopName
        ownerName: row.owner_name,
        email: row.email,
        phone: row.phone,
        city: row.city,
        shopImageUrl: row.image_url,
        storeCategory: row.store_type,
        isActiveOnThru: row.is_active_on_thru,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Helper property for UI (not in Vendor type but useful)
        kycStatus: kycData?.businessKycStatus || 'PENDING' 
      } as any as Vendor; // Type checking is loose here to allow extra prop
    });

    return { vendors };
  } catch (err) {
    console.error('[getAllVendors]', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred.';
    return { error: errorMessage };
  }
}

// Fetch vendor by ID for editing
export async function getVendorForEditing(
  vendorId: string
): Promise<{ vendor?: Vendor; error?: string }> {
  try {
    await verifyAdmin();
    const supabase = getSupabaseDbClient();
    
    const { data: row, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

    if (error) {
         if (error.code === 'PGRST116') return { vendor: undefined };
         throw error;
    }

    const coords = row.location?.coordinates as [number, number] | undefined;

    const vendor = {
        id: row.id,
        shopName: row.name,
        ownerName: row.owner_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        city: row.city,
        latitude: coords?.[1],
        longitude: coords?.[0],
        storeCategory: row.store_type,
        isActiveOnThru: row.is_active_on_thru,
        type: row.store_type, // Assuming type == storeCategory
        shopImageUrl: row.image_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    } as Vendor;

    return { vendor };
  } catch (err) {
    console.error(`[getVendorForEditing] CRITICAL ERROR fetching vendor ${vendorId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'A database error occurred.';
    return { error: errorMessage };
  }
}

// Helper function to convert FormData to a plain object
function formDataToObject(formData: FormData): Record<string, any> {
  const obj: Record<string, any> = {};
  const entries = (formData as unknown as Iterable<[string, FormDataEntryValue]>);

  for (const [key, value] of entries) {
    obj[key] = value;
  }

  return obj;
}


// Update vendor
export async function updateVendorByAdmin(
  vendorId: string,
  prevState: UpdateVendorByAdminFormState,
  formData: FormData
): Promise<UpdateVendorByAdminFormState> {
  try {
    await verifyAdmin();

    const formDataObject = formDataToObject(formData);
    const parsed = UpdateVendorByAdminSchema.safeParse(formDataObject);
    
    if (!parsed.success) {
      return {
        error: 'Invalid data submitted.',
        fields: parsed.error.flatten().fieldErrors,
      };
    }

    const { shopName, ownerName, storeCategory, isActiveOnThru } = parsed.data;
    const supabase = getSupabaseDbClient();
    
    const { error } = await supabase
      .from('vendors')
      .update({
         name: shopName,
         owner_name: ownerName,
         store_type: storeCategory, // normalize?
         is_active_on_thru: isActiveOnThru,
         updated_at: new Date().toISOString()
      })
      .eq('id', vendorId);

    if (error) throw error;

    revalidatePath('/admin');
    revalidatePath(`/admin/${vendorId}/edit`);

    return { success: true, message: 'Vendor updated successfully.' };
  } catch (err) {
    console.error(`[updateVendorByAdmin] Error updating vendor ${vendorId}`, err);
    return {
      error: err instanceof Error ? err.message : 'Unknown error occurred.',
    };
  }
}

/** Admin upload/replace shop photo for a vendor (uses service-role storage). */
export async function uploadVendorShopImageByAdmin(
  vendorId: string,
  formData: FormData
): Promise<UploadVendorShopImageResult> {
  try {
    await verifyAdmin();

    if (!vendorId) {
      return { success: false, error: 'Vendor ID is required.' };
    }

    const shopImage = formData.get('shopImage');
    if (!(shopImage instanceof File) || shopImage.size === 0) {
      return { success: false, error: 'Please choose an image to upload.' };
    }
    if (!shopImage.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image (JPG, PNG, or WebP).' };
    }

    const upload = await uploadVendorImage(vendorId, shopImage);
    if (!upload.success || !upload.url) {
      return { success: false, error: upload.error || 'Failed to upload image.' };
    }

    const supabase = getSupabaseServiceDbClient() ?? getSupabaseDbClient();
    const { error } = await supabase
      .from('vendors')
      .update({
        image_url: upload.url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId);

    if (error) throw error;

    revalidatePath('/admin/shops');
    revalidatePath(`/admin/shops/${vendorId}`);
    revalidatePath(`/admin/${vendorId}/edit`);
    revalidatePath('/admin');

    return { success: true, imageUrl: upload.url };
  } catch (err) {
    console.error('[uploadVendorShopImageByAdmin]', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred.',
    };
  }
}

// Delete vendor & inventory
export async function deleteVendorAndInventory(
  vendorId: string
): Promise<DeleteVendorResult> {
  try {
    await verifyAdmin();

    if (!vendorId) return { success: false, error: 'Vendor ID is required.' };

    console.log(`[deleteVendorAndInventory] Deleting vendor ${vendorId}`);
    
    const supabase = getSupabaseDbClient();
    
    // Cascading delete should handle inventory and kyc if configured correctly in DB.
    // If not, we might need manual deletion. Assuming Postgres FK cascade.
    const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId);

    if (error) throw error;

    revalidatePath('/admin');

    return {
      success: true,
      message: `Deleted vendor ${vendorId}.`,
    };
  } catch (err) {
    console.error(`[deleteVendorAndInventory] Error deleting vendor ${vendorId}`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred.',
    };
  }
}

// KYC Actions
export async function getVendorKyc(vendorId: string): Promise<{ data?: KycState, error?: string }> {
    try {
        await verifyAdmin();
        const supabase = getSupabaseDbClient();
        const { data, error } = await supabase
            .from('vendor_kyc')
            .select('data')
            .eq('vendor_id', vendorId)
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') return { data: undefined }; // Not found is okay
            throw error;
        }
        
        return { data: data?.data };
    } catch (err) {
        console.error("Error fetching KYC:", err);
        return { error: "Failed to fetch KYC data" };
    }
}

export async function updateKycStatus(vendorId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    try {
        await verifyAdmin();
        const supabase = getSupabaseDbClient();
        
        // Fetch current data
        const { data: current, error: fetchError } = await supabase
            .from('vendor_kyc')
            .select('data')
            .eq('vendor_id', vendorId)
            .single();
            
        if (fetchError || !current) throw new Error("KYC Record not found");
        
        const newData = {
            ...current.data,
            businessKycStatus: status,
            // You might want to update status of individual docs too, or just the overall phase
            // For now, let's update basic status too if approved
            advancedKycStatus: status === 'APPROVED' ? status : current.data.advancedKycStatus
        };
        
        const { error } = await supabase
            .from('vendor_kyc')
            .update({
                data: newData,
                updated_at: new Date().toISOString()
            })
            .eq('vendor_id', vendorId);
            
        if (error) throw error;
        
        revalidatePath(`/admin/kyc/${vendorId}`);
        return { success: true };
    } catch (err) {
         console.error("Error updating KYC:", err);
         return { success: false, error: "Failed to update status" };
    }
}

// Order Actions
export async function getVendorOrders(vendorId: string) {
    try {
        await verifyAdmin();
        const supabase = getSupabaseDbClient();
        
        // Assuming table is 'orders'
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('vendor_id', vendorId)
            .order('created_at', { ascending: false });
            
        if (error) {
             console.error("Orders fetch error:", error);
             // Return empty if table doesn't exist or other error, strictly speaking we should handle it
             return [];
        }
        
        return data || [];
    } catch (err) {
        return [];
    }
}

// Fetch vendors with location data for map
export async function getVendorsForMap(): Promise<{
  vendors?: Array<{
    id: string;
    name: string;
    email: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    isActiveOnThru: boolean;
    storeType: string;
  }>;
  error?: string;
}> {
  try {
    await verifyAdmin();
    const supabase = getSupabaseDbClient();
    
    const { data, error } = await supabase
      .from('vendors')
      .select('id, name, email, address, city, location, is_active_on_thru, store_type');
      
    if (error) throw error;

    const vendors = (data || [])
      .map((row: any) => {
        // Extract coordinates from location (can be Point geometry or lat/lng object)
        let latitude = 0;
        let longitude = 0;
        
        if (row.location) {
          if (row.location.coordinates && Array.isArray(row.location.coordinates)) {
            // PostGIS Point format: [lng, lat]
            [longitude, latitude] = row.location.coordinates;
          } else if (typeof row.location.lat === 'number' && typeof row.location.lng === 'number') {
            // Object format: { lat, lng }
            latitude = row.location.lat;
            longitude = row.location.lng;
          }
        }

        // Only include vendors with valid coordinates
        if (latitude !== 0 || longitude !== 0) {
          return {
            id: row.id,
            name: row.name,
            email: row.email,
            address: row.address || '',
            city: row.city || '',
            latitude,
            longitude,
            isActiveOnThru: row.is_active_on_thru,
            storeType: row.store_type || 'Other',
          };
        }
        return null;
      })
      .filter((v: any) => v !== null);

    return { vendors };
  } catch (err) {
    console.error('[getVendorsForMap]', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred.';
    return { error: errorMessage };
  }
}
