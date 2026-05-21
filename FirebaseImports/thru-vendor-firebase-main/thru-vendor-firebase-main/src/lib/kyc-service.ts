
import { supabase } from "./supabase";
import { KycState } from "@/types/kyc";

export async function saveKycData(userId: string, data: Partial<KycState>) {
  // We'll store KYC data in a dedicated 'vendor_kyc' table to keep the 'vendors' table clean.
  // Structure expected:
  // table: vendor_kyc
  // columns: vendor_id (text, PK), data (jsonb), updated_at (timestamp)
  
  // First, get existing data to merge
  const existing = await getKycData(userId);
  const mergedData = { ...(existing || {}), ...data };

  const { error } = await supabase
    .from('vendor_kyc')
    .upsert({ 
        vendor_id: userId, 
        data: mergedData, 
        updated_at: new Date().toISOString() 
    }, { onConflict: 'vendor_id' });

  if (error) {
    console.error('Error saving KYC data:', error);
    throw new Error(`Save failed: ${error.message}`);
  }
}

export async function getKycData(userId: string): Promise<Partial<KycState> | null> {
  const { data, error } = await supabase
    .from('vendor_kyc')
    .select('data')
    .eq('vendor_id', userId)
    .single();
    
  if (error) {
     if (error.code === 'PGRST116') return null; // Not found
     console.error('Error fetching KYC data:', error);
     return null;
  }
  
  return data?.data as Partial<KycState>;
}
