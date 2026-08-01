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
  
  const [momentum, setMomentum] = useState({
    workspaces: [] as any[],
    users: [] as any[],
    magazines: [] as any[],
    pages: [] as any[]
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
        fourteenDaysAgo.setHours(0, 0, 0, 0);
        const fourteenIso = fourteenDaysAgo.toISOString();

        const [
          companiesRes,
          usersRes,
          foldersRes,
          pagesRes,
          comp14,
          users14,
          folders14,
          pages14
        ] = await Promise.all([
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('folders').select('id', { count: 'exact', head: true }),
          supabase.from('pages').select('id', { count: 'exact', head: true }),
          
          supabase.from('companies').select('created_at').gte('created_at', fourteenIso),
          supabase.from('profiles').select('created_at').gte('created_at', fourteenIso),
          supabase.from('folders').select('created_at').gte('created_at', fourteenIso),
          supabase.from('pages').select('created_at').gte('created_at', fourteenIso),
        ]);

        setData({
          totalWorkspaces: companiesRes.count || 0,
          activeUsers: usersRes.count || 0,
          totalMagazines: foldersRes.count || 0,
          publishedPages: pagesRes.count || 0
        });

        const process14 = (rows: any[]) => {
          const map = new Map();
          for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            map.set(d.toISOString().split('T')[0], { count: 0 });
          }
          rows.forEach((r: any) => {
            const ymd = r.created_at.split('T')[0];
            if (map.has(ymd)) {
              map.get(ymd).count += 1;
            }
          });
          return Array.from(map.values());
        };

        setMomentum({
          workspaces: process14(comp14.data || []),
          users: process14(users14.data || []),
          magazines: process14(folders14.data || []),
          pages: process14(pages14.data || [])
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
      <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-xl p-4 flex flex-col gap-2">
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
              <LineChart data={momentum.workspaces}>
                <Line dataKey="count" dot={false} activeDot={false} stroke="hsl(var(--primary))" strokeWidth={2} type="natural"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-xl p-4 flex flex-col gap-2">
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
              <LineChart data={momentum.users}>
                <Line dataKey="count" dot={false} activeDot={false} stroke="hsl(var(--primary))" strokeWidth={2} type="natural"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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
              <LineChart data={momentum.magazines}>
                <Line dataKey="count" dot={false} activeDot={false} stroke="hsl(var(--primary))" strokeWidth={2} type="natural"/>
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
              <LineChart data={momentum.pages}>
                <Line dataKey="count" dot={false} activeDot={false} stroke="hsl(var(--primary))" strokeWidth={2} type="natural"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
