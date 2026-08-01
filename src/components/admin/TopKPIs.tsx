import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, FileEdit, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

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

  const sparklineData = [{v: 10}, {v: 25}, {v: 15}, {v: 40}];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Link to="/admin/companies" className="bg-card/40 backdrop-blur-md border border-white/5 rounded-xl p-4 flex flex-col gap-2 cursor-pointer hover:bg-card/80 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Workspaces</p>
          <Building2 className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col">
          <p className="text-3xl font-extrabold tracking-tight text-foreground">
            {loading ? <span className="animate-pulse">...</span> : data.totalWorkspaces}
          </p>
          <div className="mt-2">
            <ResponsiveContainer height={35} width="100%">
              <LineChart data={sparklineData}>
                <Line dataKey="v" dot={false} stroke="hsl(var(--primary))" strokeWidth={2} type="monotone"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Link>

      <Link to="/admin/users" className="bg-card/40 backdrop-blur-md border border-white/5 rounded-xl p-4 flex flex-col gap-2 cursor-pointer hover:bg-card/80 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Users</p>
          <Users className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col">
          <p className="text-3xl font-extrabold tracking-tight text-foreground">
            {loading ? <span className="animate-pulse">...</span> : data.activeUsers}
          </p>
          <div className="mt-2">
            <ResponsiveContainer height={35} width="100%">
              <LineChart data={sparklineData}>
                <Line dataKey="v" dot={false} stroke="hsl(var(--primary))" strokeWidth={2} type="monotone"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Link>

      <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Magazines</p>
          <FileEdit className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col">
          <p className="text-3xl font-extrabold tracking-tight text-foreground">
            {loading ? <span className="animate-pulse">...</span> : data.totalMagazines}
          </p>
          <div className="mt-2">
            <ResponsiveContainer height={35} width="100%">
              <LineChart data={sparklineData}>
                <Line dataKey="v" dot={false} stroke="hsl(var(--primary))" strokeWidth={2} type="monotone"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Published Pages</p>
          <FileText className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col">
          <p className="text-3xl font-extrabold tracking-tight text-foreground">
            {loading ? <span className="animate-pulse">...</span> : data.publishedPages}
          </p>
          <div className="mt-2">
            <ResponsiveContainer height={35} width="100%">
              <LineChart data={sparklineData}>
                <Line dataKey="v" dot={false} stroke="hsl(var(--primary))" strokeWidth={2} type="monotone"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
