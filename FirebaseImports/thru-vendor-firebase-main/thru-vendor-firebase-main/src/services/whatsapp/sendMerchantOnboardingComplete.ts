import { getSupabaseDbClient } from '@/lib/supabase-auth';
import { normalizePhoneE164 } from '@/lib/phone-e164';
import { sendTemplateMessage } from '@/services/whatsapp/sendTemplateMessage';
import {
  appUrl,
  defaultTemplateLanguage,
  extractMetaMessageId,
  ownerFirstName,
} from '@/services/whatsapp/waba-utils';

/** WABA-approved template sent once after merchant signs the partner agreement. */
const ONBOARDING_COMPLETE_TEMPLATE = 'merchant_onboarding_complete';

function onboardingCompleteTemplateName(): string {
  return (
    process.env.META_WHATSAPP_ONBOARDING_COMPLETE_TEMPLATE?.trim() ||
    ONBOARDING_COMPLETE_TEMPLATE
  );
}

/**
 * Body variables for the onboarding-complete template (order must match Meta approval).
 * Default: single {{1}} = merchant first name. Set META_WHATSAPP_ONBOARDING_COMPLETE_INCLUDE_URL=true
 * for two variables: name + dashboard URL.
 */
function onboardingCompleteParameters(ownerName: string): string[] {
  const first = ownerFirstName(ownerName);
  if (process.env.META_WHATSAPP_ONBOARDING_COMPLETE_INCLUDE_URL === 'true') {
    return [first, appUrl('/dashboard')];
  }
  return [first];
}

/**
 * After agreement sign: send the WABA-approved onboarding-complete template once per merchant.
 * Logs to whatsapp_messages; does not throw.
 */
export async function sendMerchantOnboardingComplete(input: {
  merchantId: string;
  phoneE164: string;
  ownerName: string;
}): Promise<void> {
  const db = getSupabaseDbClient();
  const phoneE164 = normalizePhoneE164(input.phoneE164);
  const templateName = onboardingCompleteTemplateName();

  console.log('[merchant-onboarding-complete] Start', {
    merchantId: input.merchantId,
    phoneSuffix: phoneE164.slice(-4),
    template: templateName,
  });

  try {
    let rowId: string | null = null;
    const { data: reserved, error: insErr } = await db
      .from('whatsapp_messages')
      .insert({
        merchant_id: input.merchantId,
        phone_number: phoneE164,
        template_name: templateName,
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
        .eq('template_name', templateName)
        .maybeSingle();

      if (prior?.id && (prior.status === 'failed' || prior.status === 'pending')) {
        rowId = prior.id as string;
        await db
          .from('whatsapp_messages')
          .update({ status: 'pending', meta_message_id: null, api_response: null })
          .eq('id', rowId);
        console.log('[merchant-onboarding-complete] Retrying prior row', {
          merchantId: input.merchantId,
          priorStatus: prior.status,
        });
      } else {
        console.warn(
          '[merchant-onboarding-complete] Skip duplicate for merchant',
          input.merchantId
        );
        return;
      }
    }
    if (insErr) {
      console.warn(
        '[merchant-onboarding-complete] whatsapp_messages insert failed (continuing send):',
        insErr.message
      );
    } else if (reserved?.id) {
      rowId = reserved.id as string;
    }

    let result: Awaited<ReturnType<typeof sendTemplateMessage>>;
    try {
      result = await sendTemplateMessage({
        to: phoneE164,
        templateName,
        languageCode: defaultTemplateLanguage(),
        parameters: onboardingCompleteParameters(input.ownerName),
      });
    } catch (sendErr: unknown) {
      const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error('[merchant-onboarding-complete] sendTemplateMessage threw:', msg);
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
        console.error('[merchant-onboarding-complete] Failed to update whatsapp_messages:', upErr.message);
      }
    }

    if (!result.ok) {
      console.error('[merchant-onboarding-complete] Template send failed', {
        merchantId: input.merchantId,
        templateName,
        httpStatus: result.status,
        data: result.data,
      });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[merchant-onboarding-complete] Unexpected error:', msg);
  }
}
