import puppeteer from 'puppeteer-core';

export const config = {
  maxDuration: 60, // Set timeout to 60s for Vercel Hobby/Pro
};

export async function POST(request: Request) {
  try {
    const token = process.env.BROWSERLESS_TOKEN || '2Ui5G7Wh2tHASwS00b5802fc5d89f8c13d2c0d233a2dc1c60';
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing BROWSERLESS_TOKEN environment variable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await request.json();
    if (!requestBody.pages || requestBody.pages.length === 0) {
      throw new Error('No pages provided in blueprint data');
    }

    // Connect to Browserless
    const browserWSEndpoint = `wss://chrome.browserless.io?token=${token}`;
    const browser = await puppeteer.connect({ browserWSEndpoint });

    const page = await browser.newPage();
    
    // Set viewport to desktop for correct Tailwind rendering
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    // Enable request interception
    await page.setRequestInterception(true);
    
    // Intercept the /print-data.json request
    page.on('request', (req) => {
      if (req.url().endsWith('/print-data.json')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(requestBody.pages)
        });
      } else {
        req.continue();
      }
    });

    // We navigate to the origin of the current request (Vercel production URL or localhost)
    const url = new URL(request.url);
    const renderUrl = `${url.protocol}//${url.host}/print-render`;

    // Wait until network is idle to ensure all ECharts, fonts, and base64 images are painted
    await page.goto(renderUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Allow an extra moment for React to strictly finish all layout effects
    await new Promise(resolve => setTimeout(resolve, 1500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    await browser.close();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Master_Document.pdf"'
      }
    });

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
