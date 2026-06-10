import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  Folder as FolderIcon, 
  Plus, 
  Loader2, 
  ChevronRight, 
  X, 
  FolderPlus, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Edit2,
  Activity as ActivityIcon,
  BarChart3,
  Clock,
  Zap,
  Search
} from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from './common/ConfirmModal';
import { logActivity } from '../lib/activityLogger';
import type { Folder, Company, UserProfile } from '../types';

interface Props {
  onSelectCompany: (company: Company) => void;
}

interface ActivityEvent {
  id: string;
  type: string;
  action: string;
  name: string;
  timestamp: string;
  userInitials: string;
  userName: string;
}

export function FoldersView({ onSelectCompany }: Props) {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const targetCid = (companyId || '').toLowerCase();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Live Insights State
  const [stats, setStats] = useState({
    collaborators: 0,
    publications: 0
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const getInitials = (nameOrEmail: string) => {
    if (!nameOrEmail) return '?';
    if (nameOrEmail.includes('@')) return nameOrEmail.substring(0, 2).toUpperCase();
    return nameOrEmail.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [compData, folderData, membersData] = await Promise.all([
        supabase.from('companies').select('*').eq('id', targetCid).single(),
        supabase.from('folders').select('*').eq('company_id', targetCid).order('updated_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email').eq('company_id', targetCid)
      ]);

      if (compData.data) {
        setCompany(compData.data);
        onSelectCompany(compData.data);
      }

      if (folderData.error) throw folderData.error;
      const fetchedFolders = folderData.data || [];
      setFolders(fetchedFolders);

      // Create a map of user profiles for attribution
      const userProfiles = membersData.data || [];
      const userMap = new Map<string, UserProfile>();
      userProfiles.forEach(p => userMap.set(p.id, p as UserProfile));

      setStats({
        collaborators: userProfiles.length || 0,
        publications: 0
      });

      if (fetchedFolders.length > 0) {
        // Fetch pages, including the user who created/updated them if possible.
        // Since we don't have an updated_by column in the schema yet, we will attribute it to a known user in the workspace
        // For demonstration of the UI refactor, we will randomly assign attribution to simulate the requested feature
        // In a true production environment, we would alter the SQL schema to include 'updated_by' UUID REFERENCES profiles(id)
        
        const { count } = await supabase
          .from('pages')
          .select('id', { count: 'exact', head: true })
          .in('folder_id', fetchedFolders.map(f => f.id));
        
        setStats(prev => ({ ...prev, publications: count || 0 }));
      }

      // Fetch actual activity logs
      console.log('ATTEMPTING ACTIVITY LOG FETCH FOR COMPANY:', targetCid);
      const { data: logData, error: logError } = await supabase
        .from('activity_logs')
        .select('id, action_type, entity_type, entity_name, created_at, profiles(full_name, email)')
        .eq('company_id', targetCid)
        .order('created_at', { ascending: false })
        .limit(8);

      if (logError) {
        console.error("SUPABASE SELECT ERROR:", logError.message, logError.details, logError.hint);
      } else {
        console.log("ACTIVITY LOG FETCH SUCCESS:", logData);
      }

      if (logData) {
        const mappedActivities: ActivityEvent[] = logData.map(log => {
          const profileData = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
          const uName = profileData?.full_name || profileData?.email || 'Unknown User';
          return {
            id: log.id,
            type: log.entity_type,
            action: log.action_type,
            name: log.entity_name,
            timestamp: log.created_at,
            userInitials: getInitials(uName),
            userName: uName.split('@')[0]
          };
        });
        setActivities(mappedActivities);
      }

    } catch (err: any) {
      console.error('Fetch Error:', err);
      showNotification('error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetCid, onSelectCompany, profile]);

  useEffect(() => {
    if (targetCid && profile) {
      fetchData(true);

      // Real-time Subscriptions
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pages'
          },
          (payload) => {
            console.log('Real-time page update:', payload);
            fetchData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'folders',
            filter: `company_id=eq.${targetCid}`
          },
          (payload) => {
            console.log('Real-time folder update:', payload);
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [targetCid, profile, fetchData]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('folders')
        .insert([{ 
          name: folderNameInput.trim(), 
          company_id: targetCid 
        }]);
      
      if (error) throw error;

      await logActivity('created', 'folder', folderNameInput.trim(), targetCid, profile?.id || '');

      showNotification('success', `Created folder "${folderNameInput}"`);
      setFolderNameInput('');
      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !folderNameInput.trim()) return;

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('folders')
        .update({ name: folderNameInput.trim(), updated_at: new Date().toISOString() })
        .eq('id', editingFolder.id);
      
      if (error) throw error;

      await logActivity('updated', 'folder', folderNameInput.trim(), targetCid, profile?.id || '', `Renamed from ${editingFolder.name}`);

      showNotification('success', 'Folder renamed successfully');
      setEditingFolder(null);
      setFolderNameInput('');
      await fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from('folders').delete().eq('id', folderToDelete.id);
      if (error) throw error;

      await logActivity('deleted', 'folder', folderToDelete.name, targetCid, profile?.id || '');

      showNotification('success', 'Folder deleted');
      setFolderToDelete(null);
      await fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const then = new Date(dateStr);
    const diffInSecs = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (diffInSecs < 60) return 'just now';
    const mins = Math.floor(diffInSecs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return then.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <WorkspaceLayout 
      company={company || { id: targetCid, name: 'Workspace' }}
      currentView="project_explorer"
      onNavigateBack={() => navigate('/', { replace: true })}
      onHome={() => navigate('/', { replace: true })}
    >
      <div className="w-full px-8 md:px-12 xl:px-16 py-16 text-foreground">
        {notification && (
          <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-foreground text-background' : 'bg-destructive text-destructive-foreground'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        {/* Dashboard Header - Optimized Single Row */}
        <header className="flex flex-wrap items-center justify-between gap-6 mb-16 border-b border-border pb-12">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">
              <Zap className="w-3 h-3 fill-current" />
              Dynamic Workspace
              {refreshing && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>
            <h1 className="text-5xl font-black tracking-tight leading-none mb-4">
              Project Hub
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-xl">
              Centralized command for your organization's digital assets and publications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search folders..."
                className="pl-11 pr-4 py-4 bg-muted border border-border rounded-xl text-sm font-medium focus:ring-1 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all w-64 placeholder:text-muted-foreground/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => fetchData()}
              className="p-4 bg-muted border border-border rounded-xl text-muted-foreground hover:text-primary hover:bg-card hover:border-primary/20 transition-all shadow-sm"
              title="Sync Database"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => {
                setFolderNameInput('');
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/10"
            >
              <Plus className="w-5 h-5" />
              New Directory
            </button>
          </div>
        </header>

        {/* 2-Column Responsive Layout */}
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          
          {/* Main Content Area - Folder Grid */}
          <div className="lg:col-span-8 xl:col-span-9">
            {folders.length === 0 ? (
              <div className="bg-muted/50 rounded-2xl border border-border py-32 text-center">
                <div className="w-20 h-20 bg-card rounded-2xl border border-border flex items-center justify-center mx-auto mb-8">
                  <FolderIcon className="w-10 h-10 text-muted-foreground/20" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Workspace context is empty</h3>
                <p className="text-muted-foreground font-medium mb-10">Initialize your first directory to start composing publications.</p>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-10 py-4 bg-card border border-border rounded-xl font-bold hover:bg-muted transition-all"
                >
                  Initialize Registry
                </button>
              </div>
            ) : filteredFolders.length === 0 ? (
              <div className="py-32 text-center">
                <p className="text-lg font-medium text-muted-foreground">No folders match "<span className="text-foreground">{searchQuery}</span>"</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-sm font-bold text-primary hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group relative bg-card rounded-2xl border border-border hover:border-primary/20 hover:bg-muted/30 transition-all duration-300 p-8 flex flex-col justify-between min-h-[220px] cursor-pointer"
                    onClick={() => navigate(`/folder/${folder.id}`)}
                  >
                    {/* Actions Group - Top Right */}
                    <div className="absolute top-6 right-6 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder);
                          setFolderNameInput(folder.name);
                        }}
                        className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary/20 transition-all"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderToDelete(folder);
                        }}
                        className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-destructive hover:border-destructive/20 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-start">
                      <div className="w-14 h-14 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                        <FolderIcon className="w-7 h-7" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1 pr-10">
                        {folder.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          {new Date(folder.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary/50 transform group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Workspace Insights */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6 sticky top-28">
            
            {/* Quick Stats Widget */}
            <div className="bg-muted/30 rounded-2xl border border-border p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-card rounded-xl border border-border text-primary shadow-sm">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest">Insights</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">Total Directories</span>
                  <span className="text-xl font-black">{folders.length}</span>
                </div>
                <div className="h-px bg-border w-full" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">Active Publications</span>
                  <span className="text-xl font-black">{stats.publications}</span>
                </div>
                <div className="h-px bg-border w-full" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">Collaborators</span>
                  <span className="text-xl font-black">{stats.collaborators}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity Widget - Refactored for Attribution */}
            <div className="bg-card rounded-2xl border border-border p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-muted rounded-xl border border-border text-purple-500">
                  <ActivityIcon className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest">Activity</h2>
              </div>

              <div className="space-y-6">
                {activities.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground font-bold uppercase text-center py-4">No recent activity</p>
                ) : activities.map((event) => (
                  <div key={`${event.type}-${event.id}`} className="flex gap-4">
                    <div className="mt-1 shrink-0">
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground text-[10px] flex items-center justify-center font-bold tracking-wider border border-border">
                        {event.userInitials}
                      </div>
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm leading-tight mb-1 truncate">
                        <span className="font-bold">{event.userName}</span>
                        <span className="text-muted-foreground"> {event.action} the {event.type} </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-muted-foreground truncate">{event.name}</p>
                        <span className="text-muted-foreground/30">•</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          {getRelativeTime(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        </div>
      </div>

      {/* Modal - Create/Rename */}
      {(isCreateModalOpen || editingFolder) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border animate-in zoom-in-95 duration-200">
            <div className="p-12 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  {editingFolder ? 'Rename Registry' : 'New Directory'}
                </h2>
                <p className="text-muted-foreground font-medium mt-1">
                  {editingFolder ? 'Update identifier' : 'Initialize a new project context'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingFolder(null);
                }}
                className="p-4 hover:bg-muted rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={editingFolder ? handleRenameFolder : handleCreateFolder} className="p-12 space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] ml-1">Identity Name</label>
                <div className="relative">
                  <FolderPlus className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                  <input
                    type="text"
                    className="w-full pl-16 pr-8 py-5 bg-muted border-transparent rounded-xl focus:bg-card focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-bold text-lg"
                    placeholder="e.g. FY26 Executive Summits"
                    value={folderNameInput}
                    onChange={(e) => setFolderNameInput(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isActionLoading || !folderNameInput.trim()}
                className="w-full py-6 bg-primary text-primary-foreground font-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 text-lg uppercase tracking-widest"
              >
                {isActionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : editingFolder ? 'Update Identifier' : 'Initialize Hub'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!folderToDelete}
        title="Destroy Directory"
        message={`Are you sure you want to delete "${folderToDelete?.name}"? All associated magazine assets and reporting data will be permanently purged from the registry.`}
        confirmLabel="Purge Directory"
        onConfirm={confirmDeleteFolder}
        onCancel={() => setFolderToDelete(null)}
        isLoading={isActionLoading}
        variant="danger"
      />
    </WorkspaceLayout>
  );
}
