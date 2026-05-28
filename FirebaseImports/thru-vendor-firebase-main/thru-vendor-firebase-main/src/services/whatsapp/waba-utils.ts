import type { MetaWhatsAppMessagesResponse } from '@/services/whatsapp/sendTemplateMessage';

export function defaultTemplateLanguage(): string {
  return process.env.META_WHATSAPP_DEFAULT_LOCALE?.trim() || 'en_US';
}

/** Locales to try when Meta rejects the primary template language. */
export function templateLanguageCandidates(primary?: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of [primary?.trim(), defaultTemplateLanguage(), 'en_US', 'en', 'en_IN']) {
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
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

/** Body variables for `merchant_welcome` (order must match Meta template). */
export function welcomeTemplateParameters(ownerName: string): string[] {
  const first = ownerFirstName(ownerName);
  const includeUrl = process.env.META_WHATSAPP_WELCOME_INCLUDE_URL !== 'false';
  if (includeUrl) {
    return [first, appUrl('/merchant/agreement')];
  }
  return [first];
}

export function isMetaConfigured(): boolean {
  return Boolean(
    process.env.META_ACCESS_TOKEN?.trim() && process.env.META_PHONE_NUMBER_ID?.trim()
  );
}
