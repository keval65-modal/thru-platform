import { getSupabaseDbClient } from '@/lib/supabase-auth';

export type VendorBankInput = {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string | null;
  upiId?: string | null;
};

export function hasCompleteBankInput(bank: Partial<VendorBankInput>): boolean {
  return !!(
    bank.accountHolderName?.trim() &&
    bank.accountNumber?.trim() &&
    bank.ifscCode?.trim() &&
    bank.bankName?.trim()
  );
}

/** Persist payout details to vendor_bank_accounts (primary store). */
export async function saveVendorBankAccount(
  vendorId: string,
  bank: VendorBankInput
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabaseDbClient();

  const payload = {
    vendor_id: vendorId,
    account_holder_name: bank.accountHolderName.trim(),
    account_number: bank.accountNumber.trim(),
    ifsc_code: bank.ifscCode.trim().toUpperCase(),
    bank_name: bank.bankName.trim(),
    upi_id: bank.upiId?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from('vendor_bank_accounts').upsert(payload, { onConflict: 'vendor_id' });
  if (error) {
    return { success: false, error: error.message };
  }

  // Optional legacy JSON column — ignore if not migrated yet
  const bankDetails = {
    account_holder_name: payload.account_holder_name,
    account_number: payload.account_number,
    ifsc_code: payload.ifsc_code,
    bank_name: payload.bank_name,
    branch_name: bank.branchName?.trim() || null,
    upi_id: payload.upi_id,
  };

  const { error: legacyErr } = await sb
    .from('vendors')
    .update({ bank_details: bankDetails, updated_at: new Date().toISOString() })
    .eq('id', vendorId);

  if (legacyErr && !legacyErr.message.includes('bank_details')) {
    console.warn('[vendor-bank] Legacy bank_details sync skipped:', legacyErr.message);
  }

  return { success: true };
}
