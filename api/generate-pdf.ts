export const config = {
  runtime: 'edge',
};

export async function POST(request: Request) {
  try {
    const token = process.env.BROWSERLESS_TOKEN;
    if (!token) {
      // Using standard Web Response which is the native equivalent of NextResponse
      // for Vercel Edge Functions outside of a Next.js app context
      return new Response(JSON.stringify({ error: 'Missing BROWSERLESS_TOKEN environment variable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await request.json();

    const response = await fetch(`https://production-sfo.browserless.io/pdf?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html: requestBody.html,
        options: {
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: false,
          margin: { top: '0', bottom: '0', left: '0', right: '0' }
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
