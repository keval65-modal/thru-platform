export type MerchantAgreementLang = 'en' | 'hi' | 'mr';

export type AgreementTemplateVars = {
  ownerName: string;
  shopName: string;
  phone: string;
  address: string;
  dateFormatted: string;
};

export type AgreementSection = {
  heading: string;
  paragraphs: string[];
};

export type AgreementTemplate = {
  title: string;
  /** Statement included on the signed PDF about WhatsApp onboarding consent */
  whatsappConsentStatement: string;
  sections: AgreementSection[];
};
