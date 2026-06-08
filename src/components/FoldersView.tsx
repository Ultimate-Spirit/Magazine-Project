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
  Activity,
  BarChart3,
  Clock,
  Zap,
  Search
} from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from './common/ConfirmModal';
import type { Folder, Company } from '../types';

interface Props {
  onSelectCompany: (company: Company) => void;
}

export function FoldersView({ onSelectCompany }: Props) {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const targetCid = (companyId || '').toLowerCase();

  const [folders, setFolders] = useState<Folder[]>([]);
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

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [compData, folderData, membersData] = await Promise.all([
        supabase.from('companies').select('*').eq('id', targetCid).single(),
        supabase.from('folders').select('*').eq('company_id', targetCid).order('updated_at', { ascending: false }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', targetCid)
      ]);

      if (compData.data) {
        setCompany(compData.data);
        onSelectCompany(compData.data);
      }

      if (folderData.error) throw folderData.error;
      setFolders(folderData.data || []);

      setStats({
        collaborators: membersData.count || 0,
        publications: 0
      });

      if (folderData.data && folderData.data.length > 0) {
        const { count } = await supabase
          .from('pages')
          .select('id', { count: 'exact', head: true })
          .in('folder_id', folderData.data.map(f => f.id));
        
        setStats(prev => ({ ...prev, publications: count || 0 }));
      }

    } catch (err: any) {
      console.error('Fetch Error:', err);
      showNotification('error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetCid, onSelectCompany]);

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
          company_id: targetCid 
        }]);
      
      if (error) throw error;

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <WorkspaceLayout 
      company={company || { id: targetCid, name: 'Workspace' }}
      currentView="project_explorer"
      onNavigateBack={() => navigate('/')}
      onHome={() => navigate('/')}
    >
      <div className="w-full px-8 md:px-12 xl:px-16 py-16">
        {notification && (
          <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        {/* Dashboard Header - Optimized Single Row */}
        <header className="flex flex-wrap items-center justify-between gap-6 mb-16 border-b border-gray-100 pb-12">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">
              <Zap className="w-3 h-3 fill-current" />
              Dynamic Workspace
              {refreshing && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-none mb-4">
              Project Hub
            </h1>
            <p className="text-gray-400 font-medium text-lg max-w-xl">
              Centralized command for your organization's digital assets and publications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="text"
                placeholder="Search folders..."
                className="pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-900 focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all w-64 placeholder:text-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => fetchData()}
              className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-white hover:border-blue-100 transition-all shadow-sm"
              title="Sync Database"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => {
                setFolderNameInput('');
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10"
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
              <div className="bg-gray-50/50 rounded-2xl border border-gray-100 py-32 text-center">
                <div className="w-20 h-20 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mx-auto mb-8">
                  <FolderIcon className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Workspace context is empty</h3>
                <p className="text-gray-400 font-medium mb-10">Initialize your first directory to start composing publications.</p>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-10 py-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Initialize Registry
                </button>
              </div>
            ) : filteredFolders.length === 0 ? (
              <div className="py-32 text-center">
                <p className="text-lg font-medium text-gray-400">No folders match "<span className="text-gray-900">{searchQuery}</span>"</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-sm font-bold text-blue-600 hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group relative bg-white rounded-2xl border border-gray-100 hover:border-blue-500/20 hover:bg-gray-50/30 transition-all duration-300 p-8 flex flex-col justify-between min-h-[220px] cursor-pointer"
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
                        className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderToDelete(folder);
                        }}
                        className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-600 hover:border-red-100 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-start">
                      <div className="w-14 h-14 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                        <FolderIcon className="w-7 h-7" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1 pr-10">
                        {folder.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                          {new Date(folder.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transform group-hover:translate-x-0.5 transition-all" />
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
            <div className="bg-gray-50/30 rounded-2xl border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-white rounded-xl border border-gray-100 text-blue-600 shadow-sm">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Insights</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-400">Total Directories</span>
                  <span className="text-xl font-black text-gray-900">{folders.length}</span>
                </div>
                <div className="h-px bg-gray-100 w-full" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-400">Active Publications</span>
                  <span className="text-xl font-black text-gray-900">{stats.publications}</span>
                </div>
                <div className="h-px bg-gray-100 w-full" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-400">Collaborators</span>
                  <span className="text-xl font-black text-gray-900">{stats.collaborators}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity Widget */}
            <div className="bg-white rounded-2xl border border-gray-100 p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-purple-600">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Activity</h2>
              </div>

              <div className="space-y-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="flex gap-4 group cursor-default">
                    <div className="mt-1 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-600 ring-4 ring-blue-50 group-hover:scale-125 transition-all" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 leading-none mb-1.5 truncate">New Publication Draft</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {i * 2} hours ago
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
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xl z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-12 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                  {editingFolder ? 'Rename Registry' : 'New Directory'}
                </h2>
                <p className="text-gray-400 font-medium mt-1">
                  {editingFolder ? 'Update identifier' : 'Initialize a new project context'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingFolder(null);
                }}
                className="p-4 hover:bg-gray-50 rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-gray-300" />
              </button>
            </div>

            <form onSubmit={editingFolder ? handleRenameFolder : handleCreateFolder} className="p-12 space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Identity Name</label>
                <div className="relative">
                  <FolderPlus className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="text"
                    className="w-full pl-16 pr-8 py-5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all font-bold text-gray-900 text-lg"
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
                className="w-full py-6 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 text-lg uppercase tracking-widest"
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
