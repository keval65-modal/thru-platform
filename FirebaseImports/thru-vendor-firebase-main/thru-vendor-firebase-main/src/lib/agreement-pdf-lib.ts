import { readFile } from 'fs/promises';
import path from 'path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import type { AgreementTemplate, AgreementTemplateVars, MerchantAgreementLang } from '@/agreements/types';
import { AGREEMENT_VERSION } from '@/agreements';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const LINE_HEIGHT = 14;
const DEVANAGARI_RE = /[\u0900-\u097F]/;

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts', 'agreement');
const DEVANAGARI_REGULAR = path.join(FONT_DIR, 'NotoSansDevanagari-Regular.woff2');
const DEVANAGARI_BOLD = path.join(FONT_DIR, 'NotoSansDevanagari-Bold.woff2');

type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
  devanagariRegular?: PDFFont;
  devanagariBold?: PDFFont;
};

let devanagariFontBytes: { regular: Uint8Array; bold: Uint8Array } | null = null;

async function loadDevanagariFontBytes(): Promise<{ regular: Uint8Array; bold: Uint8Array }> {
  if (!devanagariFontBytes) {
    const [regular, bold] = await Promise.all([
      readFile(DEVANAGARI_REGULAR),
      readFile(DEVANAGARI_BOLD),
    ]);
    devanagariFontBytes = { regular, bold };
  }
  return devanagariFontBytes;
}

function usesDevanagariScript(lang: MerchantAgreementLang): boolean {
  return lang === 'hi' || lang === 'mr';
}

function textNeedsDevanagariFont(text: string): boolean {
  return DEVANAGARI_RE.test(text);
}

function pickFont(text: string, bold: boolean, fonts: PdfFonts): PDFFont {
  if (fonts.devanagariRegular && textNeedsDevanagariFont(text)) {
    return bold && fonts.devanagariBold ? fonts.devanagariBold : fonts.devanagariRegular;
  }
  return bold ? fonts.bold : fonts.regular;
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
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

async function embedFonts(pdfDoc: PDFDocument, lang: MerchantAgreementLang): Promise<PdfFonts> {
  pdfDoc.registerFontkit(fontkit);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  if (!usesDevanagariScript(lang)) {
    return { regular, bold };
  }

  const bytes = await loadDevanagariFontBytes();
  const devanagariRegular = await pdfDoc.embedFont(bytes.regular);
  const devanagariBold = await pdfDoc.embedFont(bytes.bold);
  return { regular, bold, devanagariRegular, devanagariBold };
}

/**
 * Serverless-safe PDF generation (no Chromium). Used for signed merchant agreements.
 * Hindi/Marathi use embedded Noto Sans Devanagari (OFL); English uses Helvetica.
 */
export async function generateAgreementPdfFromTemplate(params: {
  template: AgreementTemplate;
  vars: AgreementTemplateVars;
  signedName: string;
  signedAtDisplay: string;
  languageLabel: string;
  agreementLanguage: MerchantAgreementLang;
}): Promise<Buffer> {
  const { template, vars, signedName, signedAtDisplay, languageLabel, agreementLanguage } = params;
  const pdfDoc = await PDFDocument.create();
  const fonts = await embedFonts(pdfDoc, agreementLanguage);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  const maxChars = usesDevanagariScript(agreementLanguage) ? 72 : 92;

  const drawLine = (text: string, size: number, bold = false) => {
    if (y < MARGIN + 40) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(text, {
      x: MARGIN,
      y,
      size,
      font: pickFont(text, bold, fonts),
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
