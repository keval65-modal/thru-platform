/**
 * HTML → PDF for merchant agreements. Uses @sparticuz/chromium on Vercel/Lambda;
 * full puppeteer locally when available.
 */
export async function generateAgreementPdfFromHtml(html: string): Promise<Buffer> {
  const isServerless =
    process.env.VERCEL === '1' ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.AWS_EXECUTION_ENV);

  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = await import('puppeteer-core');
    const executablePath = await chromium.executablePath();

    const browser = await puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 45_000 });
      const buf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
      });
      return Buffer.from(buf);
    } finally {
      await browser.close();
    }
  }

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45_000 });
    const buf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
    });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}
