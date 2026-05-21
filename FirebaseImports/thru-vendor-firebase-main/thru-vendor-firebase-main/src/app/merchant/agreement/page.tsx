import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSupabaseDbClient } from '@/lib/supabase-auth';
import { AGREEMENT_VERSION } from '@/agreements';
import { MerchantAgreementClient } from '@/components/merchant/MerchantAgreementClient';

export default async function MerchantAgreementPage() {
  const session = await getSession();
  if (!session.isAuthenticated) {
    redirect('/login');
  }

  const supabase = getSupabaseDbClient();
  const { data: row, error } = await supabase
    .from('vendors')
    .select('owner_name, name, phone, address, preferred_language')
    .eq('id', session.uid)
    .single();

  if (error || !row) {
    redirect('/login');
  }

  const { data: existing } = await supabase
    .from('merchant_agreements')
    .select('id')
    .eq('merchant_id', session.uid)
    .eq('agreement_version', AGREEMENT_VERSION)
    .maybeSingle();

  if (existing) {
    redirect('/dashboard');
  }

  return (
    <MerchantAgreementClient
      ownerName={String(row.owner_name || '')}
      shopName={String(row.name || '')}
      phone={String(row.phone || '')}
      address={String(row.address || '')}
      preferredLanguage={row.preferred_language}
    />
  );
}
