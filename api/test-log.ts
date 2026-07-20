import { logSystemActivity } from './logger.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await logSystemActivity({
      action: 'CREATE',
      details: 'Manual diagnostic test log'
    });
    
    return res.status(200).json({ success: true, message: 'Test log created' });
  } catch (error: any) {
    console.error('API Error /api/test-log:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
