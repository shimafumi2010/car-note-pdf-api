import express from "express";
import cors from "cors";
import { generatePDF } from "./pdf.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.post("/api/invoice/pdf", async (req, res) => {
  try {
    const html = req.body.html;
    if (!html) return res.status(400).json({ error: "html is required" });

    const pdfBuffer = await generatePDF(html);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=invoice.pdf",
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF生成エラー:", err);
    res.status(500).json({ error: "PDF creation failed.", detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API listening on port ${PORT}`));
