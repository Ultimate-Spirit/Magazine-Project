import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export async function GET(request: Request) {
  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase environment variables.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch all records from templates table where category is 'Cover'
    const { data: templates, error: fetchError } = await supabase
      .from('templates')
      .select('*')
      .eq('category', 'Cover');

    if (fetchError) {
      throw new Error(`Failed to fetch templates: ${fetchError.message}`);
    }

    let updatedCount = 0;
    const updatedIds: string[] = [];

    for (const template of templates) {
      if (!template.payload || !template.payload.rawHtml) continue;

      let rawHtml = template.payload.rawHtml;
      const originalHtml = rawHtml;

      // 1. Strip background-color: #1a1a1a;
      rawHtml = rawHtml.replace(/background-color:\s*#1a1a1a;?/gi, '');

      // 2. Remove max-w-[600px] and replace with w-full
      rawHtml = rawHtml.replace(/max-w-\[600px\]/g, 'w-full');

      // 3. Remove aspect-[3/4] and replace with h-full
      rawHtml = rawHtml.replace(/aspect-\[3\/4\]/g, 'h-full');

      if (rawHtml !== originalHtml) {
        const payload = { ...template.payload, rawHtml };

        const { error: updateError } = await supabase
          .from('templates')
          .update({ payload })
          .eq('id', template.id);

        if (updateError) {
          console.error(`Failed to update template ${template.id}:`, updateError.message);
          continue;
        }

        updatedCount++;
        updatedIds.push(template.id);
      }
    }

    return new Response(JSON.stringify({
      message: `Successfully updated ${updatedCount} Cover templates.`,
      updatedIds
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
