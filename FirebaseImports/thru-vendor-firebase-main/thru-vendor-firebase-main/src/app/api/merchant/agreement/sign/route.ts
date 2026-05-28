import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSession } from '@/lib/auth';
import { getSupabaseDbClient } from '@/lib/supabase-auth';
import {
  AGREEMENT_VERSION,
  buildAgreementForLanguage,
  resolveAgreementLanguage,
} from '@/agreements';
import { buildCanonicalAgreementString } from '@/lib/agreement-canon';
import { generateAgreementPdfFromTemplate } from '@/lib/agreement-pdf-lib';
import { signatureMatchesLegalName } from '@/lib/agreement-signing-utils';
import { normalizePhoneE164 } from '@/lib/phone-e164';
import { sendMerchantOnboardingComplete } from '@/services/whatsapp/sendMerchantOnboardingComplete';
import {
  merchantWelcomeNeedsRetry,
  sendMerchantWelcomeAfterVerification,
} from '@/services/whatsapp/sendMerchantWelcomeAfterVerification';

export const runtime = 'nodejs';
export const maxDuration = 120;

function clientIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  return req.headers.get('x-real-ip') || null;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const merchantId = session.uid;
  const ip = clientIp(req) || '';
  const userAgent = req.headers.get('user-agent') || '';

  let body: { confirmedRead?: boolean; signedName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const signedName = (body.signedName || '').trim();
  if (!body.confirmedRead) {
    return NextResponse.json({ error: 'You must confirm that you have read the agreement.' }, { status: 400 });
  }
  if (!signedName) {
    return NextResponse.json({ error: 'Typed signature is required.' }, { status: 400 });
  }

  const supabase = getSupabaseDbClient();

  const { data: existing } = await supabase
    .from('merchant_agreements')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('agreement_version', AGREEMENT_VERSION)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Agreement already signed for this version.' }, { status: 409 });
  }

  const { data: vendor, error: vErr } = await supabase
    .from('vendors')
    .select('id, owner_name, name, phone, address, preferred_language')
    .eq('id', merchantId)
    .single();

  if (vErr || !vendor) {
    return NextResponse.json({ error: 'Merchant profile not found.' }, { status: 404 });
  }

  const ownerName = String(vendor.owner_name || '').trim();
  if (!signatureMatchesLegalName(ownerName, signedName)) {
    await supabase.from('agreement_audit_logs').insert({
      merchant_id: merchantId,
      action: 'agreement_sign_rejected',
      details: { reason: 'signature_mismatch' },
      ip_address: ip,
      user_agent: userAgent,
    });
    return NextResponse.json(
      { error: 'Typed name must closely match your registered owner name.' },
      { status: 400 }
    );
  }

  const lang = resolveAgreementLanguage(vendor.preferred_language);
  const phone = String(vendor.phone || '');
  const address = String(vendor.address || '');
  const shopName = String(vendor.name || '');
  const signedAt = new Date();
  const signedAtIso = signedAt.toISOString();
  const dateFormatted = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'Asia/Kolkata' }).format(
    signedAt
  );
  const signedAtDisplay = signedAt.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const vars = {
    ownerName,
    shopName,
    phone,
    address,
    dateFormatted,
  };

  const template = buildAgreementForLanguage(lang, vars);
  const canonical = buildCanonicalAgreementString({
    agreementVersion: AGREEMENT_VERSION,
    language: lang,
    vars,
    template,
    signedName,
    signedAtIso,
    whatsappConsentConfirmed: true,
  });
  const agreementHash = createHash('sha256').update(canonical, 'utf8').digest('hex');

  const langLabel = lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : 'English';

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateAgreementPdfFromTemplate({
      template,
      vars,
      signedName,
      signedAtDisplay,
      languageLabel: langLabel,
      agreementLanguage: lang,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error('[agreement/sign] PDF generation failed:', message, stack);
    await supabase.from('agreement_audit_logs').insert({
      merchant_id: merchantId,
      action: 'agreement_pdf_failed',
      details: { message, language: lang, stack: stack?.slice(0, 500) },
      ip_address: ip,
      user_agent: userAgent,
    });
    const hint =
      message.includes('Devanagari fonts not found') || message.includes('ENOENT')
        ? ' Server deployment is missing Hindi font files — redeploy the latest build.'
        : '';
    return NextResponse.json(
      { error: `Failed to generate agreement PDF. Please try again.${hint}` },
      { status: 500 }
    );
  }

  const objectPath = `${merchantId}/agreement_${AGREEMENT_VERSION}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('merchant-agreements')
    .upload(objectPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('[agreement/sign] Storage upload failed:', uploadError.message);
    await supabase.from('agreement_audit_logs').insert({
      merchant_id: merchantId,
      action: 'agreement_upload_failed',
      details: { message: uploadError.message },
      ip_address: ip,
      user_agent: userAgent,
    });
    return NextResponse.json({ error: 'Failed to store agreement PDF.' }, { status: 500 });
  }

  const { error: insertErr } = await supabase.from('merchant_agreements').insert({
    merchant_id: merchantId,
    agreement_version: AGREEMENT_VERSION,
    language: lang,
    signed_name: signedName,
    signed_at: signedAtIso,
    ip_address: ip,
    pdf_url: objectPath,
    agreement_hash: agreementHash,
  });

  if (insertErr) {
    console.error('[agreement/sign] DB insert failed:', insertErr.message);
    await supabase.storage.from('merchant-agreements').remove([objectPath]).catch(() => {});
    return NextResponse.json({ error: 'Failed to save agreement record.' }, { status: 500 });
  }

  const { error: activateErr } = await supabase
    .from('vendors')
    .update({
      is_active: true,
      is_active_on_thru: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', merchantId);

  if (activateErr) {
    console.error('[agreement/sign] Failed to activate vendor:', activateErr.message);
  }

  await supabase.from('agreement_audit_logs').insert({
    merchant_id: merchantId,
    action: 'agreement_signed',
    details: {
      agreementVersion: AGREEMENT_VERSION,
      language: lang,
      agreementHash,
      pdfPath: objectPath,
    },
    ip_address: ip,
    user_agent: userAgent,
  });

  const phoneE164 = normalizePhoneE164(phone);

  try {
    if (await merchantWelcomeNeedsRetry(merchantId)) {
      console.log('[agreement/sign] Retrying merchant_welcome WhatsApp (awaiting)...', { merchantId });
      await sendMerchantWelcomeAfterVerification({
        merchantId,
        phoneE164,
        ownerName,
        skipPhoneVerifiedCheck: true,
      });
      console.log('[agreement/sign] merchant_welcome WhatsApp finished');
    }
  } catch (e: unknown) {
    console.warn(
      '[agreement/sign] merchant_welcome WhatsApp task failed:',
      e instanceof Error ? e.message : e
    );
  }

  console.log('[agreement/sign] Sending merchant_onboarding_complete WhatsApp (awaiting)...', {
    merchantId,
  });
  try {
    await sendMerchantOnboardingComplete({
      merchantId,
      phoneE164,
      ownerName,
    });
    console.log('[agreement/sign] onboarding-complete WhatsApp finished');
  } catch (e: unknown) {
    console.warn(
      '[agreement/sign] onboarding-complete WhatsApp task failed:',
      e instanceof Error ? e.message : e
    );
  }

  return NextResponse.json({ success: true, redirect: '/dashboard' });
}
