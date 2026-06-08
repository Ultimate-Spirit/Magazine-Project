import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Folder as FolderIcon, Plus, Loader2, ChevronRight, LayoutGrid, X, FolderPlus, AlertCircle, CheckCircle2, RefreshCw, Shield, Trash2 } from 'lucide-react';
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
  
  // Normalize companyId to lowercase UUID format
  const targetCid = (companyId || '').toLowerCase();
  const isAdmin = profile?.role === 'admin';

  const [folders, setFolders] = useState<Folder[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    
    try {
      // 1. Fetch Company Info
      const { data: compData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', targetCid)
        .single();

      if (compData) {
        setCompany(compData);
        onSelectCompany(compData);
      }

      // 2. Fetch ALL folders visible to user
      // If admin, this returns everything in the system
      const { data: folderData, error: folderError } = await supabase
        .from('folders')
        .select('*')
        .order('updated_at', { ascending: false });

      if (folderError) throw folderError;
      
      const results = folderData || [];
      setAllFolders(results);

      // 3. Filter for current workspace
      const local = results.filter(f => f.company_id.toLowerCase() === targetCid);
      setFolders(local);

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
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('folders')
        .insert([{ 
          name: newFolderName.trim(), 
          company_id: targetCid 
        }]);
      
      if (error) throw error;

      showNotification('success', `Created folder "${newFolderName}"`);
      setNewFolderName('');
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Permanently delete this folder?')) return;
    
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) showNotification('error', error.message);
    else {
      showNotification('success', 'Folder deleted');
      fetchData();
    }
  };

  const handleReassignAll = async () => {
    if (!isAdmin) return;
    if (!confirm(`Move all ${allFolders.length} system folders to "${company?.name}"?`)) return;
    
    setRefreshing(true);
    try {
      const { error } = await supabase
        .from('folders')
        .update({ company_id: targetCid })
        .not('id', 'is', null); // Update all
      
      if (error) throw error;
      showNotification('success', 'All folders reassigned successfully');
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Admin sees EVERYTHING, regular users see only their workspace folders
  const displayedFolders = isAdmin ? allFolders : folders;

  return (
    <WorkspaceLayout 
      company={company || { id: targetCid, name: 'Workspace' }}
      currentView="project_explorer"
      onNavigateBack={() => navigate('/')}
      onHome={() => navigate('/')}
    >
      <div className="max-w-7xl mx-auto px-8 py-12">
        {notification && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        <header className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">
              <LayoutGrid className="w-4 h-4" />
              Project Registry
              {refreshing && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              {isAdmin ? 'System Folders' : 'Workspace Folders'}
            </h1>
            
            {isAdmin && (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-xl text-[10px] font-mono shadow-lg">
                  <Shield className="w-3 h-3 text-blue-400" />
                  ADMIN MODE: SHOWING ALL DATA
                </div>
                <div className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold border border-blue-100">
                  {folders.length} matched this CID | {allFolders.length} total in system
                </div>
                {allFolders.length > folders.length && (
                  <button 
                    onClick={handleReassignAll}
                    className="px-3 py-1.5 bg-orange-600 text-white rounded-xl text-[10px] font-bold hover:bg-orange-700 transition-all shadow-md shadow-orange-200"
                  >
                    Fix Data: Reassign all to this workspace
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => fetchData()}
              className="p-4 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 transition-all shadow-sm"
              title="Sync Database"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
            >
              <Plus className="w-5 h-5" />
              New Folder
            </button>
          </div>
        </header>

        {displayedFolders.length === 0 ? (
          <div className="bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 py-32 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
              <FolderIcon className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">The registry is empty</h3>
            <p className="text-gray-400 font-medium mb-8">Create your first folder to begin.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg"
            >
              Initialize Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedFolders.map((folder) => {
              const isMismatch = folder.company_id.toLowerCase() !== targetCid;
              return (
                <button
                  key={folder.id}
                  onClick={() => navigate(`/folder/${folder.id}/editor`)}
                  className={`group bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-2xl transition-all text-left flex flex-col justify-between min-h-[240px] relative overflow-hidden ${isMismatch ? 'border-orange-100 bg-orange-50/20' : 'border-gray-100'}`}
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${isMismatch ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                      <FolderIcon className="w-8 h-8" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-3 bg-white/80 backdrop-blur rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-gray-100">
                        <ChevronRight className="w-5 h-5 text-blue-600" />
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={(e) => handleDeleteFolder(e, folder.id)}
                          className="p-3 bg-white/80 backdrop-blur rounded-xl text-gray-300 hover:text-red-600 transition-all border border-gray-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10">
                    {isMismatch && (
                      <div className="mb-2 inline-block px-2 py-0.5 bg-orange-600 text-white text-[8px] font-black uppercase rounded">
                        ID Mismatch
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {folder.name}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                      Updated {new Date(folder.updated_at).toLocaleDateString()}
                    </p>
                    {isMismatch && (
                      <p className="text-[8px] font-mono text-orange-400 mt-1 truncate">
                        Owner: {folder.company_id}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Simplified Folder Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-10 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">New Project</h2>
                <p className="text-gray-400 font-medium mt-1">Initialize a new folder</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-4 hover:bg-gray-50 rounded-2xl transition-all group"
              >
                <X className="w-6 h-6 text-gray-300 group-hover:text-gray-900" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-10 space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Folder Name</label>
                  <div className="relative">
                    <FolderPlus className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input
                      type="text"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating || !newFolderName.trim()}
                className="w-full py-5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 text-lg"
              >
                {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Create Folder'}
              </button>
            </form>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
