import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, FileEdit, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function TopKPIs() {
  const [data, setData] = useState({
    totalWorkspaces: 0,
    activeUsers: 0,
    totalMagazines: 0,
    publishedPages: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          companiesRes,
          usersRes,
          foldersRes,
          pagesRes
        ] = await Promise.all([
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('folders').select('id', { count: 'exact', head: true }),
          supabase.from('pages').select('id', { count: 'exact', head: true }),
        ]);

        setData({
          totalWorkspaces: companiesRes.count || 0,
          activeUsers: usersRes.count || 0,
          totalMagazines: foldersRes.count || 0,
          publishedPages: pagesRes.count || 0
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Link to="/admin/companies" className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2 cursor-pointer hover:bg-card/80 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">Total Workspaces</p>
          <Building2 className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-semibold text-foreground">
          {loading ? <span className="animate-pulse">...</span> : data.totalWorkspaces}
        </p>
      </Link>

      <Link to="/admin/users" className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2 cursor-pointer hover:bg-card/80 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">Active Users</p>
          <Users className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-semibold text-foreground">
          {loading ? <span className="animate-pulse">...</span> : data.activeUsers}
        </p>
      </Link>

      <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">Total Magazines</p>
          <FileEdit className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-semibold text-foreground">
          {loading ? <span className="animate-pulse">...</span> : data.totalMagazines}
        </p>
      </div>

      <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">Published Pages</p>
          <FileText className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-semibold text-foreground">
          {loading ? <span className="animate-pulse">...</span> : data.publishedPages}
        </p>
      </div>
    </div>
  );
}
