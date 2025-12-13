import express from 'express';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const router = express.Router();

router.post('/api/invoice/pdf', async (req, res) => {
  try {
    const { html } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'html is required' });
    }

    console.log('📄 Received HTML length:', html.length);

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    console.log('✅ Browser launched successfully');

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    console.log('📝 HTML content set');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    console.log('✅ PDF generated, size:', pdfBuffer.length, 'bytes');

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ PDF creation failed:', error);
    res.status(500).json({
      error: 'PDF creation failed.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
