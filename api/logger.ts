import { createClient } from '@supabase/supabase-js';

export interface LogPayload {
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT';
  details: string;
}

export async function logSystemActivity(payload: LogPayload) {
  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Backend logger: Missing Supabase environment variables.');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const safePayload = {
      user_id: payload.user_id || '00000000-0000-0000-0000-000000000000',
      user_name: payload.user_name || 'System User',
      user_email: payload.user_email || 'system@spirit-magazine.com',
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
