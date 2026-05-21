
import { supabase } from "./supabase";

/**
 * Uploads a file to Supabase Storage under the 'kyc-documents' bucket.
 * @param userId - The ID of the user/vendor.
 * @param file - The file to upload.
 * @param documentType - The type of document (e.g., 'pan', 'aadhaar').
 * @returns The public URL of the uploaded file.
 */
export async function uploadKycDocument(userId: string, file: File, documentType: string): Promise<string> {
  // Create a unique filename
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const path = `${userId}/${documentType}_${timestamp}.${extension}`;
  
  const { data, error } = await supabase.storage
    .from('kyc-documents')
    .upload(path, file, {
        cacheControl: '3600',
        upsert: false
    });

  if (error) {
    console.error('Error uploading KYC document:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
  
  // Get public URL (Assuming the bucket is public or we want a public link for now)
  // For strictly private docs, we would generate a signed URL, but that expires.
  // For the purpose of this flow where we store the URL in the DB, a public URL (with obscure path) 
  // or a persistent way to access it is needed. 
  const { data: { publicUrl } } = supabase.storage
    .from('kyc-documents')
    .getPublicUrl(path);

  return publicUrl;
}
