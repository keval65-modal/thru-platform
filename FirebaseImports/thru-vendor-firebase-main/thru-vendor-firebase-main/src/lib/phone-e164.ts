/** Normalize vendor phone to E.164 for WhatsApp Cloud API (defaults India +91 for 10-digit). */
export function normalizePhoneE164(phone: string, defaultCountryCode = '91'): string {
  const trimmed = phone.trim();
  if (!trimmed) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.length === 10 && defaultCountryCode) {
    return `+${defaultCountryCode}${digits}`;
  }

  return `+${digits}`;
}
