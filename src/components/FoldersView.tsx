import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  Folder as FolderIcon, 
  Plus, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Edit2,
  Search,
  Activity
} from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from './common/ConfirmModal';
import { logActivity } from '../lib/activityLogger';
import type { Folder, Company } from '../types';

interface Props {
  onSelectCompany: (company: Company) => void;
}

export function FoldersView({ onSelectCompany }: Props) {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { profile, permissions } = useAuth();
  
  const targetCid = (companyId || '').toLowerCase();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({ collaborators: 0, publications: 0 });
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = useCallback(async (isInitial = false) => {
    // Only trigger hard loading if we have no data to prevent scroll reset
    if (isInitial && folders.length === 0) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [compData, folderData, membersData] = await Promise.all([
        supabase.from('companies').select('*').eq('id', targetCid).single(),
        supabase.from('folders').select('*').eq('company_id', targetCid).order('updated_at', { ascending: false }),
        supabase.from('user_companies').select('user_id').eq('company_id', targetCid)
      ]);

      if (compData.data) {
        setCompany(compData.data);
        onSelectCompany(compData.data);
      }

      if (folderData.error) throw folderData.error;
      const fetchedFolders = folderData.data || [];
      setFolders(fetchedFolders);

      // Members scoping: Filter by user_companies junction for this specific workspace
      const authorizedMemberIds = (membersData.data || []).map(m => m.user_id);

      setStats({
        collaborators: authorizedMemberIds.length || 0,
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
        .eq('company_id', targetCid) // Strict scoping
        .order('created_at', { ascending: false })
        .limit(8);

      if (logData) setActivities(logData);

    } catch (err: any) {
      console.error('Fetch Error:', err);
      showNotification('error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetCid, onSelectCompany, folders.length]);

  useEffect(() => {
    if (targetCid && profile) {
      fetchData(true);
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
          company_id: targetCid,
          created_by: profile?.id
        }]);

      if (error) throw error;

      await logActivity('created', 'folder', folderNameInput.trim(), targetCid, profile?.id || '');

      showNotification('success', 'Directory initialized');
      setFolderNameInput('');
      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !folderNameInput.trim()) return;

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('folders')
        .update({ name: folderNameInput.trim(), updated_at: new Date().toISOString() })
        .eq('id', editingFolder.id);

      if (error) throw error;

      await logActivity('updated', 'folder', folderNameInput.trim(), targetCid, profile?.id || '');

      showNotification('success', 'Directory renamed');
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
      <div className="min-h-screen flex items-center justify-center bg-background font-sans">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.5em] animate-pulse">Syncing Environment</p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceLayout 
      company={company || { id: 'none', name: 'Select Company' }}
    >
      <div className="flex-1 flex flex-col overflow-hidden bg-background font-sans invisible-scrollbar">
        {notification && (
          <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-foreground text-background' : 'bg-destructive text-destructive-foreground'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20 px-8 md:px-12 xl:px-16 pt-12 shrink-0">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.4em]">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              Dynamic Repository
              {refreshing && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>
            <h1 className="text-6xl font-display font-black text-foreground tracking-tighter leading-none">
              Directory Hub
            </h1>
            <p className="text-muted-foreground/60 font-body text-lg max-w-xl leading-relaxed">
              Orchestrate your publication pipeline and manage digital assets within this workspace context.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Find directory..."
                className="pl-12 pr-6 py-4 micro-surface border border-border/10 rounded-2xl text-sm font-black text-foreground focus:ring-2 focus:ring-primary/10 outline-none transition-all w-64 placeholder:text-muted-foreground/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => fetchData()}
              className="p-4 micro-surface rounded-2xl text-muted-foreground/40 hover:text-primary transition-all border border-border/10"
              title="Sync Workspace"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {permissions?.can_create_folders && (
              <button 
                onClick={() => {
                  setFolderNameInput('');
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-black rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10"
              >
                <Plus className="w-5 h-5" />
                New Directory
              </button>
            )}
            </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 md:px-12 xl:px-16 pb-12">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-8 xl:col-span-9 space-y-10">
              {folders.length === 0 ? (
                <div className="micro-surface rounded-[3rem] py-32 text-center border border-border/10">
                  <div className="w-24 h-24 bg-secondary rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-border/5">
                    <FolderIcon className="w-10 h-10 text-muted-foreground/20" />
                  </div>
                  <h3 className="text-3xl font-display font-black text-foreground mb-3 tracking-tighter">Empty Context</h3>
                  <p className="text-muted-foreground/50 font-medium mb-12 max-w-sm mx-auto">Start your journey by initializing a new publication directory.</p>
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-10 py-5 micro-surface border border-border/10 rounded-2xl font-black text-foreground hover:bg-secondary transition-all uppercase tracking-widest text-[10px]"
                  >
                    Initialize Hub
                  </button>
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="py-32 text-center micro-surface rounded-[2.5rem] border border-border/10">
                  <p className="text-xl font-body font-black text-muted-foreground/40">No matches for "<span className="text-foreground">{searchQuery}</span>"</p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-6 text-[10px] font-black text-primary hover:underline uppercase tracking-[0.2em]"
                  >
                    Reset search filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="group relative bento-card micro-surface micro-surface-hover flex flex-col justify-between min-h-[260px] cursor-pointer overflow-hidden border border-border/10 hover:border-primary/30 transition-all duration-500"
                      onClick={() => navigate(`/folder/${folder.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-16 h-16 micro-surface rounded-2xl flex items-center justify-center text-muted-foreground/30 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 border border-border/10">
                          <FolderIcon className="w-8 h-8" />
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                          {(permissions?.can_edit_all_folders || (permissions?.can_edit_own_folders && folder.created_by === profile?.id)) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolder(folder);
                                setFolderNameInput(folder.name);
                              }}
                              className="p-3 micro-surface border border-border/10 rounded-xl text-muted-foreground/40 hover:text-primary transition-all"
                              title="Rename"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {(permissions?.can_delete_all_folders || (permissions?.can_delete_own_folders && folder.created_by === profile?.id)) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFolderToDelete(folder);
                              }}
                              className="p-3 micro-surface border border-border/10 rounded-xl text-muted-foreground/40 hover:text-destructive transition-all"
                              title="Purge"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-2xl font-display font-black text-foreground mb-3 group-hover:text-primary transition-colors tracking-tighter line-clamp-1 pr-4">
                          {folder.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-lg micro-surface text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest border border-border/10">
                            {getRelativeTime(folder.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="lg:col-span-4 xl:col-span-3 space-y-8">
              {/* Local Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="micro-surface rounded-[2rem] p-8 border border-border/10">
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">Users</p>
                  <p className="text-3xl font-black text-foreground tracking-tight">{stats.collaborators}</p>
                </div>
                <div className="micro-surface rounded-[2rem] p-8 border border-border/10">
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">Pages</p>
                  <p className="text-3xl font-black text-foreground tracking-tight">{stats.publications}</p>
                </div>
              </div>

              {/* Event Stream */}
              <div className="micro-surface rounded-[2.5rem] border border-border/10 overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-6 faint-divider flex items-center justify-between bg-card/20">
                  <div className="flex items-center gap-3">
                    <Activity size={14} className="text-primary/60" />
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Event Stream</span>
                  </div>
                </div>
                <div className="p-4 flex-1 overflow-y-auto invisible-scrollbar">
                  <div className="space-y-1">
                    {activities.length === 0 ? (
                      <div className="py-20 text-center text-muted-foreground/20 italic text-[10px] font-bold uppercase tracking-widest">No local actions recorded.</div>
                    ) : activities.map((log) => (
                      <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl micro-surface-hover group transition-all duration-300">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-black text-[10px] text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all border border-border/5">
                          {(log.profiles?.full_name || log.profiles?.email || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-foreground truncate">
                            {log.profiles?.full_name || log.profiles?.email.split('@')[0]}
                            <span className="text-muted-foreground/50 font-medium ml-1.5 lowercase italic tracking-tight">{log.action_type} {log.entity_type}</span>
                          </p>
                          <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest truncate">{log.entity_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Modals */}
        <ConfirmModal
          isOpen={isCreateModalOpen || !!editingFolder}
          title={editingFolder ? "Rename Directory" : "Initialize Directory"}
          message={editingFolder ? `Change the identifier for "${editingFolder.name}"` : "Define a new organizational context for your publications."}
          confirmLabel={editingFolder ? "Rename" : "Initialize"}
          onConfirm={() => {}} // Not used as form handles submission
          onCancel={() => {
            setIsCreateModalOpen(false);
            setEditingFolder(null);
            setFolderNameInput('');
          }}
          variant="info"
        >
          <form onSubmit={editingFolder ? handleUpdateFolder : handleCreateFolder} className="mt-8 space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-1">Directory Name</label>
              <input
                autoFocus
                className="w-full px-6 py-4 micro-surface border border-border/10 rounded-2xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-black text-foreground text-sm tracking-tight"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                placeholder="e.g. Q4 Executive Reports"
              />
            </div>
            <button
              type="submit"
              disabled={isActionLoading || !folderNameInput.trim()}
              className="w-full py-5 bg-primary text-primary-foreground font-black rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em]"
            >
              {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingFolder ? "Apply Changes" : "Initialize Directory")}
            </button>
          </form>
        </ConfirmModal>

        <ConfirmModal
          isOpen={!!folderToDelete}
          title="Delete Directory"
          message={`Are you sure you want to purge the "${folderToDelete?.name}" context? This action is irreversible and all publications within will be lost.`}
          confirmLabel="Purge Directory"
          onConfirm={confirmDeleteFolder}
          onCancel={() => setFolderToDelete(null)}
          isLoading={isActionLoading}
          variant="danger"
        />
      </div>
    </WorkspaceLayout>
  );
}
