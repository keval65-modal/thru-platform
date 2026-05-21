import type { AgreementTemplate, AgreementTemplateVars } from '@/agreements/types';
import { AGREEMENT_VERSION } from '@/agreements';

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildAgreementPdfHtml(params: {
  template: AgreementTemplate;
  vars: AgreementTemplateVars;
  signedName: string;
  signedAtDisplay: string;
  languageLabel: string;
}): string {
  const { template, vars, signedName, signedAtDisplay, languageLabel } = params;
  const sectionsHtml = template.sections
    .map(
      (s) => `
      <section>
        <h2>${escapeHtml(s.heading)}</h2>
        ${s.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
      </section>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif; font-size: 11px; color: #111; margin: 24px; line-height: 1.45; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    h2 { font-size: 13px; margin: 14px 0 6px; }
    p { margin: 6px 0; }
    .meta { border: 1px solid #ddd; padding: 10px; margin: 12px 0; border-radius: 6px; background: #fafafa; }
    .meta div { margin: 3px 0; }
    .footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 10px; color: #333; }
    .sig { margin-top: 14px; }
    .small { font-size: 10px; color: #444; }
  </style>
</head>
<body>
  <h1>${escapeHtml(template.title)}</h1>
  <p class="small">Agreement version: ${escapeHtml(AGREEMENT_VERSION)} &nbsp;|&nbsp; Language: ${escapeHtml(languageLabel)}</p>
  <div class="meta">
    <div><strong>Shop owner:</strong> ${escapeHtml(vars.ownerName)}</div>
    <div><strong>Shop name:</strong> ${escapeHtml(vars.shopName)}</div>
    <div><strong>Phone:</strong> ${escapeHtml(vars.phone)}</div>
    <div><strong>Address:</strong> ${escapeHtml(vars.address)}</div>
    <div><strong>Agreement date:</strong> ${escapeHtml(vars.dateFormatted)}</div>
  </div>
  ${sectionsHtml}
  <div class="footer">
    <p><strong>Merchant Signature</strong></p>
    <div class="sig">
      <p><strong>Merchant Name:</strong> ${escapeHtml(vars.ownerName)}</p>
      <p><strong>Business Name:</strong> ${escapeHtml(vars.shopName)}</p>
      <p><strong>Signature (Typed):</strong> ${escapeHtml(signedName)}</p>
      <p><strong>Date:</strong> ${escapeHtml(signedAtDisplay)}</p>
      <p class="small">Agreement Version: ${escapeHtml(AGREEMENT_VERSION)} | Electronically Accepted</p>
    </div>
    <p style="margin-top:12px"><strong>WhatsApp consent</strong></p>
    <p>${escapeHtml(template.whatsappConsentStatement)}</p>
  </div>
</body>
</html>`;
}
