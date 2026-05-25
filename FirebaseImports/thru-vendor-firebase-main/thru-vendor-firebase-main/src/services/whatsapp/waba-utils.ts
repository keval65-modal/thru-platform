import type { MetaWhatsAppMessagesResponse } from '@/services/whatsapp/sendTemplateMessage';

export function defaultTemplateLanguage(): string {
  return process.env.META_WHATSAPP_DEFAULT_LOCALE?.trim() || 'en_US';
}

export function ownerFirstName(ownerName: string): string {
  const t = ownerName.trim();
  if (!t) return 'Merchant';
  return t.split(/\s+/)[0] ?? t;
}

export function extractMetaMessageId(
  data: MetaWhatsAppMessagesResponse | Record<string, unknown>
): string | null {
  const messages = (data as MetaWhatsAppMessagesResponse).messages;
  if (Array.isArray(messages) && messages[0]?.id) {
    return messages[0].id;
  }
  return null;
}

export function appUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (!base) return path.startsWith('/') ? path : `/${path}`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
