import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { AgreementTemplate, AgreementTemplateVars } from '@/agreements/types';
import { AGREEMENT_VERSION } from '@/agreements';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const LINE_HEIGHT = 14;

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Serverless-safe PDF generation (no Chromium). Used for signed merchant agreements.
 */
export async function generateAgreementPdfFromTemplate(params: {
  template: AgreementTemplate;
  vars: AgreementTemplateVars;
  signedName: string;
  signedAtDisplay: string;
  languageLabel: string;
}): Promise<Buffer> {
  const { template, vars, signedName, signedAtDisplay, languageLabel } = params;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  const maxChars = 92;

  const drawLine = (text: string, size: number, bold = false) => {
    if (y < MARGIN + 40) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(text, {
      x: MARGIN,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth,
    });
    y -= LINE_HEIGHT + (bold ? 4 : 2);
  };

  drawLine(template.title, 16, true);
  drawLine(`Agreement version: ${AGREEMENT_VERSION} | Language: ${languageLabel}`, 9);
  y -= 6;

  drawLine(`Shop owner: ${vars.ownerName}`, 10);
  drawLine(`Shop name: ${vars.shopName}`, 10);
  drawLine(`Phone: ${vars.phone}`, 10);
  drawLine(`Address: ${vars.address}`, 10);
  drawLine(`Agreement date: ${vars.dateFormatted}`, 10);
  y -= 8;

  for (const section of template.sections) {
    drawLine(section.heading, 11, true);
    for (const p of section.paragraphs) {
      for (const line of wrapLines(p, maxChars)) {
        drawLine(line, 10);
      }
    }
    y -= 4;
  }

  y -= 8;
  drawLine('Merchant Signature', 11, true);
  drawLine(`Merchant Name: ${vars.ownerName}`, 10);
  drawLine(`Business Name: ${vars.shopName}`, 10);
  drawLine(`Signature (Typed): ${signedName}`, 10);
  drawLine(`Date: ${signedAtDisplay}`, 10);
  drawLine(`Agreement Version: ${AGREEMENT_VERSION} | Electronically Accepted`, 9);
  y -= 8;
  drawLine('WhatsApp consent', 11, true);
  for (const line of wrapLines(template.whatsappConsentStatement, maxChars)) {
    drawLine(line, 9);
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
