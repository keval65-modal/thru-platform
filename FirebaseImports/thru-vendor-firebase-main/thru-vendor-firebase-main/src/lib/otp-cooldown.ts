/** Client-side OTP send cooldowns (Firebase still enforces server-side limits). */

const PREFIX = 'thru_otp_cooldown_';

export const OTP_RESEND_COOLDOWN_SEC = 60;
export const OTP_RATE_LIMIT_COOLDOWN_SEC = 60 * 60; // Firebase auth/too-many-requests

function storageKey(phoneE164: string, kind: 'resend' | 'blocked') {
  return `${PREFIX}${kind}_${phoneE164.replace(/\D/g, '')}`;
}

export function getOtpCooldownRemainingSec(phoneE164: string): number {
  if (typeof window === 'undefined') return 0;
  const keys = [
    storageKey(phoneE164, 'blocked'),
    storageKey(phoneE164, 'resend'),
  ];
  let maxRemaining = 0;
  for (const key of keys) {
    const until = Number(localStorage.getItem(key) || 0);
    if (until > Date.now()) {
      maxRemaining = Math.max(maxRemaining, Math.ceil((until - Date.now()) / 1000));
    }
  }
  return maxRemaining;
}

export function setOtpCooldown(phoneE164: string, seconds: number, kind: 'resend' | 'blocked' = 'resend') {
  if (typeof window === 'undefined') return;
  const until = Date.now() + seconds * 1000;
  localStorage.setItem(storageKey(phoneE164, kind), String(until));
}

export function formatCooldown(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${seconds}s`;
}
