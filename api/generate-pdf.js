// api/generate-pdf.js
// ─────────────────────────────────────────────────────────────────────────────
// Vercel Node.js Serverless Function — receives an HTML string, 
// renders the page via Browserless, and streams back an A4 PDF buffer.
//
// Route: POST /api/generate-pdf
// Body:  { html: "<complete html document string>" }
// Returns: application/pdf binary buffer
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const { html: requestHtml } = req.body ?? {};

  if (!requestHtml || typeof requestHtml !== 'string') {
    res.status(400).json({ error: 'Missing required body field: html (string)' });
    return;
  }

  try {
    const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY || '2Ui5G7Wh2tHASwS00b5802fc5d89f8c13d2c0d233a2dc1c60';
    const response = await fetch(`https://chrome.browserless.io/pdf?token=${BROWSERLESS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html: requestHtml,
        options: {
          printBackground: true,
          format: 'A4',
          margin: { top: '0', bottom: '0', left: '0', right: '0' }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Browserless error: ${response.statusText}`);
    }

    const pdfBuffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="SDPL_Corporate_Intelligence.pdf"');
    res.status(200).send(Buffer.from(pdfBuffer));

  } catch (err) {
    console.error('[generate-pdf] Error:', err);
    res.status(500).json({
      error: 'PDF generation failed',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
};
