# Car Note PDF API (Render + puppeteer-core + @sparticuz/chromium)

このプロジェクトは、HTMLから請求書PDFを生成するためのシンプルなExpressベースAPIです。

## 主なエンドポイント

- `POST /api/invoice/pdf`
  - Body(JSON): `{ "html": "<!DOCTYPE html>...任意のHTML..." }`
  - Response: PDFバイナリ (`application/pdf`)

## ローカル開発

```bash
npm install
npm run dev
```

## Render デプロイ

Render にこのリポジトリを接続し、自動デプロイを有効化してください。
