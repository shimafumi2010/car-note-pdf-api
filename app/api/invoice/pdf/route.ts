import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import playwright from "playwright-core";

export const runtime = "nodejs";
export const maxDuration = 60;

interface InvoiceData {
  invoiceId: string;
  date: string;
  planName: string;
  amount: number;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  billingCycle: "monthly" | "yearly";
}

function generateHTML(data: InvoiceData): string {
  const d = new Date(data.date);
  const billingMonth = d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });
  const tax = Math.floor(data.amount / 11);

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<style>
@font-face {
  font-family: "Noto Sans JP";
  src: url("https://car-note-pdf-api.vercel.app/fonts/NotoSansJP-Regular.ttf") format("truetype");
}
body {
  font-family: "Noto Sans JP", sans-serif;
  padding: 40px;
  font-size: 14px;
}
h1 { font-size: 24px; margin-bottom: 12px; }
table { width: 100%; border-collapse: collapse; margin-top: 20px; }
td, th { padding: 8px; border-bottom: 1px solid #ddd; }
th { background: #f5f5f5; }
.total { text-align: right; font-size: 18px; font-weight: bold; }
</style>
</head>
<body>

<h1>請求明細書</h1>

<p>請求書番号: ${data.invoiceId}</p>
<p>発行日: ${d.toLocaleDateString("ja-JP")}</p>

<h2>請求先</h2>
<p>${data.companyName} 御中</p>
<p>${data.companyAddress}</p>
<p>TEL: ${data.companyPhone}</p>

<h2>請求内容</h2>
<table>
<thead>
<tr>
<th>項目</th>
<th>数量</th>
<th>単価</th>
<th>金額</th>
</tr>
</thead>
<tbody>
<tr>
<td>${data.planName}（${billingMonth}）</td>
<td>1</td>
<td>¥${data.amount.toLocaleString()}</td>
<td>¥${data.amount.toLocaleString()}</td>
</tr>
</tbody>
</table>

<p class="total">合計金額（税込） ¥${data.amount.toLocaleString()}</p>
<p>うち消費税 ¥${tax.toLocaleString()}</p>

</body>
</html>
`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InvoiceData;

    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    const html = generateHTML(body);

    await page.setContent(html, { waitUntil: "networkidle" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice_${body.invoiceId}.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "PDF生成エラー", detail: e.message },
      { status: 500 }
    );
  }
}
