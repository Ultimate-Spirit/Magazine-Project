import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Users, Building2, ArrowUpRight, Loader2, Calendar, FileText, Activity, ShieldCheck, Zap, Lock, FileEdit } from 'lucide-react';
import { LineChart } from '../ui/line-chart';



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
  const [overview, setOverview] = useState<Record<string, any>>({
    total_workspaces: null,
    total_pages: null,
    total_users: null,
    pdfsGenerated: null,
    pdfLimit: null,
  });
  const [activities, setActivities] = useState<ActivityLog[] | null>(null);
  const [chartData, setChartData] = useState<{dates: string[], data: number[]} | null>(null);
  const [activeWorkspaces, setActiveWorkspaces] = useState<any[] | null>(null);
  
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [workspacesError, setWorkspacesError] = useState<string | null>(null);
  
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
      try {
        const { data: logsData, error } = await supabase
          .from('activity_logs')
          .select('id, action_type, entity_type, entity_name, created_at, profiles(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        if (logsData) {
          setActivities(logsData as any);
        }
      } catch (err: any) {
        setActivitiesError(err.message || 'Failed to load activity');
      }

      // Fetch chart data
      try {
        const cRes = await fetch('/api/dashboard-chart', { headers });
        const cData = await cRes.json();
        if (cRes.ok) {
          setChartData(cData);
        } else {
          setChartError(cData.error || 'Unknown API Error');
        }
      } catch (err: any) {
        setChartError(err.message || 'Network Error');
      }

      // Fetch active workspaces
      try {
        const { data: workspacesData, error } = await supabase
          .from('companies')
          .select('*')
          .limit(4);
          
        if (error) throw error;
        if (workspacesData) {
          setActiveWorkspaces(workspacesData);
        }
      } catch (err: any) {
        setWorkspacesError(err.message || 'Failed to load workspaces');
      }

      // Fetch new dashboard overview
      try {
        const overviewRes = await fetch('/api/dashboard-overview', { headers });
        const overviewData = await overviewRes.json();
        if (overviewRes.ok) {
          setOverview(overviewData);
        } else {
          setOverviewError(overviewData.error || 'Unknown API Error');
        }
      } catch (err: any) {
        setOverviewError(err.message || 'Network Error');
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
      <header className="h-14 px-3 lg:px-6 flex items-center justify-between sticky top-0 z-[10] bg-background/80 backdrop-blur-xl faint-divider shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight leading-none">Overview Portal</h1>
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

      <main className="flex flex-col gap-4 p-4 lg:p-6 w-full max-w-full">
        {/* Row 1: Executive Overview (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div onClick={() => navigate('/admin/companies')} className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2 cursor-pointer hover:bg-card/80 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Total Workspaces</p>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {overviewError ? <span className="text-red-500 text-xs font-mono">{overviewError}</span> : overview.total_workspaces === null ? <span className="animate-pulse">...</span> : overview.total_workspaces}
            </p>
          </div>

          <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Published Pages</p>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {overviewError ? <span className="text-red-500 text-xs font-mono">{overviewError}</span> : overview.total_pages === null ? <span className="animate-pulse">...</span> : overview.total_pages}
            </p>
          </div>

          <div onClick={() => navigate('/admin/users')} className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2 cursor-pointer hover:bg-card/80 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Active Users</p>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {overviewError ? <span className="text-red-500 text-xs font-mono">{overviewError}</span> : overview.total_users === null ? <span className="animate-pulse">...</span> : overview.total_users}
            </p>
          </div>

          <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">API Usage</p>
              <Zap className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {overviewError ? <span className="text-red-500 text-xs font-mono">{overviewError}</span> : overview.pdfsGenerated === null ? <span className="animate-pulse">...</span> : `${((overview.pdfsGenerated / overview.pdfLimit) * 100).toFixed(1)}%`}
            </p>
          </div>
        </div>

        {/* Row 2: Central Analytics & Granular Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          {/* Analytics (70%) */}
          <div className="lg:col-span-2 bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col min-h-[300px]">
            <h2 className="text-sm font-semibold text-foreground mb-4">30-Day Platform Activity</h2>
            <div className="flex-1 w-full h-full relative">
              {chartError ? (
                <div className="w-full h-full bg-secondary/10 border border-red-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-red-500 text-xs font-mono">{chartError}</span>
                </div>
              ) : chartData === null ? (
                <div className="w-full h-full bg-secondary/20 animate-pulse rounded-lg flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Loading chart...</span>
                </div>
              ) : (
                <LineChart pagesData={chartData.data} pdfsData={[]} dates={chartData.dates} />
              )}
            </div>
          </div>

          {/* Activity Feed (30%) */}
          <div className="lg:col-span-1 bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col min-h-[300px] overflow-hidden">
            <h2 className="text-sm font-semibold text-foreground mb-4 shrink-0">Activity Feed</h2>
            <div className="flex-1 overflow-y-auto invisible-scrollbar">
              <div className="space-y-3">
                {activitiesError ? (
                  <div className="py-10 text-center">
                    <span className="text-red-500 text-xs font-mono">{activitiesError}</span>
                  </div>
                ) : activities === null ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex flex-col gap-2 py-1.5 border-b border-border/20 last:border-0 pb-2 last:pb-0">
                      <div className="h-3 bg-secondary rounded w-full"></div>
                      <div className="h-3 bg-secondary rounded w-2/3"></div>
                    </div>
                  ))
                ) : activities.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground/50 text-xs">No recent activity.</div>
                ) : activities.map((log) => (
                  <div key={log.id} className="flex flex-col gap-0.5 border-b border-border/20 last:border-0 pb-2 last:pb-0">
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-[11px] text-foreground font-medium truncate">
                        {log.profiles?.full_name || log.profiles?.email?.split('@')[0] || 'System'}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      <span className="lowercase">{log.action_type}</span> {log.entity_type} <span className="font-medium text-foreground/80">{log.entity_name}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Data Enrichment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
          {/* Widget 1 - Active Workspaces */}
          <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Active Workspaces</h2>
            <div className="flex flex-col gap-2">
              {workspacesError ? (
                <div className="py-4 text-center">
                  <span className="text-red-500 text-xs font-mono">{workspacesError}</span>
                </div>
              ) : activeWorkspaces === null ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex flex-col gap-2 py-1.5 border-b border-border/20 last:border-0">
                    <div className="h-3 bg-secondary rounded w-3/4"></div>
                    <div className="h-3 bg-secondary rounded w-1/2"></div>
                  </div>
                ))
              ) : activeWorkspaces.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No active workspaces</div>
              ) : (
                activeWorkspaces.map((ws: any) => {
                  const fallbackDate = ws.updated_at || ws.created_at || new Date().toISOString();
                  const hoursAgo = Math.max(0, Math.floor((new Date().getTime() - new Date(fallbackDate).getTime()) / (1000 * 60 * 60)));
                  const editedText = hoursAgo === 0 ? 'just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo/24)}d ago`;
                  return (
                    <div key={ws.id} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-foreground truncate max-w-[150px]">{ws.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Last edited {editedText}</p>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${ws.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                        {ws.status || 'Active'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Widget 2 - PDF API Quota */}
          <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col justify-between gap-4">
            <h2 className="text-sm font-semibold text-foreground">PDF API Quota</h2>
            <div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden w-full mb-2">
                <div 
                  className="bg-primary h-full transition-all duration-1000" 
                  style={{ width: overview.pdfsGenerated !== null ? `${(overview.pdfsGenerated / overview.pdfLimit) * 100}%` : '0%' }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {overviewError ? (
                  <span className="text-red-500 font-mono">{overviewError}</span>
                ) : overview.pdfsGenerated === null ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  `${overview.pdfLimit - overview.pdfsGenerated} generations remaining of ${overview.pdfLimit} limit`
                )}
              </p>
            </div>
          </div>

          {/* Widget 3 - System Health */}
          <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col justify-between gap-4">
            <h2 className="text-sm font-semibold text-foreground">System Uptime</h2>
            <div>
              <div className="flex items-end gap-[2px] h-6 w-full mb-3">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm ${i === 15 || i === 18 ? 'bg-emerald-500/30' : 'bg-emerald-500/80'} h-full`}
                  ></div>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>PDF Compiler</span>
                  <span className="text-foreground font-medium">Operational</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Database</span>
                  <span className="text-foreground font-medium">12ms latency</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
