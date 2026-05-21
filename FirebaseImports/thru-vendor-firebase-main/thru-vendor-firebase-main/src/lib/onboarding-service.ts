import type { SupabaseClient } from '@supabase/supabase-js';
import { AGREEMENT_VERSION } from '@/agreements';

export type OnboardingStepKey =
  | 'registration'
  | 'kyc'
  | 'bank'
  | 'whatsappConsent'
  | 'agreement';

export type OnboardingChecklistItem = {
  key: OnboardingStepKey;
  title: string;
  description: string;
  weightPercent: number;
  completed: boolean;
  href: string;
  severity: 'red' | 'amber' | 'none';
};

export type OnboardingSummary = {
  completionPercent: number;
  checklist: OnboardingChecklistItem[];
  hasBlockingIssues: boolean;
  agreementSigned: boolean;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isTruthy(v: unknown) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

function docHasFile(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return false;
  const d = doc as { url?: string; storagePath?: string };
  return Boolean(d.storagePath || d.url);
}

async function getKycRow(db: SupabaseClient, vendorId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db.from('vendor_kyc').select('data').eq('vendor_id', vendorId).maybeSingle();
  if (error || !data?.data) return null;
  return data.data as Record<string, unknown>;
}

export async function hasSignedAgreement(db: SupabaseClient, vendorId: string): Promise<boolean> {
  const { data, error } = await db
    .from('merchant_agreements')
    .select('id')
    .eq('merchant_id', vendorId)
    .eq('agreement_version', AGREEMENT_VERSION)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.id);
}

async function hasWhatsAppConsent(db: SupabaseClient, vendorId: string): Promise<boolean> {
  const { data, error } = await db
    .from('merchant_consents')
    .select('whatsapp_consent')
    .eq('merchant_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return data?.whatsapp_consent === true;
}

async function hasBankAccount(db: SupabaseClient, vendorId: string, vendor: Record<string, unknown> | null): Promise<boolean> {
  const { data, error } = await db
    .from('vendor_bank_accounts')
    .select('vendor_id')
    .eq('vendor_id', vendorId)
    .maybeSingle();
  if (!error && data?.vendor_id) return true;

  const bank = vendor?.bank_details as Record<string, unknown> | null | undefined;
  if (bank && isTruthy(bank.account_number) && isTruthy(bank.ifsc_code)) {
    return true;
  }
  return false;
}

export async function getOnboardingSummary(
  vendorId: string,
  db: SupabaseClient
): Promise<OnboardingSummary> {
  const { data: vendor, error: vErr } = await db.from('vendors').select('*').eq('id', vendorId).maybeSingle();
  if (vErr) throw new Error(vErr.message);

  const kyc = await getKycRow(db, vendorId);
  const [bank, whatsappConsent, agreementSigned] = await Promise.all([
    hasBankAccount(db, vendorId, vendor as Record<string, unknown> | null),
    hasWhatsAppConsent(db, vendorId),
    hasSignedAgreement(db, vendorId),
  ]);

  const registrationComplete =
    isTruthy(vendor?.name) &&
    isTruthy((vendor as { owner_name?: string })?.owner_name) &&
    isTruthy(vendor?.phone) &&
    isTruthy(vendor?.address) &&
    isTruthy(vendor?.city) &&
    ((vendor as { location?: { coordinates?: unknown[] } })?.location?.coordinates?.length ?? 0) >= 2 &&
    isTruthy((vendor as { opening_time?: string })?.opening_time) &&
    isTruthy((vendor as { closing_time?: string })?.closing_time);

  const kycComplete =
    docHasFile(kyc?.panImage) && docHasFile(kyc?.aadhaarImage) && docHasFile(kyc?.shopAct);

  const checklist: OnboardingChecklistItem[] = [
    {
      key: 'registration',
      title: 'Registration',
      description: 'Basic shop details and timings',
      weightPercent: 20,
      completed: registrationComplete,
      href: '/profile',
      severity: registrationComplete ? 'none' : 'red',
    },
    {
      key: 'kyc',
      title: 'KYC Upload',
      description: 'PAN card, Shop Act, and ID proof',
      weightPercent: 30,
      completed: kycComplete,
      href: '/kyc',
      severity: kycComplete ? 'none' : 'red',
    },
    {
      key: 'bank',
      title: 'Bank Account',
      description: 'Bank account and UPI for settlements',
      weightPercent: 25,
      completed: bank,
      href: '/bank',
      severity: bank ? 'none' : 'red',
    },
    {
      key: 'whatsappConsent',
      title: 'WhatsApp Consent',
      description: 'Granted during registration',
      weightPercent: 10,
      completed: whatsappConsent,
      href: '/whatsapp-consent',
      severity: whatsappConsent ? 'none' : 'amber',
    },
    {
      key: 'agreement',
      title: 'Agreement',
      description: agreementSigned ? 'View your signed merchant agreement' : 'Sign your merchant partner agreement',
      weightPercent: 15,
      completed: agreementSigned,
      href: agreementSigned ? '/agreements' : '/merchant/agreement',
      severity: agreementSigned ? 'none' : 'amber',
    },
  ];

  const completionPercent = clampPercent(
    checklist.reduce((sum, item) => sum + (item.completed ? item.weightPercent : 0), 0)
  );

  const hasBlockingIssues = checklist.some((i) => i.severity === 'red' && !i.completed);

  return { completionPercent, checklist, hasBlockingIssues, agreementSigned };
}
