/**
 * WhatsApp after merchant agreement is signed — uses approved template via Cloud API.
 */
import { getSupabaseDbClient } from '@/lib/supabase-auth';
import { sendTemplateMessage } from '@/services/whatsapp/sendTemplateMessage';
import type { MetaWhatsAppMessagesResponse } from '@/services/whatsapp/sendTemplateMessage';

export type MetaWhatsAppSendResult = { success: boolean; error?: string; messageId?: string };

const DEFAULT_TEMPLATE = 'merchant_welcome';

function templateName(): string {
  return (
    process.env.META_WHATSAPP_ONBOARDING_COMPLETE_TEMPLATE?.trim() ||
    process.env.META_WHATSAPP_SIGNED_TEMPLATE?.trim() ||
    DEFAULT_TEMPLATE
  );
}

function defaultTemplateLanguage(): string {
  return process.env.META_WHATSAPP_DEFAULT_LOCALE?.trim() || 'en_US';
}

function ownerFirstName(ownerName: string): string {
  const t = ownerName.trim();
  if (!t) return 'Merchant';
  return t.split(/\s+/)[0] ?? t;
}

function merchantDashboardUrl(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  return base ? `${base}/dashboard` : '/dashboard';
}

function extractMetaMessageId(data: MetaWhatsAppMessagesResponse | Record<string, unknown>): string | null {
  const messages = (data as MetaWhatsAppMessagesResponse).messages;
  if (Array.isArray(messages) && messages[0]?.id) {
    return messages[0].id;
  }
  return null;
}

export async function sendMetaOnboardingConfirmation(input: {
  merchantId: string;
  phoneE164: string;
  ownerName: string;
}): Promise<MetaWhatsAppSendResult> {
  const template = templateName();
  const db = getSupabaseDbClient();

  let rowId: string | null = null;
  try {
    const { data: reserved, error: insErr } = await db
      .from('whatsapp_messages')
      .insert({
        merchant_id: input.merchantId,
        phone_number: input.phoneE164,
        template_name: template,
        status: 'pending',
        meta_message_id: null,
        api_response: null,
      })
      .select('id')
      .maybeSingle();

    if (insErr?.code === '23505') {
      console.warn('[meta-whatsapp] Skip duplicate onboarding-complete message for', input.merchantId);
      return { success: false, error: 'duplicate' };
    }
    if (insErr) {
      console.warn('[meta-whatsapp] whatsapp_messages insert failed (continuing send):', insErr.message);
    } else if (reserved?.id) {
      rowId = reserved.id as string;
    }
  } catch (e: unknown) {
    console.warn('[meta-whatsapp] whatsapp_messages logging exception:', e instanceof Error ? e.message : e);
  }

  const parameters =
    template === 'merchant_welcome'
      ? [ownerFirstName(input.ownerName), merchantDashboardUrl()]
      : [ownerFirstName(input.ownerName)];

  const result = await sendTemplateMessage({
    to: input.phoneE164,
    templateName: template,
    languageCode: defaultTemplateLanguage(),
    parameters,
  });

  const metaId = result.ok ? extractMetaMessageId(result.data) : null;

  if (rowId) {
    await db
      .from('whatsapp_messages')
      .update({
        status: result.ok ? 'sent' : 'failed',
        meta_message_id: metaId,
        api_response: result.data as object,
      })
      .eq('id', rowId)
      .then(({ error }) => {
        if (error) console.warn('[meta-whatsapp] Failed to update whatsapp_messages:', error.message);
      });
  }

  if (!result.ok) {
    const err =
      result.data &&
      typeof result.data === 'object' &&
      'error' in result.data &&
      (result.data as { error?: { message?: string } }).error?.message
        ? (result.data as { error: { message: string } }).error.message
        : `HTTP ${result.status}`;
    console.error('[meta-whatsapp] Template send failed:', { template, err, data: result.data });
    return { success: false, error: err };
  }

  return { success: true, messageId: metaId ?? undefined };
}
