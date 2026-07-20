import { createClient } from '@supabase/supabase-js';

export interface LogPayload {
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT';
  details: string;
}

export async function logSystemActivity(payload: LogPayload, req?: any) {
  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Backend logger: Missing Supabase environment variables.');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId = payload.user_id;
    let userEmail = payload.user_email;
    let userName = payload.user_name;

    if (req?.headers?.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        userEmail = user.email;
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile) {
          userName = profile.full_name;
        }
      }
    }

    const safePayload = {
      user_id: userId || '00000000-0000-0000-0000-000000000000',
      user_name: userName || 'System User',
      user_email: userEmail || 'system@spirit-magazine.com',
      action: payload.action,
      details: payload.details,
    };

    const { error } = await supabase.from('activity_logs').insert([safePayload]);
    if (error) {
      console.error('[CRITICAL LOG FAILURE]:', error);
    }
  } catch (err) {
    console.error('[CRITICAL LOG FAILURE]:', err);
  }
}
