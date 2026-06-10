import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  Folder as FolderIcon, 
  Plus, 
  Loader2, 
  ChevronRight, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Edit2,
  Activity as ActivityIcon,
  BarChart3,
  Clock,
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
        const { count } = await supabase
          .from('pages')
          .select('id', { count: 'exact', head: true })
          .in('folder_id', fetchedFolders.map(f => f.id));
        
        setStats(prev => ({ ...prev, publications: count || 0 }));
      }

      const { data: logData } = await supabase
        .from('activity_logs')
        .select('id, action_type, entity_type, entity_name, created_at, profiles(full_name, email)')
        .eq('company_id', targetCid)
        .order('created_at', { ascending: false })
        .limit(8);

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

      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pages'
          },
          (_payload) => {
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
          (_payload) => {
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
      <div className="w-full px-8 md:px-12 xl:px-16 py-12 md:py-20 text-foreground">
        {notification && (
          <div className={`fixed top-8 right-8 z-[150] px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm tracking-tight">{notification.message}</p>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em]">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Dynamic Repository
              {refreshing && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>
            <h1 className="text-6xl font-display font-black tracking-tighter leading-none">
              Directory Hub
            </h1>
            <p className="text-muted-foreground font-body text-lg max-w-xl leading-relaxed">
              Orchestrate your publication pipeline and manage digital assets within this workspace context.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Find directory..."
                className="pl-12 pr-6 py-4 bg-secondary border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all w-64 placeholder:text-muted-foreground/40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => fetchData()}
              className="p-4 bg-secondary rounded-2xl text-muted-foreground hover:text-primary transition-all"
              title="Sync Workspace"
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
              New Entry
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 xl:col-span-9">
            {folders.length === 0 ? (
              <div className="bg-secondary/40 rounded-[2.5rem] py-32 text-center">
                <div className="w-24 h-24 bg-card rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-sm">
                  <FolderIcon className="w-10 h-10 text-muted-foreground/20" />
                </div>
                <h3 className="text-3xl font-display font-bold mb-3 tracking-tight">Empty Context</h3>
                <p className="text-muted-foreground font-body mb-12 max-w-sm mx-auto">Start your journey by initializing a new publication directory.</p>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-10 py-5 bg-card rounded-2xl font-bold hover:bg-secondary transition-all shadow-sm"
                >
                  Initialize Hub
                </button>
              </div>
            ) : filteredFolders.length === 0 ? (
              <div className="py-32 text-center bg-secondary/20 rounded-[2.5rem]">
                <p className="text-xl font-body font-bold text-muted-foreground">No matches for "<span className="text-foreground">{searchQuery}</span>"</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-6 text-sm font-bold text-primary hover:underline"
                >
                  Reset search filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group relative bg-card rounded-[2rem] hover:bg-secondary transition-all duration-500 p-10 flex flex-col justify-between min-h-[260px] cursor-pointer overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5"
                    onClick={() => navigate(`/folder/${folder.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                        <FolderIcon className="w-8 h-8" />
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolder(folder);
                            setFolderNameInput(folder.name);
                          }}
                          className="p-3 bg-background rounded-xl text-muted-foreground hover:text-primary transition-all shadow-sm"
                          title="Rename"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToDelete(folder);
                          }}
                          className="p-3 bg-background rounded-xl text-muted-foreground hover:text-destructive transition-all shadow-sm"
                          title="Purge"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-display font-bold mb-3 group-hover:text-primary transition-colors tracking-tight line-clamp-1 pr-4">
                        {folder.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {new Date(folder.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:translate-x-1 transition-transform">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="lg:col-span-4 xl:col-span-3 space-y-6 sticky top-32">
            <div className="bg-secondary/40 rounded-[2.5rem] p-10 space-y-10">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Workspace Metrics</h2>
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              
              <div className="grid grid-cols-1 gap-8">
                <div>
                  <p className="text-3xl font-display font-black leading-none">{folders.length}</p>
                  <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">Directories</p>
                </div>
                <div>
                  <p className="text-3xl font-display font-black leading-none">{stats.publications}</p>
                  <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">Active Pages</p>
                </div>
                <div>
                  <p className="text-3xl font-display font-black leading-none">{stats.collaborators}</p>
                  <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">Members</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-[2.5rem] p-10 shadow-sm border border-border/5">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Event Stream</h2>
                <ActivityIcon className="w-4 h-4 text-primary" />
              </div>

              <div className="space-y-8">
                {activities.length === 0 ? (
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center py-8">Quiescent State</p>
                ) : activities.map((event) => (
                  <div key={`${event.type}-${event.id}`} className="flex gap-5">
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-secondary text-primary text-[10px] flex items-center justify-center font-black tracking-tighter shadow-inner">
                        {event.userInitials}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight mb-1 truncate">
                        {event.userName} <span className="text-muted-foreground font-normal lowercase">{event.action} the {event.type}</span>
                      </p>
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{event.name}</p>
                        <span className="text-muted-foreground/20 text-[10px]">•</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                          {getRelativeTime(event.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {(isCreateModalOpen || editingFolder) && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-card rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-16 pb-0 flex items-start justify-between">
              <div className="space-y-4">
                <h2 className="text-5xl font-display font-black tracking-tight leading-none">
                  {editingFolder ? 'Modify <br/> Identity' : 'Initialize <br/> Directory'}
                </h2>
                <p className="text-muted-foreground font-body text-lg leading-relaxed max-w-xs">
                  {editingFolder ? 'Update the metadata for this repository entry.' : 'Define a new context for your publication assets.'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingFolder(null);
                }}
                className="w-14 h-14 bg-secondary flex items-center justify-center rounded-2xl hover:bg-destructive hover:text-destructive-foreground transition-all group"
              >
                <X className="w-6 h-6 transition-transform group-hover:rotate-90" />
              </button>
            </div>

            <form onSubmit={editingFolder ? handleRenameFolder : handleCreateFolder} className="p-16 pt-12 space-y-12">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em] ml-2">Registry Name</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-8 py-6 bg-secondary border-none rounded-[1.5rem] focus:ring-4 focus:ring-primary/5 outline-none transition-all font-display font-bold text-2xl placeholder:text-muted-foreground/20"
                    placeholder="e.g. Q4 Growth Narrative"
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
                className="w-full py-8 bg-primary text-primary-foreground font-display font-black rounded-[1.5rem] hover:opacity-90 disabled:opacity-50 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-4 text-xl tracking-tight"
              >
                {isActionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : editingFolder ? 'Update Registry' : 'Initialize Directory'}
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
