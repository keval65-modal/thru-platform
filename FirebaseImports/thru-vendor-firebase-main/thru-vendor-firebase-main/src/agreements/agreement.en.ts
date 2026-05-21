import type { AgreementTemplate, AgreementTemplateVars } from './types';

function fill(s: string, v: AgreementTemplateVars) {
  return s
    .replace(/\{\{ownerName\}\}/g, v.ownerName)
    .replace(/\{\{shopName\}\}/g, v.shopName)
    .replace(/\{\{phone\}\}/g, v.phone)
    .replace(/\{\{address\}\}/g, v.address)
    .replace(/\{\{dateFormatted\}\}/g, v.dateFormatted);
}

export function buildAgreementEn(vars: AgreementTemplateVars): AgreementTemplate {
  const v = vars;
  return {
    title: 'Thru Merchant Partner Agreement (v1)',
    whatsappConsentStatement:
      'The Merchant consents to receive onboarding updates, operational alerts, payout information, and account-related communication through WhatsApp and other channels, as recorded at registration.',
    sections: [
      {
        heading: 'Introduction',
        paragraphs: [
          'This Merchant Partner Agreement ("Agreement") is entered into between Thru ("Platform") and the Merchant.',
          'By proceeding with registration, using the Platform, accepting orders, or electronically signing this Agreement, the Merchant confirms acceptance of all terms described below.',
        ],
      },
      {
        heading: '1. Merchant Information',
        paragraphs: [
          'The Merchant confirms that all information provided during onboarding and operation is accurate, complete, and up to date.',
          fill('Merchant name: {{ownerName}}.', v),
          fill('Business name: {{shopName}}.', v),
          fill('Contact phone: {{phone}}.', v),
          fill('Business address: {{address}}.', v),
          fill('Agreement date: {{dateFormatted}}.', v),
        ],
      },
      {
        heading: '2. Scope of Partnership',
        paragraphs: [
          'Thru provides a technology platform that enables merchants to receive, manage, and fulfil customer orders.',
          'Nothing in this Agreement creates an employment, agency, franchise, or joint venture relationship.',
        ],
      },
      {
        heading: '3. Merchant Responsibilities',
        paragraphs: [
          'The Merchant is responsible for accurate product information, lawful operation, timely fulfilment, product quality, stock availability, and proper customer handling.',
        ],
      },
      {
        heading: '4. Licences, Compliance, and Legal Authority',
        paragraphs: [
          'The Merchant confirms possession of all required licences, registrations, and permissions necessary to operate legally.',
        ],
      },
      {
        heading: '5. Restricted and Prohibited Goods',
        paragraphs: [
          'The Merchant agrees not to sell illegal, counterfeit, unsafe, prohibited, or regulated goods without proper approvals.',
        ],
      },
      {
        heading: '6. Orders and Fulfilment',
        paragraphs: [
          'Repeated cancellations, operational abuse, excessive delays, or customer complaints may result in restrictions or account suspension.',
        ],
      },
      {
        heading: '7. Pricing and Availability',
        paragraphs: [
          'The Merchant is responsible for maintaining accurate pricing, taxes, and availability information.',
        ],
      },
      {
        heading: '8. Payouts, Fees, and Settlements',
        paragraphs: [
          'Merchant settlements are generally processed on a T+1 basis, subject to fraud review, disputes, reversals, refunds, and operational investigations. Thru may withhold or adjust payouts where necessary.',
        ],
      },
      {
        heading: '9. Refunds, Customer Complaints, and Disputes',
        paragraphs: [
          'Thru may issue refunds, reverse payouts, recover operational losses, or temporarily hold funds while investigations are ongoing.',
        ],
      },
      {
        heading: '10. WhatsApp and Operational Communication Consent',
        paragraphs: [
          'The Merchant consents to receive onboarding updates, operational alerts, payout information, and account-related communication through WhatsApp and other channels.',
        ],
      },
      {
        heading: '11. Data Usage and Privacy',
        paragraphs: [
          'Thru may process operational and transactional data for analytics, fraud prevention, support, legal compliance, and service optimisation.',
        ],
      },
      {
        heading: '12. Suspension, Restriction, and Termination',
        paragraphs: [
          'Thru reserves the right to suspend or terminate accounts involving fraud, abuse, policy violations, excessive complaints, or operational risk.',
        ],
      },
      {
        heading: '13. Platform Availability',
        paragraphs: [
          'The Platform may occasionally experience maintenance, outages, delays, or technical issues. Uninterrupted availability is not guaranteed.',
        ],
      },
      {
        heading: '14. Limitation of Liability',
        paragraphs: [
          'To the maximum extent permitted by law, Thru shall not be liable for indirect losses, business interruption, or consequential damages.',
        ],
      },
      {
        heading: '15. Indemnity',
        paragraphs: [
          'The Merchant agrees to indemnify and hold harmless Thru against claims, disputes, penalties, legal expenses, or damages arising from merchant conduct or violations.',
        ],
      },
      {
        heading: '16. Changes to Agreement and Policies',
        paragraphs: [
          'Thru may update operational policies, payout terms, and platform rules from time to time. Continued use constitutes acceptance.',
        ],
      },
      {
        heading: '17. Governing Framework',
        paragraphs: [
          'This Agreement shall be governed in accordance with applicable laws of India.',
        ],
      },
      {
        heading: '18. Electronic Acceptance and Signature',
        paragraphs: [
          'Electronic acceptance, typed signatures, OTP verification, and digital confirmations constitute valid acceptance of this Agreement.',
          'Agreement Version: v1 | Electronically Accepted',
        ],
      },
    ],
  };
}
