'use server';

import { getSession } from '@/lib/auth';
import { getSupabaseDbClient } from '@/lib/supabase-auth';
import { signedKycUrl } from '@/lib/merchant-kyc-storage';

export type AdminMerchantRow = {
  id: string;
  name: string | null;
  owner_name: string | null;
  phone: string | null;
  preferred_language: string | null;
};

async function assertAdmin() {
  const s = await getSession();
  if (!s.isAuthenticated || s.role !== 'admin') {
    throw new Error('Unauthorized');
  }
  return s;
}

export async function adminSearchMerchants(query: string): Promise<AdminMerchantRow[]> {
  await assertAdmin();
  const sb = getSupabaseDbClient();
  const { data, error } = await sb
    .from('vendors')
    .select('id, name, owner_name, phone, preferred_language')
    .order('name', { ascending: true })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }
  const rows = (data as AdminMerchantRow[]) ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return rows.slice(0, 40);
  return rows
    .filter((r) => {
      const blob = `${r.name || ''} ${r.owner_name || ''} ${r.phone || ''}`.toLowerCase();
      return blob.includes(q);
    })
    .slice(0, 60);
}

export async function adminGetMerchantLegalBundle(merchantId: string) {
  await assertAdmin();
  const sb = getSupabaseDbClient();

  const [{ data: vendor }, { data: agreement }, { data: consents }, { data: audits }, { data: whatsappSends }] =
    await Promise.all([
      sb.from('vendors').select('id, name, owner_name, phone, preferred_language').eq('id', merchantId).maybeSingle(),
      sb.from('merchant_agreements').select('*').eq('merchant_id', merchantId).maybeSingle(),
      sb
        .from('merchant_consents')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(25),
      sb
        .from('agreement_audit_logs')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(40),
      sb
        .from('whatsapp_messages')
        .select('id, template_name, status, meta_message_id, phone_number, api_response, created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

  let downloadUrl: string | null = null;
  if (agreement?.pdf_url) {
    const { data: signed } = await sb.storage
      .from('merchant-agreements')
      .createSignedUrl(agreement.pdf_url as string, 60 * 60);
    downloadUrl = signed?.signedUrl ?? null;
  }

  const { data: kycRow } = await sb.from('vendor_kyc').select('data').eq('vendor_id', merchantId).maybeSingle();
  const kycData = (kycRow?.data as Record<string, { storagePath?: string; filename?: string; type?: string }>) ?? {};
  const kycDocuments: { label: string; filename: string; url: string | null }[] = [];
  const docEntries = [
    { key: 'panImage', label: 'PAN card' },
    { key: 'aadhaarImage', label: 'ID proof' },
    { key: 'shopAct', label: 'Shop Act' },
  ] as const;
  for (const { key, label } of docEntries) {
    const doc = kycData[key];
    if (doc?.storagePath) {
      kycDocuments.push({
        label,
        filename: doc.filename || key,
        url: await signedKycUrl(doc.storagePath, 60 * 60),
      });
    }
  }

  return {
    vendor,
    agreement,
    consents: consents ?? [],
    audits: audits ?? [],
    whatsappSends: whatsappSends ?? [],
    downloadUrl,
    kycDocuments,
  };
}
