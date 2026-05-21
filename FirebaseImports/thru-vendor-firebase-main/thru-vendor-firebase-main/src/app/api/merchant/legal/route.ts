import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabaseDbClient } from '@/lib/supabase-auth';

export async function GET() {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseDbClient();
  const merchantId = session.uid;

  const { data: agreement } = await supabase
    .from('merchant_agreements')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: consents } = await supabase
    .from('merchant_consents')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(5);

  let downloadUrl: string | null = null;
  if (agreement?.pdf_url) {
    const { data: signed, error: signErr } = await supabase.storage
      .from('merchant-agreements')
      .createSignedUrl(agreement.pdf_url as string, 60 * 30);
    if (!signErr && signed?.signedUrl) {
      downloadUrl = signed.signedUrl;
    }
  }

  return NextResponse.json({
    agreement: agreement || null,
    consents: consents || [],
    downloadUrl,
  });
}
