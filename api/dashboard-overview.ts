import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return res.status(200).json({ 
        totalWorkspaces: 0,
        activeUsers: 0,
        totalMagazines: 0, 
        publishedPages: 0,
        pdfsGenerated: 0, 
        pdfLimit: 10000, 
        recentExports: [],
        error: 'Missing Supabase credentials' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const [companiesRes, foldersRes, pagesRes, usersRes, pdfsRes, recentExportsRes] = await Promise.all([
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('folders').select('id', { count: 'exact', head: true }),
      supabase.from('pages').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('activity_logs').select('id', { count: 'exact', head: true })
        .eq('action', 'EXPORT'),
      supabase.from('activity_logs')
        .select('id, action, entity_name, created_at, profiles(full_name, email)')
        .eq('action', 'EXPORT')
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    if (companiesRes.error) console.error(`Companies query failed: ${companiesRes.error.message}`);
    if (foldersRes.error) console.error(`Folders query failed: ${foldersRes.error.message}`);
    if (pagesRes.error) console.error(`Pages query failed: ${pagesRes.error.message}`);
    if (usersRes.error) console.error(`Profiles query failed: ${usersRes.error.message}`);
    if (pdfsRes.error) console.error(`PDFs query failed: ${pdfsRes.error.message}`);

    const totalWorkspaces = (companiesRes.error ? 0 : companiesRes.count) || 0;
    const activeUsers = (usersRes.error ? 0 : usersRes.count) || 0;
    const totalMagazines = (foldersRes.error ? 0 : foldersRes.count) || 0;
    const publishedPages = (pagesRes.error ? 0 : pagesRes.count) || 0;
    const pdfsGenerated = (pdfsRes.error ? 0 : pdfsRes.count) || 0;
    const pdfLimit = 10000;
    const recentExports = recentExportsRes.error ? [] : (recentExportsRes.data || []);

    return res.status(200).json({
      totalWorkspaces,
      activeUsers,
      totalMagazines,
      publishedPages,
      pdfsGenerated,
      pdfLimit,
      recentExports
    });
  } catch (error: any) {
    console.error('Dashboard Overview Error:', error);
    return res.status(200).json({ 
      totalWorkspaces: 0,
      activeUsers: 0,
      totalMagazines: 0, 
      publishedPages: 0, 
      pdfsGenerated: 0, 
      pdfLimit: 10000,
      recentExports: [],
      error: error.message || 'Unknown API Error' 
    });
  }
}
