import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Users, Building2, ArrowUpRight, Loader2, Calendar, FileText, Activity, ShieldCheck, Zap, Lock, FileEdit } from 'lucide-react';

interface ActivityLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_name: string;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Record<string, any>>({
    total_users: '...',
    active_accounts: '...',
    active_workspaces: '...',
    published_pages: '...',
    pending_invites: '...',
    recent_updates: '...',
    active_sessions: '...'
  });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {};
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Fetch aggregated stats from secure backend with cache-busting
      const statsRes = await fetch(`/_/backend/admin-stats?t=${Date.now()}`, { headers });
      const statsData = await statsRes.json();
      
      // Force update state regardless of response status
      setStats(statsData);

      if (!statsRes.ok) {
        console.error('Diagnostic Server Error:', statsData);
      }

      // Fetch recent global activity
      const { data: logsData } = await supabase
        .from('activity_logs')
        .select('id, action_type, entity_type, entity_name, created_at, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(6);

      if (logsData) {
        setActivities(logsData as any);
      }

    } catch (err: any) {
      console.error('Fatal fetch error:', err);
      // Surface the error directly in the UI if fetch itself fails
      setStats({
        total_users: `ERR: ${err.message}`,
        active_accounts: `ERR: ${err.message}`,
        active_workspaces: `ERR: ${err.message}`,
        published_pages: `ERR: ${err.message}`,
        pending_invites: `ERR: ${err.message}`,
        recent_updates: `ERR: ${err.message}`,
        active_sessions: `ERR: ${err.message}`
      });
    } finally {
      // MANDATORY: Kill loading state regardless of outcome
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background font-sans invisible-scrollbar">
      <header className="h-20 lg:h-24 px-3 lg:px-8 flex items-center justify-between sticky top-0 z-[10] bg-background/80 backdrop-blur-xl faint-divider shrink-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight leading-none">Overview Portal</h1>
          <div className="flex items-center gap-2 mt-1 lg:mt-2">
            <Calendar className="w-3 h-3 text-muted-foreground/40" />
            <p className="text-[9px] lg:text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="p-2 lg:p-3 micro-surface rounded-xl lg:rounded-2xl border border-border/10">
          <p className="text-[8px] lg:text-[9px] font-black text-primary uppercase tracking-[0.3em]">System Health: Optimal</p>
        </div>
      </header>

      <main className="px-2 lg:px-6 py-6 lg:py-8 space-y-6 lg:space-y-8 w-full">
        {/* Primary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-6">
          <div onClick={() => navigate('/admin/users')} className="bento-card micro-surface micro-surface-hover border-border/20 group cursor-pointer overflow-hidden relative p-3 lg:p-6 flex flex-row lg:flex-col justify-between lg:justify-start items-center lg:items-start gap-4">
            <div className="absolute top-0 right-0 p-3 lg:p-6 opacity-0 group-hover:opacity-100 transition-all hidden lg:block">
              <ArrowUpRight size={16} className="text-primary" />
            </div>
            <div className="flex items-center gap-3 lg:block">
              <div className="w-9 h-9 lg:w-10 lg:h-10 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0 lg:mb-6">
                <Users size={16} />
              </div>
              <p className="text-[9px] lg:text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">Total Users</p>
            </div>
            {/* @ts-ignore */}
            <p className="text-xl lg:text-4xl font-black text-foreground break-all">{String(stats.total_users)}</p>
          </div>

          <div onClick={() => navigate('/admin/companies')} className="bento-card micro-surface micro-surface-hover border-border/20 group cursor-pointer overflow-hidden relative p-3 lg:p-6 flex flex-row lg:flex-col justify-between lg:justify-start items-center lg:items-start gap-4">
            <div className="absolute top-0 right-0 p-3 lg:p-6 opacity-0 group-hover:opacity-100 transition-all hidden lg:block">
              <ArrowUpRight size={16} className="text-primary" />
            </div>
            <div className="flex items-center gap-3 lg:block">
              <div className="w-9 h-9 lg:w-10 lg:h-10 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0 lg:mb-6">
                <Building2 size={16} />
              </div>
              <p className="text-[9px] lg:text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">Active Workspaces</p>
            </div>
            {/* @ts-ignore */}
            <p className="text-xl lg:text-4xl font-black text-foreground break-all">{String(stats.active_workspaces)}</p>
          </div>

          <div className="bento-card micro-surface border-border/20 p-3 lg:p-6 flex flex-row lg:flex-col justify-between lg:justify-start items-center lg:items-start gap-4">
            <div className="flex items-center gap-3 lg:block">
              <div className="w-9 h-9 lg:w-10 lg:h-10 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground/40 shrink-0 lg:mb-6">
                <FileText size={16} />
              </div>
              <p className="text-[9px] lg:text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">Published Pages</p>
            </div>
            {/* @ts-ignore */}
            <p className="text-xl lg:text-4xl font-black text-foreground break-all">{String(stats.published_pages)}</p>
          </div>

          <div className="bento-card micro-surface border-border/20 p-3 lg:p-6 flex flex-row lg:flex-col justify-between lg:justify-start items-center lg:items-start gap-4">
            <div className="flex items-center gap-3 lg:block">
              <div className="w-9 h-9 lg:w-10 lg:h-10 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground/40 shrink-0 lg:mb-6">
                <ShieldCheck size={16} />
              </div>
              <p className="text-[9px] lg:text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">Active Accounts</p>
            </div>
            {/* @ts-ignore */}
            <p className="text-xl lg:text-4xl font-black text-emerald-500 break-all">{String(stats.active_accounts)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {/* Global Activity Stream */}
          <div className="lg:col-span-2 micro-surface rounded-[2rem] lg:rounded-[2.5rem] border border-border/20 overflow-hidden flex flex-col h-full min-h-[400px]">
            <div className="p-6 lg:p-8 faint-divider flex items-center justify-between bg-card/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Activity size={16} className="text-primary" />
                </div>
                <h2 className="text-base lg:text-lg font-black text-foreground tracking-tight">Global Activity Stream</h2>
              </div>
              <span className="text-[8px] lg:text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] px-3 py-1 micro-surface rounded-full border border-border/10 hidden sm:block">Real-time Monitor</span>
            </div>
            <div className="p-2 lg:p-4 flex-1 overflow-y-auto">
              <div className="space-y-1">
                {activities.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground/20 italic text-xs lg:text-sm font-medium uppercase tracking-widest">No recent system activity recorded.</div>
                ) : activities.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl lg:rounded-2xl micro-surface-hover group">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-secondary flex items-center justify-center font-black text-[10px] lg:text-xs text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all border border-border/5 shrink-0">
                      {(log.profiles?.full_name || log.profiles?.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs lg:text-sm font-black text-foreground truncate">
                        {log.profiles?.full_name || log.profiles?.email.split('@')[0]} 
                        <span className="text-muted-foreground/60 font-medium ml-2 lowercase italic">
                          {log.action_type} the {log.entity_type}
                        </span>
                      </p>
                      <p className="text-[9px] lg:text-[10px] font-bold text-primary uppercase tracking-widest truncate mt-0.5 opacity-60">{log.entity_name}</p>
                    </div>
                    <div className="text-[8px] lg:text-[10px] font-black text-muted-foreground/30 uppercase tracking-tighter whitespace-nowrap hidden sm:block">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Platform Metrics */}
          <div className="micro-surface rounded-[2rem] lg:rounded-[2.5rem] border border-border/20 p-6 lg:p-8 flex flex-col h-full">
            <h2 className="text-base lg:text-lg font-black text-foreground mb-6 lg:mb-8 tracking-tight shrink-0">Platform Metrics</h2>
            
            <div className="flex-1 flex flex-col justify-between gap-3 lg:gap-4">
              {[
                { icon: Zap, label: 'Pending Invites', key: 'pending_invites' },
                { icon: FileEdit, label: 'Recent Updates', key: 'recent_updates' },
                { icon: Lock, label: 'Active Sessions', key: 'active_sessions' },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between p-4 lg:p-6 micro-surface rounded-xl lg:rounded-[1.5rem] border border-border/10 flex-1 min-h-0 overflow-hidden">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <m.icon size={18} className="text-muted-foreground/40 shrink-0" />
                    <span className="text-[10px] lg:text-xs font-black text-muted-foreground/60 uppercase tracking-[0.1em] truncate">{m.label}</span>
                  </div>
                  {/* @ts-ignore */}
                  <span className="text-lg lg:text-2xl font-black text-foreground break-all ml-2">{String(stats[m.key])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
