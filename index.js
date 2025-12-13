import express from "express";
import bodyParser from "body-parser";
import puppeteer from "puppeteer";

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

// PDF生成API
app.post("/pdf", async (req, res) => {
  try {
    const html = req.body.html;
    if (!html) {
      return res.status(400).send("html is required");
    }

    // Puppeteer起動（Renderで必須のオプション）
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    // 日本語フォントの読み込み（Render はデフォルトで日本語対応）
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm"
      }
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).send("PDF生成エラー: " + err);
  }
});

// Renderが利用するポート
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("PDF API running on port " + PORT);
});
