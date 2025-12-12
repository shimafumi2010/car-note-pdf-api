import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60秒のタイムアウト
export async function OPTIONS(request: NextRequest) {
  console.log('✅ OPTIONS request received');
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

interface InvoiceData {
  invoiceId: string;
  date: string;
  planName: string;
  amount: number;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  billingCycle: 'monthly' | 'yearly';
}

function generateInvoiceHTML(data: InvoiceData): string {
  const invoiceDate = new Date(data.date);
  const billingMonth = invoiceDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
  });

  const nextPaymentDate = new Date(invoiceDate);
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

  const taxAmount = Math.floor(data.amount / 11);

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<title>請求明細書</title>

<style>
  @page {
    size: A4;
    margin: 20mm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Noto Sans JP', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #000;
  }

  .invoice-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
  }

  h1 { font-size: 28px; margin-bottom: 16px; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
  }

  th, td {
    padding: 12px;
    border-bottom: 1px solid #ccc;
  }

  th { background: #f2f2f2; }
  .right { text-align: right; }
  .center { text-align: center; }
</style>

</head>
<body>
  <div class="invoice-container">
    <h1>請求明細書</h1>

    <p>請求書番号：${data.invoiceId}</p>
    <p>発行日：${invoiceDate.toLocaleDateString('ja-JP')}</p>

    <h3 style="margin-top:32px;">請求先</h3>
    <p>${data.companyName} 御中</p>
    <p>${data.companyAddress}</p>
    <p>TEL: ${data.companyPhone}</p>

    <h3 style="margin-top:32px;">請求内容</h3>
    <table>
      <thead>
        <tr>
          <th>項目</th>
          <th class="center">数量</th>
          <th class="right">単価（税込）</th>
          <th class="right">金額（税込）</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${data.planName} ${billingMonth}分 (${data.billingCycle === 'yearly' ? '年払い' : '月払い'})</td>
          <td class="center">1</td>
          <td class="right">¥${data.amount.toLocaleString()}</td>
          <td class="right">¥${data.amount.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <h3 style="margin-top:24px;">合計</h3>
    <p class="right">合計（税込）：¥${data.amount.toLocaleString()}</p>
    <p class="right">うち消費税：¥${taxAmount.toLocaleString()}</p>

    <h3 style="margin-top:32px;">お支払い方法</h3>
    <p>ご登録クレジットカードで自動決済されます。</p>
    <p>次回引き落とし予定日：${nextPaymentDate.toLocaleDateString('ja-JP')}</p>
  </div>
</body>
</html>
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InvoiceData;

    if (!body.invoiceId || !body.date || !body.planName || !body.amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const html = generateInvoiceHTML(body);

console.log('🚀 Launching Puppeteer...');

// Chromiumの設定を最適化
chromium.setGraphicsMode = false;
chromium.setHeadlessMode = true;

const browser = await puppeteer.launch({
  args: [
    ...chromium.args,
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-sandbox',
    '--single-process',
    '--no-zygote',
  ],
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: true,  // ← 直接指定
});

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    const fileName = `invoice_${body.invoiceId}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('PDF ERROR:', err);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
