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
    console.warn('Missing companyId or userId for activity log');
    return;
  }

  try {
    const { error } = await supabase.from('activity_logs').insert([{
      company_id: companyId,
      user_id: userId,
      action_type: actionType,
      entity_type: entityType,
      entity_name: entityName,
      details: details
    }]);

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Activity logging exception:', err);
  }
}
