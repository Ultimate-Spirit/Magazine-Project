import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return res.status(200).json({ 
        totalMagazines: 0, 
        totalPages: 0, 
        totalUsers: 0, 
        pdfsGenerated: 0, 
        pdfLimit: 10000, 
        error: 'Missing Supabase credentials' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const [foldersRes, pagesRes, usersRes, pdfsRes] = await Promise.all([
      supabase.from('folders').select('id', { count: 'exact', head: true }),
      supabase.from('pages').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('activity_logs').select('id', { count: 'exact', head: true })
        .eq('action', 'EXPORT')
    ]);

    if (foldersRes.error) throw new Error(`Folders query failed: ${foldersRes.error.message}`);
    if (pagesRes.error) throw new Error(`Pages query failed: ${pagesRes.error.message}`);
    if (usersRes.error) throw new Error(`Profiles query failed: ${usersRes.error.message}`);
    if (pdfsRes.error) throw new Error(`PDFs query failed: ${pdfsRes.error.message}`);

    const totalMagazines = foldersRes.count || 0;
    const totalPages = pagesRes.count || 0;
    const totalUsers = usersRes.count || 0;
    const pdfsGenerated = pdfsRes.count || 0;
    const pdfLimit = 10000;

    return res.status(200).json({
      totalMagazines,
      totalPages,
      totalUsers,
      pdfsGenerated,
      pdfLimit
    });
  } catch (error: any) {
    console.error('Dashboard Overview Error:', error);
    return res.status(200).json({ 
      totalMagazines: 0, 
      totalPages: 0, 
      totalUsers: 0, 
      pdfsGenerated: 0, 
      pdfLimit: 10000,
      error: error.message || 'Unknown API Error' 
    });
  }
}
