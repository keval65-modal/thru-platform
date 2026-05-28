import { getSupabaseServiceDbClient, isSupabaseServiceRoleConfigured } from '@/lib/supabase-auth';
import { normalizePhoneE164 } from '@/lib/phone-e164';
import { sendTemplateMessage } from '@/services/whatsapp/sendTemplateMessage';
import {
  defaultTemplateLanguage,
  extractMetaMessageId,
  isMetaConfigured,
  welcomeTemplateParameters,
} from '@/services/whatsapp/waba-utils';

/** WABA-approved template sent once after phone verification at signup (and retry after sign if failed). */
const WELCOME_TEMPLATE = 'merchant_welcome';

/**
 * After successful phone OTP + vendor profile creation: send `merchant_welcome` once,
 * only when `vendors.phone_verified` is true (unless skipPhoneVerifiedCheck).
 * Reserves a DB row first to prevent duplicates. Does not throw; logs errors.
 */
export async function sendMerchantWelcomeAfterVerification(input: {
  merchantId: string;
  phoneE164: string;
  ownerName: string;
  /** Set when signup just verified OTP — avoids false skip if phone_verified column lags. */
  skipPhoneVerifiedCheck?: boolean;
  /** When false, do not send (merchant did not opt in). */
  whatsappConsent?: boolean;
}): Promise<void> {
  const phoneE164 = normalizePhoneE164(input.phoneE164);

  console.log('[merchant-welcome] Start', {
    merchantId: input.merchantId,
    phoneSuffix: phoneE164.slice(-4),
    template: WELCOME_TEMPLATE,
    metaConfigured: isMetaConfigured(),
    serviceRole: isSupabaseServiceRoleConfigured(),
  });

  if (input.whatsappConsent === false) {
    console.warn('[merchant-welcome] Skip: merchant did not consent to WhatsApp');
    return;
  }

  if (!isMetaConfigured()) {
    console.error(
      '[merchant-welcome] Skip: META_ACCESS_TOKEN or META_PHONE_NUMBER_ID missing on server'
    );
    return;
  }

  const db = getSupabaseServiceDbClient();
  if (!db) {
    console.error(
      '[merchant-welcome] Skip: SUPABASE_SERVICE_ROLE_KEY missing — cannot log sends or verify vendor'
    );
    return;
  }

  try {
    if (!input.skipPhoneVerifiedCheck) {
      const { data: vendor, error: vErr } = await db
        .from('vendors')
        .select('id, phone_verified')
        .eq('id', input.merchantId)
        .maybeSingle();

      if (vErr) {
        console.error('[merchant-welcome] Failed to load vendor:', vErr.message);
        return;
      }
      if (vendor && vendor.phone_verified === false) {
        console.warn('[merchant-welcome] Skip: phone_verified is false for merchant', input.merchantId);
        return;
      }
    }

    let rowId: string | null = null;
    const { data: reserved, error: insErr } = await db
      .from('whatsapp_messages')
      .insert({
        merchant_id: input.merchantId,
        phone_number: phoneE164,
        template_name: WELCOME_TEMPLATE,
        status: 'pending',
        meta_message_id: null,
        api_response: null,
      })
      .select('id')
      .maybeSingle();

    if (insErr?.code === '23505') {
      const { data: prior } = await db
        .from('whatsapp_messages')
        .select('id, status')
        .eq('merchant_id', input.merchantId)
        .eq('template_name', WELCOME_TEMPLATE)
        .maybeSingle();

      if (prior?.id && (prior.status === 'failed' || prior.status === 'pending')) {
        rowId = prior.id as string;
        await db
          .from('whatsapp_messages')
          .update({ status: 'pending', meta_message_id: null, api_response: null })
          .eq('id', rowId);
        console.log('[merchant-welcome] Retrying prior row', {
          merchantId: input.merchantId,
          priorStatus: prior.status,
        });
      } else {
        console.warn('[merchant-welcome] Skip duplicate: welcome already recorded for merchant', input.merchantId);
        return;
      }
    } else if (insErr) {
      console.warn('[merchant-welcome] whatsapp_messages insert failed (continuing send):', insErr.message);
    } else if (reserved?.id) {
      rowId = reserved.id as string;
    }

    let result: Awaited<ReturnType<typeof sendTemplateMessage>>;
    try {
      result = await sendTemplateMessage({
        to: phoneE164,
        templateName: WELCOME_TEMPLATE,
        languageCode: defaultTemplateLanguage(),
        parameters: welcomeTemplateParameters(input.ownerName),
      });
    } catch (sendErr: unknown) {
      const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error('[merchant-welcome] sendTemplateMessage threw:', msg);
      if (rowId) {
        await db
          .from('whatsapp_messages')
          .update({
            status: 'failed',
            meta_message_id: null,
            api_response: { error: { message: msg } } as object,
          })
          .eq('id', rowId);
      }
      return;
    }

    const metaId = result.ok ? extractMetaMessageId(result.data) : null;
    const status = result.ok ? 'sent' : 'failed';

    if (rowId) {
      const { error: upErr } = await db
        .from('whatsapp_messages')
        .update({
          status,
          meta_message_id: metaId,
          api_response: result.data as object,
        })
        .eq('id', rowId);

      if (upErr) {
        console.error('[merchant-welcome] Failed to update whatsapp_messages:', upErr.message, { rowId });
      }
    }

    if (!result.ok) {
      console.error('[merchant-welcome] Template send failed', {
        merchantId: input.merchantId,
        httpStatus: result.status,
        locale: result.languageCode,
        data: result.data,
      });
    } else {
      console.log('[merchant-welcome] Sent', {
        merchantId: input.merchantId,
        metaMessageId: metaId,
        locale: result.languageCode,
      });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[merchant-welcome] Unexpected error:', msg);
  }
}

/** True when welcome was never successfully sent (missing, pending, or failed). */
export async function merchantWelcomeNeedsRetry(merchantId: string): Promise<boolean> {
  const db = getSupabaseServiceDbClient();
  if (!db) return false;

  const { data, error } = await db
    .from('whatsapp_messages')
    .select('status')
    .eq('merchant_id', merchantId)
    .eq('template_name', WELCOME_TEMPLATE)
    .maybeSingle();

  if (error) {
    console.warn('[merchant-welcome] Could not read prior welcome row:', error.message);
    return true;
  }
  if (!data) return true;
  return data.status === 'pending' || data.status === 'failed';
}
