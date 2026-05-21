import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabaseDbClient } from '@/lib/supabase-auth';
import { uploadMerchantKycDocument, type KycDocType } from '@/lib/merchant-kyc-storage';

const FIELD_MAP: Record<string, keyof { panImage: string; aadhaarImage: string; shopAct: string }> = {
  pan: 'panImage',
  aadhaar: 'aadhaarImage',
  shopAct: 'shopAct',
};

export async function GET() {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getSupabaseDbClient();
  const { data, error } = await sb.from('vendor_kyc').select('data').eq('vendor_id', session.uid).maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: data?.data ?? {} });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const docType = String(form.get('docType') || '') as KycDocType;
  const file = form.get('file');

  if (!['pan', 'aadhaar', 'shopAct'].includes(docType)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 10 MB' }, { status: 400 });
  }

  try {
    const stored = await uploadMerchantKycDocument(session.uid, docType, file);
    const sb = getSupabaseDbClient();
    const fieldKey = FIELD_MAP[docType];

    const { data: existing } = await sb.from('vendor_kyc').select('data').eq('vendor_id', session.uid).maybeSingle();
    const merged = { ...(existing?.data as object | null), [fieldKey]: stored };

    const { error: upsertErr } = await sb.from('vendor_kyc').upsert(
      {
        vendor_id: session.uid,
        data: merged,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'vendor_id' }
    );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, document: stored, field: fieldKey });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
