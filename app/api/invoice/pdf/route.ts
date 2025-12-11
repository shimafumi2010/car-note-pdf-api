import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import playwright from 'playwright-core';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>請求明細書 - ${data.invoiceId}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    body {
      font-family: 'Noto Sans JP', sans-serif;
      font-size: 14px;
      margin: 0;
      padding: 0;
      color: #000;
      line-height: 1.6;
    }

    .invoice-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .header-left h1 {
      font-size: 28px;
      font-weight: bold;
    }

    .bill-section {
      margin-bottom: 32px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    th, td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      text-align: left;
      font-weight: bold;
    }

    .total-row {
      font-size: 18px;
      font-weight: bold;
    }
  </style>
</head>

<body>
  <div class="invoice-container">

    <div class="header">
      <div class="header-left">
        <h1>請求明細書</h1>
        <p>請求書番号: ${data.invoiceId}</p>
        <p>発行日: ${invoiceDate.toLocaleDateString('ja-JP')}</p>
      </div>

      <div class="header-right">
        <p><strong>A.I.PC合同会社</strong></p>
        <p>〒930-0961</p>
        <p>富山県富山市西長江本町7-3</p>
        <p>TEL：076-482-5027</p>
        <p>Email：billing@car-note.jp</p>
      </div>
    </div>

    <div class="bill-section">
      <h3>請求先</h3>
      <p><strong>${data.companyName} 御中</strong></p>
      <p>${data.companyAddress}</p>
      <p>TEL: ${data.companyPhone}</p>
    </div>

    <h3>請求内容</h3>

    <table>
      <thead>
        <tr>
          <th>項目</th>
          <th>数量</th>
          <th>単価（税込）</th>
          <th>金額（税込）</th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td>${data.planName} ${billingMonth}分 (${data.billingCycle === 'yearly' ? '年払い' : '月払い'})</td>
          <td>1</td>
          <td>¥${data.amount.toLocaleString()}</td>
          <td>¥${data.amount.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div style="text-align: right">
      <p class="total-row">合計（税込）: ¥${data.amount.toLocaleString()}</p>
      <p>うち消費税: ¥${taxAmount.toLocaleString()}</p>
    </div>

    <h3>お支払い方法</h3>
    <p>ご登録のクレジットカードより自動引き落としされます。</p>
    <p>次回引き落とし予定日：${nextPaymentDate.toLocaleDateString('ja-JP')}</p>

  </div>
</body>
</html>
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InvoiceData;

    // 必須チェック
    if (!body.invoiceId || !body.date || !body.planName) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // HTML生成
    const html = generateInvoiceHTML(body);

    // Chromium 起動
    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });

    // PDF生成
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm',
      },
    });

    await browser.close();

    const filename = `invoice_${body.invoiceId}.pdf`;

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('PDF ERROR:', err);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
