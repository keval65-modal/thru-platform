import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getSupabaseDbClient } from '@/lib/supabase-auth';

const bankSchema = z.object({
  accountHolderName: z.string().min(2),
  accountNumber: z.string().min(6),
  ifscCode: z.string().min(5),
  bankName: z.string().min(2),
  upiId: z.string().optional(),
  branchName: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getSupabaseDbClient();
  const [{ data: row }, { data: vendor }] = await Promise.all([
    sb.from('vendor_bank_accounts').select('*').eq('vendor_id', session.uid).maybeSingle(),
    sb.from('vendors').select('bank_details').eq('id', session.uid).maybeSingle(),
  ]);

  return NextResponse.json({
    bankAccount: row ?? null,
    legacyBankDetails: vendor?.bank_details ?? null,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bankSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid bank details', fields: parsed.error.flatten() }, { status: 400 });
  }

  const { accountHolderName, accountNumber, ifscCode, bankName, upiId, branchName } = parsed.data;
  const sb = getSupabaseDbClient();

  const payload = {
    vendor_id: session.uid,
    account_holder_name: accountHolderName,
    account_number: accountNumber,
    ifsc_code: ifscCode.toUpperCase(),
    bank_name: bankName,
    upi_id: upiId?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error: bankErr } = await sb.from('vendor_bank_accounts').upsert(payload, { onConflict: 'vendor_id' });
  if (bankErr) {
    return NextResponse.json({ error: bankErr.message }, { status: 500 });
  }

  const bankDetails = {
    account_holder_name: accountHolderName,
    account_number: accountNumber,
    ifsc_code: ifscCode.toUpperCase(),
    bank_name: bankName,
    branch_name: branchName?.trim() || null,
    upi_id: upiId?.trim() || null,
  };

  await sb
    .from('vendors')
    .update({ bank_details: bankDetails, updated_at: new Date().toISOString() })
    .eq('id', session.uid);

  return NextResponse.json({ success: true });
}
