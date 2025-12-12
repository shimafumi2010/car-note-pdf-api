import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import playwright from 'playwright-core';

// ⚠️ 重要：これらの設定を追加
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
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

// CORSヘッダーを定数として定義
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
};

function generateInvoiceHTML(data: InvoiceData): string {
  const invoiceDate = new Date(data.date);
  const billingMonth = invoiceDate.toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long' 
  });
  
  const nextPaymentDate = new Date(invoiceDate);
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  
  const taxAmount = Math.floor(data.amount / 11);
  const taxRate = '10%';

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>請求明細書 - ${data.invoiceId}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif;
      font-size: 13px;
      line-height: 1.7;
      color: #1a1a1a;
      background: white;
      padding: 0;
      margin: 0;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px 40px;
      position: relative;
    }
    
    .invoice-container::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(to bottom, #3b82f6, #1d4ed8);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header-left h1 {
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    
    .header-left .meta {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.6;
    }
    
    .header-left .meta p {
      margin-bottom: 3px;
    }
    
    .header-left .meta strong {
      color: #374151;
      font-weight: 600;
    }
    
    .header-right {
      text-align: right;
      background: #f8fafc;
      padding: 16px 20px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    
    .header-right .company-name {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 10px;
    }
    
    .header-right .company-info {
      font-size: 11px;
      color: #64748b;
      line-height: 1.8;
    }
    
    .header-right .company-info p {
      margin-bottom: 2px;
    }
    
    .bill-to {
      margin-bottom: 30px;
      background: #fafbfc;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    
    .bill-to h3 {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      font-weight: 600;
    }
    
    .bill-to .customer-name {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    
    .bill-to .customer-info {
      font-size: 12px;
      color: #4b5563;
      line-height: 1.7;
    }
    
    .bill-to .customer-info p {
      margin-bottom: 3px;
    }
    
    .billing-details {
      margin-bottom: 30px;
    }
    
    .billing-details h3 {
      font-size: 16px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      border-radius: 6px;
      overflow: hidden;
    }
    
    thead tr {
      background: #f1f5f9;
      border-bottom: 2px solid #cbd5e1;
    }
    
    th {
      padding: 14px 16px;
      text-align: left;
      font-weight: 700;
      font-size: 12px;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    th.center {
      text-align: center;
    }
    
    th.right {
      text-align: right;
    }
    
    tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }
    
    tbody tr:last-child {
      border-bottom: none;
    }
    
    td {
      padding: 16px;
      font-size: 13px;
      color: #374151;
    }
    
    td.center {
      text-align: center;
    }
    
    td.right {
      text-align: right;
      font-weight: 600;
    }
    
    .item-detail {
      font-size: 11px;
      color: #9ca3af;
      margin-left: 8px;
      font-weight: 400;
    }
    
    .total-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    
    .total-box {
      width: 350px;
      background: #fafbfc;
      padding: 20px;
      border-radius: 8px;
      border: 2px solid #e5e7eb;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 16px 0;
      border-top: 3px solid #1e293b;
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
    }
    
    .tax-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 12px;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .tax-row:last-child {
      border-bottom: none;
      padding-bottom: 16px;
    }
    
    .payment-method {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .payment-method h3 {
      font-size: 15px;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 12px;
    }
    
    .payment-method .info {
      font-size: 12px;
      color: #1e3a8a;
      line-height: 1.8;
    }
    
    .payment-method .info p {
      margin-bottom: 8px;
    }
    
    .payment-method .info .label {
      color: #3b82f6;
      font-weight: 600;
    }
    
    .footer {
      border-top: 2px solid #e5e7eb;
      padding-top: 20px;
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
      line-height: 1.6;
    }
    
    .footer p {
      margin-bottom: 5px;
    }
    
    .footer .contact {
      margin-top: 8px;
      font-size: 11px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="header-left">
        <h1>請求明細書</h1>
        <div class="meta">
          <p><strong>請求書番号:</strong> ${data.invoiceId}</p>
          <p><strong>発行日:</strong> ${invoiceDate.toLocaleDateString('ja-JP')}</p>
        </div>
      </div>
      <div class="header-right">
        <div class="company-name">A.I.PC合同会社</div>
        <div class="company-info">
          <p>〒930-0961</p>
          <p>富山県富山市西長江本町7-3</p>
          <p>TEL: 076-482-5027</p>
          <p>Email: billing@car-note.jp</p>
        </div>
      </div>
    </div>
    
    <div class="bill-to">
      <h3>請求先 (Bill To)</h3>
      <div class="customer-name">${data.companyName} 御中</div>
      <div class="customer-info">
        <p>${data.companyAddress}</p>
        <p>TEL: ${data.companyPhone}</p>
      </div>
    </div>
    
    <div class="billing-details">
      <h3>請求内容</h3>
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
            <td>
              ${data.planName} ${billingMonth}分
              <span class="item-detail">(${data.billingCycle === 'yearly' ? '年払い' : '月払い'})</span>
            </td>
            <td class="center">1</td>
            <td class="right">¥${data.amount.toLocaleString()}</td>
            <td class="right">¥${data.amount.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="total-section">
        <div class="total-box">
          <div class="tax-row">
            <span>小計（税抜）</span>
            <span>¥${(data.amount - taxAmount).toLocaleString()}</span>
          </div>
          <div class="tax-row">
            <span>消費税（${taxRate}）</span>
            <span>¥${taxAmount.toLocaleString()}</span>
          </div>
          <div class="total-row">
            <span>合計金額</span>
            <span>¥${data.amount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="payment-method">
      <h3>💳 お支払い方法</h3>
      <div class="info">
        <p>ご登録のクレジットカードより自動引き落としされます。</p>
        <p><span class="label">次回引き落とし予定日:</span> ${nextPaymentDate.toLocaleDateString('ja-JP')}</p>
      </div>
    </div>
    
    <div class="footer">
      <p>この請求書は自動生成されたものです。内容に誤りがある場合は下記までご連絡ください。</p>
      <div class="contact">
        <p><strong>お問い合わせ:</strong> billing@car-note.jp | TEL: 076-482-5027</p>
        <p>クルマノートCRM by A.I.PC合同会社</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// ⚠️ GETハンドラーを追加（デバッグ用）
export async function GET(request: NextRequest) {
  console.log('✅ GET request received');
  return NextResponse.json(
    { 
      message: 'PDF API is running',
      endpoint: '/api/invoice/pdf',
      methods: ['GET', 'POST', 'OPTIONS'],
      status: 'OK'
    },
    { 
      status: 200,
      headers: corsHeaders,
    }
  );
}

// OPTIONSハンドラー（preflightリクエスト対応）
export async function OPTIONS(request: NextRequest) {
  console.log('✅ OPTIONS request received');
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// POSTハンドラー
export async function POST(request: NextRequest) {
  console.log('✅ POST request received');
  
  try {
    const body = await request.json() as InvoiceData;
    console.log('📦 Request body:', body);

    if (!body.invoiceId || !body.date || !body.planName || !body.amount) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, date, planName, amount' },
        { 
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    console.log('📄 Generating PDF for invoice:', body.invoiceId);

    const html = generateInvoiceHTML(body);

    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
    });

    await browser.close();

    console.log('✅ PDF generated successfully, size:', pdf.length, 'bytes');

    const fileName = `invoice_${body.invoiceId}_${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(pdf, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdf.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : String(error)
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
