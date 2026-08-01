import puppeteer from 'puppeteer-core';
import { logSystemActivity } from './logger.js';

export const config = {
  maxDuration: 60, // Set timeout to 60s for Vercel Hobby/Pro
};

export default async function handler(req: any, res: any) {
  try {
    const token = process.env.BROWSERLESS_TOKEN || '2Ui5G7Wh2tHASwS00b5802fc5d89f8c13d2c0d233a2dc1c60';
    if (!token) {
      return res.status(500).json({ error: 'Missing BROWSERLESS_TOKEN environment variable' });
    }

    // req.body is already parsed in Vercel Serverless Functions if it's application/json
    const requestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!requestBody || !requestBody.pages || requestBody.pages.length === 0) {
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
    page.on('request', (reqInterception: any) => {
      if (reqInterception.url().endsWith('/print-data.json')) {
        reqInterception.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(requestBody.pages)
        });
      } else {
        reqInterception.continue();
      }
    });

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const renderUrl = `${protocol}://${host}/print-render`;

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

    // Log the export activity
    // Note: Since we don't have user session in this generic API route yet, we'll log a system message or a placeholder.
    // Assuming the frontend passed some user info, but since req.body only has pages, we'll use a placeholder.
    const userEmail = requestBody.user_email || 'system@spirit-magazine.com';
    const userName = requestBody.user_name || 'System User';
    const userId = requestBody.user_id || '00000000-0000-0000-0000-000000000000';

    await logSystemActivity({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      action: 'EXPORT',
      details: 'Generated Master PDF',
    }, req);

    const revalidatePath = async (path: string) => {
      try {
        if (res.revalidate) {
          await res.revalidate(path);
        } else {
          res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');
        }
      } catch (e) {
        console.error('Revalidation failed:', e);
      }
    };
    
    await revalidatePath('/admin');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Master_Document.pdf"');
    return res.status(200).send(Buffer.from(pdfBuffer));

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return res.status(500).json({ error: error.message || "Failed to generate PDF" });
  }
}
