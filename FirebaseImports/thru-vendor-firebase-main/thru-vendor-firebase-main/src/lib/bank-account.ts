import type { CSSProperties } from 'react';

/** Digits only — avoids spaces/dashes breaking account confirmation. */
export function normalizeAccountNumber(value: string): string {
  return value.replace(/\D/g, '');
}

const MASKED_ACCOUNT_INPUT_STYLE: CSSProperties = {
  WebkitTextSecurity: 'disc',
};

export const maskedAccountNumberInputProps = {
  type: 'text' as const,
  inputMode: 'numeric' as const,
  autoComplete: 'off' as const,
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  style: MASKED_ACCOUNT_INPUT_STYLE,
};
