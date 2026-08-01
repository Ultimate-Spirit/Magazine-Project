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
  Activity,
  ArrowLeft,
  Layers
} from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from './common/ConfirmModal';
import { CustomSelect } from './common/CustomSelect';
import { logActivity } from '../lib/activityLogger';
import type { Folder, Company, TemplateBundle, Template } from '../types';

interface Props {
  onSelectCompany: (company: Company) => void;
}

export function FoldersView({ onSelectCompany }: Props) {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { profile, permissions } = useAuth();
  
  const targetCid = (companyId || '').toLowerCase();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeBundles, setActiveBundles] = useState<TemplateBundle[]>([]);
  const [coverTemplates, setCoverTemplates] = useState<Template[]>([]);
  const [lastPageTemplates, setLastPageTemplates] = useState<Template[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({ collaborators: 0, publications: 0 });
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [selectedBundleId, setSelectedBundleId] = useState<string>('');
  const [selectedCoverPageId, setSelectedCoverPageId] = useState<string>('');
  const [selectedLastPageId, setSelectedLastPageId] = useState<string>('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial && folders.length === 0) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [compData, folderData, membersData, bundlesData, coverData, lastPageData] = await Promise.all([
        supabase.from('companies').select('*').eq('id', targetCid).single(),
        supabase.from('folders').select('*, template_bundles(*)').eq('company_id', targetCid).order('updated_at', { ascending: false }),
        supabase.from('user_companies').select('user_id').eq('company_id', targetCid),
        supabase.from('template_bundles').select('*').eq('status', 'active'),
        supabase.from('templates').select('*').eq('category', 'Cover').order('template_name'),
        supabase.from('templates').select('*').eq('category', 'Last Page').order('template_name')
      ]);

      if (compData.data) {
        setCompany(compData.data);
        onSelectCompany(compData.data);
      }

      if (folderData.error) throw folderData.error;
      setFolders(folderData.data || []);

      if (bundlesData.data) {
        setActiveBundles(bundlesData.data);
      }

      if (coverData.data) setCoverTemplates(coverData.data);
      if (lastPageData.data) setLastPageTemplates(lastPageData.data);

      const authorizedMemberIds = (membersData.data || []).map(m => m.user_id);
      setStats({ collaborators: authorizedMemberIds.length || 0, publications: 0 });

      if (folderData.data && folderData.data.length > 0) {
        const { count } = await supabase
          .from('pages')
          .select('id', { count: 'exact', head: true })
          .in('folder_id', folderData.data.map(f => f.id));
        setStats(prev => ({ ...prev, publications: count || 0 }));
      }

      const { data: logData } = await supabase
        .from('activity_logs')
        .select('id, action_type, entity_type, entity_name, created_at, profiles(full_name, email)')
        .eq('company_id', targetCid)
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
    
    // Extract raw values to prevent string 'null'
    let finalBundleId = selectedBundleId;
    if (finalBundleId === 'null' || finalBundleId === '' || !finalBundleId) finalBundleId = null;

    let finalCoverId = selectedCoverPageId;
    if (finalCoverId === 'null' || finalCoverId === '' || !finalCoverId) finalCoverId = null;

    let finalLastPageId = selectedLastPageId;
    if (finalLastPageId === 'null' || finalLastPageId === '' || !finalLastPageId) finalLastPageId = null;
    
    // Explicitly block if cover or last page is not valid (User explicitly requested they be mandatory)
    if (!finalCoverId || !finalLastPageId) {
      showNotification('error', 'Both a Cover and a Last Page are required to create a bundle.');
      return;
    }
    
    setIsActionLoading(true);
    try {
      // Build payload cleanly, omitting undefined/null fields entirely to mathematically guarantee no "null" string insertion
      const folderPayload: any = { 
        name: folderNameInput.trim(), 
        company_id: targetCid 
      };
      
      if (finalBundleId) folderPayload.bundle_id = finalBundleId;
      if (profile?.id && profile.id !== 'null') {
        folderPayload.created_by = profile.id;
        folderPayload.owner_id = profile.id;
      }

      const { data: folderData, error } = await supabase
        .from('folders')
        .insert([folderPayload])
        .select()
        .single();
      
      if (error) throw error;

      const newFolder = folderData;

      let bundleTemplates: any[] = [];
      if (finalBundleId) {
        const { data } = await supabase
          .from('templates')
          .select('*')
          .eq('bundle_id', finalBundleId)
          .order('weight', { ascending: true });
        if (data) bundleTemplates = data;
      }

      const coverTemplate = finalCoverId ? coverTemplates.find(t => t.id === finalCoverId) : null;
      const lastPageTemplate = finalLastPageId ? lastPageTemplates.find(t => t.id === finalLastPageId) : null;

      const allTemplatesToInsert = [];
      if (coverTemplate) allTemplatesToInsert.push(coverTemplate);
      if (bundleTemplates.length > 0) allTemplatesToInsert.push(...bundleTemplates);
      if (lastPageTemplate) allTemplatesToInsert.push(lastPageTemplate);

      const pagesToInsert = allTemplatesToInsert.map(template => {
        const pagePayload: any = {
          folder_id: newFolder.id,
          title: template.template_name,
          data: template.layout_json || { background_url: '', fields: [] },
          template_id: template.id
        };
        if (profile?.id && profile.id !== 'null') {
          pagePayload.created_by = profile.id;
        }
        return pagePayload;
      });

      if (pagesToInsert.length > 0) {
        const { error: pagesError } = await supabase.from('pages').insert(pagesToInsert);
        if (pagesError) throw pagesError;
      }

      await logActivity('created', 'folder', folderNameInput.trim(), targetCid, profile?.id || '');
      showNotification('success', 'Directory initialized');
      
      // Instantly update UI state
      setFolders([newFolder, ...folders]);
      
      setFolderNameInput('');
      setSelectedBundleId('');
      setSelectedCoverPageId('');
      setSelectedLastPageId('');
      setIsCreateModalOpen(false);
      
      // Navigate to the newly created folder
      navigate(`/folder/${newFolder.id}`);
    } catch (err: any) {
      console.error('Folder Creation Error:', err);
      showNotification('error', err.message || 'Failed to create folder.');
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

  const filteredFolders = (folders || []).filter(f => 
    f.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
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
      <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-background font-sans invisible-scrollbar">
        {notification && (
          <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-foreground text-background' : 'bg-destructive text-destructive-foreground'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 lg:gap-12 mb-8 px-6 pt-8 shrink-0">
          <div className="space-y-3 lg:space-y-4">
            <button 
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-3 py-1.5 micro-surface border border-border/10 rounded-full text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-2 hover:text-foreground hover:bg-secondary transition-all group"
            >
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
            <div className="flex items-center gap-2 lg:gap-3 text-[9px] lg:text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.4em]">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              Dynamic Repository
              {refreshing && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>
            <h1 className="text-2xl lg:text-6xl font-display font-black text-foreground tracking-tighter leading-none">
              Directory Hub
            </h1>

            <p className="text-muted-foreground/60 font-body text-sm lg:text-lg max-w-xl leading-relaxed">
              Orchestrate your publication pipeline and manage digital assets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
            <div className="relative group w-full md:w-auto flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Find directory..."
                className="w-full h-8 pl-9 pr-3 micro-surface border border-border/50 rounded-lg text-xs font-medium text-foreground focus:ring-2 focus:ring-primary/10 outline-none transition-all md:w-64 placeholder:text-muted-foreground/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => fetchData()}
                className="w-8 h-8 flex items-center justify-center micro-surface rounded-lg text-muted-foreground/50 hover:text-primary transition-all border border-border/50"
                title="Sync Workspace"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              {permissions?.can_create_folders && (
                <button 
                  onClick={() => {
                    setFolderNameInput('');
                    setSelectedBundleId('');
                    setSelectedCoverPageId('');
                    setSelectedLastPageId('');
                    setIsCreateModalOpen(true);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 h-8 px-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all text-xs border border-border/50 shadow-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Directory
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-y-auto px-6 pb-6 w-full">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-0">
            <div className="lg:col-span-8 xl:col-span-9 space-y-6 flex flex-col">
              {(!folders || folders.length === 0) ? (
                <div className="micro-surface rounded-xl p-6 text-center border border-border/50">
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-4 border border-border/50">
                    <FolderIcon className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Empty Context</h3>
                  <p className="text-xs text-muted-foreground mb-6 max-w-sm mx-auto">Start your journey by initializing a new publication directory.</p>
                  {permissions?.can_create_folders && (
                    <button 
                      onClick={() => setIsCreateModalOpen(true)}
                      className="h-8 px-3 micro-surface border border-border/50 rounded-lg font-medium text-xs text-foreground hover:bg-secondary transition-all"
                    >
                      Initialize Hub
                    </button>
                  )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="group relative flex flex-col justify-between cursor-pointer overflow-hidden border border-border/10 bg-card/40 hover:bg-card/80 hover:border-primary/50 transition-all duration-500 p-5 rounded-2xl aspect-[4/3]"
                      onClick={() => navigate(`/folder/${folder.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 bg-background/50 rounded-lg flex items-center justify-center text-muted-foreground/70 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 border border-border/10">
                          <FolderIcon className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 shrink-0">
                          {(permissions?.can_edit_all_folders || (permissions?.can_edit_own_folders && folder.created_by === profile?.id)) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolder(folder);
                                setFolderNameInput(folder.name);
                              }}
                              className="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground/40 hover:text-primary transition-all bg-background/50 backdrop-blur-md"
                              title="Rename"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(permissions?.can_delete_all_folders || (permissions?.can_delete_own_folders && folder.created_by === profile?.id)) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFolderToDelete(folder);
                              }}
                              className="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground/40 hover:text-destructive transition-all bg-background/50 backdrop-blur-md"
                              title="Purge"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 flex items-center justify-center py-4">
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors tracking-tight text-center line-clamp-2 px-2">
                          {folder.name || 'Unnamed Directory'}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${folder?.template_bundles ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'} text-[9px] font-bold uppercase tracking-widest border`}>
                          <Layers className="w-3 h-3" />
                          {folder?.template_bundles?.bundle_name || 'Legacy'}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                          {getRelativeTime(folder.updated_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="lg:col-span-4 xl:col-span-3 flex flex-col h-full min-h-0">
              <div className="flex-1 bg-card/40 border border-border/10 rounded-[1.5rem] p-4 lg:p-6 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/40 rounded-2xl p-4 border border-border/10">
                    <p className="label-premium mb-1">USERS</p>
                    <p className="text-xl font-semibold text-foreground tracking-tight">{stats.collaborators || 0}</p>
                  </div>
                  <div className="bg-background/40 rounded-2xl p-4 border border-border/10">
                    <p className="label-premium mb-1">PAGES</p>
                    <p className="text-xl font-semibold text-foreground tracking-tight">{stats.publications || 0}</p>
                  </div>
                </div>

                <div className="flex-1 bg-background/40 rounded-2xl border border-border/10 overflow-hidden flex flex-col min-h-[300px]">
                  <div className="p-4 border-b border-border/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity size={14} className="text-primary/60" />
                      <span className="label-premium">EVENT STREAM</span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto invisible-scrollbar">
                    <div className="flex flex-col gap-2">
                      {(!activities || activities.length === 0) ? (
                        <div className="py-20 text-center text-muted-foreground/20 italic label-premium">No local actions recorded.</div>
                      ) : activities.map((log) => (
                        <div key={log.id} className="flex items-center gap-3 p-2 rounded-xl transition-all duration-300">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-[10px] text-muted-foreground/50 shrink-0">
                            {((log.profiles?.full_name || log.profiles?.email || '?')[0] || '?').toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {log.profiles?.full_name || log.profiles?.email?.split('@')[0] || 'Unknown'}
                              <span className="text-muted-foreground font-normal ml-1.5 text-xs">{log.action_type} {log.entity_type}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{log.entity_name || 'Asset'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>

        <ConfirmModal
          isOpen={isCreateModalOpen || !!editingFolder}
          title={editingFolder ? "Rename Directory" : "Initialize Directory"}
          message={editingFolder ? `Change the identifier for "${editingFolder?.name}"` : "Define a new organizational context for your publications."}
          confirmLabel={editingFolder ? "Rename" : "Initialize"}
          onConfirm={() => {}}
          onCancel={() => {
            setIsCreateModalOpen(false);
            setEditingFolder(null);
            setFolderNameInput('');
            setSelectedBundleId('');
            setSelectedCoverPageId('');
            setSelectedLastPageId('');
          }}
          variant="info"
        >
          <form onSubmit={editingFolder ? handleUpdateFolder : handleCreateFolder} className="mt-6 space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">Directory Name</label>
              <input
                autoFocus
                className="w-full h-8 px-3 micro-surface border border-border/50 rounded-lg focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-foreground text-xs"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                placeholder="e.g. Q4 Executive Reports"
              />
            </div>
            
            {!editingFolder && (
              <>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">Blueprint Template</label>
                  <CustomSelect
                    value={selectedBundleId}
                    onChange={setSelectedBundleId}
                    placeholder="Select a Blueprint Bundle..."
                    options={(activeBundles || []).map(bundle => ({ value: bundle.id, label: bundle?.bundle_name || 'Unnamed Bundle' }))}
                  />
                </div>

                <div className="space-y-2 text-left mt-3">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">Cover Page Template</label>
                  <CustomSelect
                    value={selectedCoverPageId}
                    onChange={setSelectedCoverPageId}
                    placeholder="Select a Cover Page..."
                    options={(coverTemplates || []).map(template => ({ value: template.id, label: template?.template_name || 'Unnamed Template' }))}
                  />
                </div>

                <div className="space-y-2 text-left mt-3">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">Last Page Template</label>
                  <CustomSelect
                    value={selectedLastPageId}
                    onChange={setSelectedLastPageId}
                    placeholder="Select a Last Page..."
                    options={(lastPageTemplates || []).map(template => ({ value: template.id, label: template?.template_name || 'Unnamed Template' }))}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isActionLoading || !folderNameInput.trim() || (!editingFolder && (!selectedCoverPageId || !selectedLastPageId))}
              className="w-full h-9 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs border border-border/50"
            >
              {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingFolder ? "Apply Changes" : "Initialize Directory")}
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
