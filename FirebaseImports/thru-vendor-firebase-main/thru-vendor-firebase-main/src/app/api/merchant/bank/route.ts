import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getSupabaseDbClient } from '@/lib/supabase-auth';
import { isValidIfscFormat } from '@/lib/ifsc';
import { normalizeAccountNumber } from '@/lib/bank-account';
import { saveVendorBankAccount } from '@/lib/vendor-bank';

const bankSchema = z
  .object({
    accountHolderName: z.string().min(2),
    accountNumber: z.string().min(6),
    confirmAccountNumber: z.string().min(6),
    ifscCode: z.string().min(5),
    bankName: z.string().min(2),
    upiId: z.string().optional(),
    branchName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const accountNumber = normalizeAccountNumber(data.accountNumber);
    const confirmAccountNumber = normalizeAccountNumber(data.confirmAccountNumber);
    if (!confirmAccountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmAccountNumber'],
        message: 'Please re-enter your account number in the confirm field.',
      });
    } else if (accountNumber !== confirmAccountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmAccountNumber'],
        message: 'Account numbers do not match.',
      });
    }
    if (!isValidIfscFormat(data.ifscCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ifscCode'],
        message: 'Invalid IFSC format (e.g. SBIN0001234).',
      });
    }
  });

export async function GET() {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getSupabaseDbClient();
  const { data: row } = await sb
    .from('vendor_bank_accounts')
    .select('*')
    .eq('vendor_id', session.uid)
    .maybeSingle();

  let legacyBankDetails = null;
  const { data: vendor, error: vendorErr } = await sb
    .from('vendors')
    .select('bank_details')
    .eq('id', session.uid)
    .maybeSingle();

  if (!vendorErr) {
    legacyBankDetails = vendor?.bank_details ?? null;
  }

  return NextResponse.json({
    bankAccount: row ?? null,
    legacyBankDetails,
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

  const result = await saveVendorBankAccount(session.uid, {
    accountHolderName,
    accountNumber,
    ifscCode,
    bankName,
    branchName: branchName?.trim() || null,
    upiId: upiId?.trim() || null,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
