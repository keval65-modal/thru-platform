import { getSupabaseDbClient } from '@/lib/supabase-auth';

export const MERCHANT_KYC_BUCKET = 'merchant-kyc';

export type KycDocType = 'pan' | 'aadhaar' | 'shopAct';

export type StoredKycDocument = {
  id: string;
  type: KycDocType;
  storagePath: string;
  filename: string;
  uploadedAt: string;
};

export async function uploadMerchantKycDocument(
  merchantId: string,
  docType: KycDocType,
  file: File
): Promise<StoredKycDocument> {
  const sb = getSupabaseDbClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const storagePath = `${merchantId}/${docType}_${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await sb.storage.from(MERCHANT_KYC_BUCKET).upload(storagePath, buffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: true,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return {
    id: `${docType}-${Date.now()}`,
    type: docType,
    storagePath,
    filename: file.name,
    uploadedAt: new Date().toISOString(),
  };
}

export async function signedKycUrl(storagePath: string, expiresInSeconds = 3600): Promise<string | null> {
  const sb = getSupabaseDbClient();
  const { data, error } = await sb.storage
    .from(MERCHANT_KYC_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
