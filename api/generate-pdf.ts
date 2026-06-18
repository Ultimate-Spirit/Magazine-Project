export const config = {
  runtime: 'edge',
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

    const browserlessScript = `
      export default async function({ page, context }) {
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
        await page.setContent(context.html, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(2000);
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true
        });
        return pdf;
      }
    `;

    const response = await fetch(`https://production-sfo.browserless.io/function?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: browserlessScript,
        context: {
          html: requestBody.html
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Browserless error: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf'
      }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
