import { createClient } from '@supabase/supabase-js';

export interface LogPayload {
  user_id: string;
  user_name: string;
  user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT';
  details: string;
}

export async function logSystemActivity(payload: LogPayload) {
  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Backend logger: Missing Supabase environment variables.');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase.from('activity_logs').insert([payload]);
    if (error) {
      console.error('Failed to log system activity:', error);
    }
  } catch (err) {
    console.error('Exception while logging system activity:', err);
  }
}
