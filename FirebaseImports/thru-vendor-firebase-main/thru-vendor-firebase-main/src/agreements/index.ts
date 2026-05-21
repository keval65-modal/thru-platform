import type { AgreementTemplate, AgreementTemplateVars, MerchantAgreementLang } from './types';
import { buildAgreementEn } from './agreement.en';
import { buildAgreementHi } from './agreement.hi';
import { buildAgreementMr } from './agreement.mr';

export const AGREEMENT_VERSION = 'v1' as const;

export type { AgreementTemplate, AgreementTemplateVars, MerchantAgreementLang } from './types';

export function resolveAgreementLanguage(value: string | null | undefined): MerchantAgreementLang {
  if (value === 'hi' || value === 'mr') return value;
  return 'en';
}

export function buildAgreementForLanguage(
  lang: MerchantAgreementLang,
  vars: AgreementTemplateVars
): AgreementTemplate {
  switch (lang) {
    case 'hi':
      return buildAgreementHi(vars);
    case 'mr':
      return buildAgreementMr(vars);
    default:
      return buildAgreementEn(vars);
  }
}
