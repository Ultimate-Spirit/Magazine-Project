import { supabase } from './supabaseClient';

type ActionType = 'created' | 'updated' | 'deleted' | 'invited';
type EntityType = 'folder' | 'publication' | 'user';

export async function logActivity(
  actionType: ActionType,
  entityType: EntityType,
  entityName: string,
  companyId: string,
  userId: string,
  details?: string
) {
  if (!companyId || !userId) {
    console.error('ACTIVITY LOG BLOCKED: Missing companyId or userId', { companyId, userId });
    return;
  }

  const payload = {
    company_id: companyId,
    user_id: userId,
    action_type: actionType,
    entity_type: entityType,
    entity_name: entityName,
    details: details
  };

  try {
    console.log('ATTEMPTING ACTIVITY LOG INSERT:', payload);
    const { data, error } = await supabase.from('activity_logs').insert([payload]).select();

    if (error) {
      console.error("SUPABASE INSERT ERROR:", error.message, error.details, error.hint);
    } else {
      console.log("ACTIVITY LOG INSERT SUCCESS:", data);
    }
  } catch (err: any) {
    console.error("ACTIVITY LOG EXCEPTION:", err.message);
  }
}
