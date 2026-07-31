import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    totalWorkspaces: null,
    activeUsers: null,
    totalMagazines: null,
    publishedPages: null,
    pdfsGenerated: null,
    pdfLimit: null,
    recentExports: null,
    totalTemplates: null,
    totalBundles: null,
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
              {overviewError ? <span className="text-red-500 text-xs font-mono">{overviewError}</span> : overview.totalWorkspaces === null ? <span className="animate-pulse">...</span> : overview.totalWorkspaces || 0}
            </p>
          </div>

          <div onClick={() => navigate('/admin/users')} className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2 cursor-pointer hover:bg-card/80 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Active Users</p>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {overviewError ? <span className="text-red-500 text-xs font-mono">{overviewError}</span> : overview.activeUsers === null ? <span className="animate-pulse">...</span> : overview.activeUsers || 0}
            </p>
          </div>

          <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Total Magazines</p>
              <FileEdit className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {overviewError ? <span className="text-red-500 text-xs font-mono">{overviewError}</span> : overview.totalMagazines === null ? <span className="animate-pulse">...</span> : overview.totalMagazines || 0}
            </p>
          </div>

          <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Published Pages</p>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {overviewError ? <span className="text-red-500 text-xs font-mono">{overviewError}</span> : overview.publishedPages === null ? <span className="animate-pulse">...</span> : overview.publishedPages || 0}
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
          {/* Widget 1 - Recent PDF Exports */}
          <div className="lg:col-span-1 h-full">
            <div className="bg-card/50 border border-border/40 rounded-xl flex flex-col h-full overflow-hidden">
              <div className="flex-1 p-4 flex flex-col gap-1">
                <h2 className="text-sm font-semibold text-foreground mb-3">Recent PDF Exports</h2>
                <div className="flex flex-col flex-1">
                  {overviewError ? (
                    <div className="py-4 text-center">
                      <span className="text-red-500 text-xs font-mono">{overviewError}</span>
                    </div>
                  ) : overview.recentExports === null ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                        <div className="h-3 bg-secondary rounded w-1/3"></div>
                        <div className="h-3 bg-secondary rounded w-1/6"></div>
                      </div>
                    ))
                  ) : overview.recentExports.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No recent PDF exports.</div>
                  ) : (
                    overview.recentExports.map((exp: any) => {
                      const hoursAgo = Math.max(0, Math.floor((new Date().getTime() - new Date(exp.created_at).getTime()) / (1000 * 60 * 60)));
                      const editedText = hoursAgo === 0 ? 'just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo/24)}d ago`;
                      return (
                        <div key={exp.id} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-medium text-foreground">
                              {exp.profiles?.full_name || exp.profiles?.email?.split('@')[0] || 'System User'}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {editedText}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
              <Link to="/admin/activity" className="mt-auto border-t border-border/40 bg-muted/20 px-4 py-2.5 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">View All Exports</span>
              </Link>
            </div>
          </div>

          {/* Widget 2 - Resource Library */}
          <div className="lg:col-span-1 h-full">
            <div className="bg-card/50 border border-border/40 rounded-xl flex flex-col h-full overflow-hidden">
              <div className="flex-1 p-4 flex flex-col gap-1">
                <h2 className="text-sm font-semibold text-foreground mb-3">Resource Library</h2>
                <div className="flex flex-col flex-1">
                  <div className="flex justify-between items-center py-3.5 border-b border-border/30 text-xs">
                    <span className="text-muted-foreground">Active Templates</span>
                    <span className="font-mono text-foreground">{overviewError ? 'ERR' : overview.totalTemplates === null ? '...' : overview.totalTemplates || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-3.5 border-b border-border/30 text-xs">
                    <span className="text-muted-foreground">Template Bundles</span>
                    <span className="font-mono text-foreground">{overviewError ? 'ERR' : overview.totalBundles === null ? '...' : overview.totalBundles || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-3.5 border-b border-border/30 last:border-0 text-xs">
                    <span className="text-muted-foreground">System Roles</span>
                    <div className="flex gap-1">
                      <span className="px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary text-[10px] font-medium">Admin</span>
                      <span className="px-1.5 py-0.5 rounded-sm bg-secondary text-secondary-foreground text-[10px] font-medium">Editor</span>
                      <span className="px-1.5 py-0.5 rounded-sm bg-secondary text-secondary-foreground text-[10px] font-medium">Viewer</span>
                    </div>
                  </div>
                </div>
              </div>
              <Link to="/admin/bundles" className="mt-auto border-t border-border/40 bg-muted/20 px-4 py-2.5 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Manage Resources</span>
              </Link>
            </div>
          </div>

          {/* Stacked Micro-Widgets Wrapper */}
          <div className="flex flex-col gap-4 h-full">
            {/* Widget 2 - PDF API Quota */}
            <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col flex-1">
              <div className="flex flex-col justify-center h-full gap-3">
                {/* Tier 1 (Header) */}
                <div className="flex justify-between items-end">
                  <span className="text-xs font-medium text-foreground">PDF Quota</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {overviewError ? 'ERR' : overview.pdfsGenerated === null ? '...' : `${overview.pdfsGenerated || 0} / ${overview.pdfLimit || 10000}`}
                  </span>
                </div>
                
                {/* Tier 2 (The Track) */}
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-1000" 
                    style={{ width: overview.pdfsGenerated !== null ? `${(((overview.pdfsGenerated || 0) / (overview.pdfLimit || 10000)) * 100)}%` : '0%' }}
                  ></div>
                </div>
                
                {/* Tier 3 (Footer) */}
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span>Active</span>
                  </div>
                  <span>Pro Plan</span>
                </div>
              </div>
            </div>

            {/* Widget 3 - System Health */}
            <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col flex-1">
              <div className="flex flex-col justify-center h-full gap-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-medium text-foreground">System Uptime</span>
                  <span className="text-xs font-mono text-muted-foreground">99.9%</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between w-full gap-[2px]">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[3px] h-[14px] rounded-[1px] bg-emerald-500/80 hover:bg-emerald-400 transition-colors"
                      ></div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>30-day health</span>
                    <span>Latency: 14ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-8 pt-6 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-[11px] font-medium text-muted-foreground/80">
            <span className="hover:text-foreground transition-colors cursor-pointer">API Documentation</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Support</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Changelog</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">
            SPIRIT OS BUILD v1.2.4
          </div>
        </footer>
      </main>
    </div>
  );
};
