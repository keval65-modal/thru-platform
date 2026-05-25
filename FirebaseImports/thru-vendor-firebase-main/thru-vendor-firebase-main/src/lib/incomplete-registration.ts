import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AGREEMENT_VERSION } from '@/agreements';
import { VENDOR_IMAGES_BUCKET } from '@/lib/supabase-auth';

function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** True when merchant_agreements has a row for the current agreement version. */
export async function merchantHasSignedAgreement(
  db: SupabaseClient,
  merchantId: string
): Promise<boolean> {
  const { data } = await db
    .from('merchant_agreements')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('agreement_version', AGREEMENT_VERSION)
    .maybeSingle();
  return Boolean(data?.id);
}

/**
 * Remove a signup that never completed the merchant agreement (auth user + vendor + related rows).
 * No-op if agreement is already signed.
 */
export async function deleteIncompleteRegistration(merchantId: string): Promise<{
  deleted: boolean;
  reason?: string;
}> {
  const admin = getAdminClient();
  if (!admin) {
    console.error('[incomplete-registration] Missing Supabase service role');
    return { deleted: false, reason: 'server_config' };
  }

  if (await merchantHasSignedAgreement(admin, merchantId)) {
    return { deleted: false, reason: 'agreement_already_signed' };
  }

  const { data: shopFiles } = await admin.storage
    .from(VENDOR_IMAGES_BUCKET)
    .list(`vendor_shop_images/${merchantId}`);
  if (shopFiles?.length) {
    await admin.storage
      .from(VENDOR_IMAGES_BUCKET)
      .remove(shopFiles.map((f) => `vendor_shop_images/${merchantId}/${f.name}`))
      .catch(() => {});
  }

  const { data: agreementFiles } = await admin.storage.from('merchant-agreements').list(merchantId);
  if (agreementFiles?.length) {
    await admin.storage
      .from('merchant-agreements')
      .remove(agreementFiles.map((f) => `${merchantId}/${f.name}`))
      .catch(() => {});
  }

  const { error: vendorErr } = await admin.from('vendors').delete().eq('id', merchantId);
  if (vendorErr) {
    console.error('[incomplete-registration] vendors delete failed:', vendorErr.message);
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(merchantId);
  if (authErr) {
    console.error('[incomplete-registration] auth delete failed:', authErr.message);
    return { deleted: false, reason: authErr.message };
  }

  console.log('[incomplete-registration] Removed incomplete signup for', merchantId);
  return { deleted: true };
}

/** Find auth user id by normalized phone (service role). */
export async function findAuthUserIdByPhone(phoneE164: string): Promise<string | null> {
  const admin = getAdminClient();
  if (!admin) return null;

  const normalized = phoneE164.replace(/[\s-]/g, '');
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error || !data?.users) return null;

  const match = data.users.find((u) => {
    if (!u.phone) return false;
    const userPhone = u.phone.replace(/[\s-]/g, '');
    return (
      userPhone === normalized ||
      userPhone === normalized.replace(/^\+/, '') ||
      `+${userPhone}` === normalized ||
      userPhone.replace(/^91/, '+91') === normalized
    );
  });
  return match?.id ?? null;
}
