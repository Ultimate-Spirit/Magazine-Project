import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing Supabase environment variables' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*, profiles (full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase query error:', error.message);
      return res.status(200).json([]);
    }

    return res.status(200).json(data || []);
  } catch (error: any) {
    console.error('API Error /api/logs:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
