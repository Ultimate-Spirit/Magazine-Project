import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Missing Supabase environment variables' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*, profiles (full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase query error:', error.message);
      // Fallback to empty array gracefully to prevent frontend crash
      return res.status(200).json([]);
    }

    const formattedData = data?.map((log: any) => {
      const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
      return {
        ...log,
        user_name: profile?.full_name || log.user_name || null,
        user_email: profile?.email || log.user_email || null,
      };
    }) || [];

    return res.status(200).json(formattedData);
  } catch (error: any) {
    console.error('API Error /api/logs:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
