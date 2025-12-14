import express from "express";
import cors from "cors";
import chromium from "@sparticuz/chromium";
import playwright from "playwright-core";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Car Note PDF API is running",
    version: "1.0.0",
  });
});

app.post("/api/invoice/pdf", async (req, res) => {
  try {
    const data = req.body;

    const html = generateInvoiceHTML(data);

    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice_${data.invoiceId}.pdf"`
    );

    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "PDF generation failed", detail: e.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Car Note PDF API running on port 3000");
});

function generateInvoiceHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>請求書</title>
        <style>
          body { font-family: 'Noto Sans JP', sans-serif; padding: 40px; }
        </style>
      </head>
      <body>
        <h1>請求書</h1>
        <p>請求書番号：${data.invoiceId}</p>
        <p>請求先：${data.companyName}</p>
        <p>金額：¥${data.amount.toLocaleString()}</p>
      </body>
    </html>
  `;
}
