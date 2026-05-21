import type { AgreementTemplate, AgreementTemplateVars } from '@/agreements/types';

/**
 * Deterministic canonical string hashed for integrity (pre-PDF).
 */
export function buildCanonicalAgreementString(parts: {
  agreementVersion: string;
  language: string;
  vars: AgreementTemplateVars;
  template: AgreementTemplate;
  signedName: string;
  signedAtIso: string;
  whatsappConsentConfirmed: boolean;
}): string {
  const { agreementVersion, language, vars, template, signedName, signedAtIso, whatsappConsentConfirmed } =
    parts;
  const body = template.sections
    .map((s) => `${s.heading}\n${s.paragraphs.join('\n')}`)
    .join('\n\n');
  const lines = [
    `agreementVersion=${agreementVersion}`,
    `language=${language}`,
    `ownerName=${vars.ownerName}`,
    `shopName=${vars.shopName}`,
    `phone=${vars.phone}`,
    `address=${vars.address}`,
    `dateFormatted=${vars.dateFormatted}`,
    `title=${template.title}`,
    `body=${body}`,
    `whatsappStatement=${template.whatsappConsentStatement}`,
    `signedName=${signedName}`,
    `signedAtIso=${signedAtIso}`,
    `whatsappConsentConfirmed=${whatsappConsentConfirmed ? 'true' : 'false'}`,
  ];
  return lines.join('\n');
}
