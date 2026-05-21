import { getSupabaseDbClient } from '@/lib/supabase-auth';
import { normalizePhoneE164 } from '@/lib/phone-e164';
import { sendTemplateMessage } from '@/services/whatsapp/sendTemplateMessage';
import type { MetaWhatsAppMessagesResponse } from '@/services/whatsapp/sendTemplateMessage';

const WELCOME_TEMPLATE = 'merchant_welcome';

function defaultTemplateLanguage(): string {
  return process.env.META_WHATSAPP_DEFAULT_LOCALE?.trim() || 'en_US';
}

function merchantOnboardingUrl(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (!base) {
    return '/merchant/agreement';
  }
  return `${base}/merchant/agreement`;
}

function ownerFirstName(ownerName: string): string {
  const t = ownerName.trim();
  if (!t) return 'Merchant';
  return t.split(/\s+/)[0] ?? t;
}

function extractMetaMessageId(data: MetaWhatsAppMessagesResponse | Record<string, unknown>): string | null {
  const messages = (data as MetaWhatsAppMessagesResponse).messages;
  if (Array.isArray(messages) && messages[0]?.id) {
    return messages[0].id;
  }
  return null;
}

/**
 * After successful phone OTP + vendor profile creation: send `merchant_welcome` once,
 * only when `vendors.phone_verified` is true. Reserves a DB row first to prevent duplicates.
 * Does not throw; logs errors.
 */
export async function sendMerchantWelcomeAfterVerification(input: {
  merchantId: string;
  phoneE164: string;
  ownerName: string;
}): Promise<void> {
  const db = getSupabaseDbClient();
  const phoneE164 = normalizePhoneE164(input.phoneE164);

  try {
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

      if (prior?.status === 'failed' && prior.id) {
        rowId = prior.id as string;
        await db
          .from('whatsapp_messages')
          .update({ status: 'pending', meta_message_id: null, api_response: null })
          .eq('id', rowId);
      } else {
        console.warn('[merchant-welcome] Skip duplicate: welcome already recorded for merchant', input.merchantId);
        return;
      }
    }
    if (insErr) {
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
        parameters: [ownerFirstName(input.ownerName), merchantOnboardingUrl()],
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
        data: result.data,
      });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[merchant-welcome] Unexpected error:', msg);
  }
}
