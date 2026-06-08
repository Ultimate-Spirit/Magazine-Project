import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  Folder as FolderIcon, 
  Plus, 
  Loader2, 
  ChevronRight, 
  LayoutGrid, 
  X, 
  FolderPlus, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Edit2,
  MoreVertical
} from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import type { Folder, Company } from '../types';

interface Props {
  onSelectCompany: (company: Company) => void;
}

export function FoldersView({ onSelectCompany }: Props) {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const targetCid = (companyId || '').toLowerCase();
  const isAdmin = profile?.role === 'admin';

  const [folders, setFolders] = useState<Folder[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
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
      const [compData, folderData] = await Promise.all([
        supabase.from('companies').select('*').eq('id', targetCid).single(),
        supabase.from('folders').select('*').eq('company_id', targetCid).order('updated_at', { ascending: false })
      ]);

      if (compData.data) {
        setCompany(compData.data);
        onSelectCompany(compData.data);
      }

      if (folderData.error) throw folderData.error;
      setFolders(folderData.data || []);

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

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Permanently delete this folder? All magazines inside will be lost.')) return;
    
    try {
      const { error } = await supabase.from('folders').delete().eq('id', id);
      if (error) throw error;
      showNotification('success', 'Folder deleted');
      await fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

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
      <div className="max-w-7xl mx-auto px-10 py-16">
        {notification && (
          <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        <header className="flex items-end justify-between mb-16">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">
              <LayoutGrid className="w-3 h-3" />
              File System Registry
              {refreshing && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-none mb-4">
              Workspace Folders
            </h1>
            <p className="text-gray-400 font-medium text-lg max-w-xl">
              Organized project directories for high-fidelity digital publications and executive reporting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchData()}
              className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 hover:bg-white hover:border-blue-100 transition-all"
              title="Sync Database"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => {
                setFolderNameInput('');
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10"
            >
              <Plus className="w-5 h-5" />
              New Directory
            </button>
          </div>
        </header>

        {folders.length === 0 ? (
          <div className="bg-gray-50/50 rounded-[3rem] border border-gray-100 py-32 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl border border-gray-100 flex items-center justify-center mx-auto mb-8">
              <FolderIcon className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Workspace context is empty</h3>
            <p className="text-gray-400 font-medium mb-10">Initialize your first directory to start composing publications.</p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="px-10 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Initialize Registry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="group relative bg-white rounded-[2.5rem] border border-gray-100 hover:border-blue-500/20 hover:bg-gray-50/30 transition-all duration-300 p-10 flex flex-col justify-between min-h-[260px] cursor-pointer"
                onClick={() => navigate(`/folder/${folder.id}/editor`)}
              >
                {/* Actions Group - Top Right */}
                <div className="absolute top-8 right-8 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolder(folder);
                      setFolderNameInput(folder.name);
                    }}
                    className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all"
                    title="Rename Directory"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteFolder(e, folder.id)}
                    className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-600 hover:border-red-100 transition-all"
                    title="Delete Directory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start">
                  <div className="w-16 h-16 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                    <FolderIcon className="w-8 h-8" />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1 pr-12">
                    {folder.name}
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                      Updated {new Date(folder.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div className="h-1 w-1 rounded-full bg-gray-200" />
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal - Create/Rename */}
      {(isCreateModalOpen || editingFolder) && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xl z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-12 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                  {editingFolder ? 'Rename Directory' : 'New Directory'}
                </h2>
                <p className="text-gray-400 font-medium mt-1">
                  {editingFolder ? 'Update registry identifier' : 'Initialize a new project context'}
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Directory Name</label>
                <div className="relative">
                  <FolderPlus className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="text"
                    className="w-full pl-16 pr-8 py-5 bg-gray-50 border-transparent rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all font-bold text-gray-900 text-lg"
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
                className="w-full py-6 bg-blue-600 text-white font-black rounded-[1.5rem] hover:bg-blue-700 disabled:opacity-50 transition-all shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-3 text-lg uppercase tracking-widest"
              >
                {isActionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : editingFolder ? 'Update Registry' : 'Initialize Context'}
              </button>
            </form>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
