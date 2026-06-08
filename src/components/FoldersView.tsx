import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Folder as FolderIcon, Plus, Loader2, ChevronRight, LayoutGrid, X, FolderPlus, AlertCircle, CheckCircle2, RefreshCw, Shield, Database, Layout } from 'lucide-react';
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
  const isAdmin = profile?.role === 'admin';

  const [folders, setFolders] = useState<Folder[]>([]);
  const [allSystemFolders, setAllSystemFolders] = useState<Folder[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGlobalOverride, setShowGlobalOverride] = useState(false);
  
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
      const { data: compData, error: compError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (compError) {
        console.error('Company Error:', compError);
      } else {
        setCompany(compData);
        onSelectCompany(compData);
      }

      // 2. Fetch Folders
      // For Admins, we fetch EVERY folder in the system to ensure no data is lost
      const folderQuery = isAdmin 
        ? supabase.from('folders').select('*').order('updated_at', { ascending: false })
        : supabase.from('folders').select('*').eq('company_id', companyId).order('updated_at', { ascending: false });

      const { data: folderData, error: folderError } = await folderQuery;

      if (folderError) {
        console.error('Folders Fetch Error:', folderError);
        showNotification('error', `Database visibility error: ${folderError.message}`);
      }
      
      const results = folderData || [];
      setAllSystemFolders(results);

      // 3. Filter for this company
      const companyFolders = results.filter(f => f.company_id === companyId);
      setFolders(companyFolders);

      // If we are admin and see nothing for this company but folders exist elsewhere, log it
      if (isAdmin && companyFolders.length === 0 && results.length > 0) {
        console.warn(`Admin View: 0 folders for ${companyId}, but ${results.length} total folders exist in DB.`);
      }

    } catch (err: any) {
      console.error('Fetch Error:', err);
      showNotification('error', `Connectivity Error: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, onSelectCompany, isAdmin]);

  useEffect(() => {
    if (companyId && profile) {
      fetchData(true);
    }
  }, [companyId, profile, fetchData]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert([{ 
          name: newFolderName.trim(), 
          company_id: companyId 
        }])
        .select();
      
      if (error) throw error;

      console.log('Successfully created folder:', data);
      showNotification('success', `Folder "${newFolderName}" created successfully!`);
      setNewFolderName('');
      setIsModalOpen(false);
      
      await fetchData();
    } catch (err: any) {
      console.error('Creation Error:', err);
      showNotification('error', `Failed to create folder: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Choose which list to display
  const activeFolders = showGlobalOverride ? allSystemFolders : folders;

  return (
    <WorkspaceLayout 
      company={company || { id: companyId || 'none', name: 'Select Company' }}
      currentView="project_explorer"
      onNavigateBack={() => navigate('/')}
      onHome={() => navigate('/')}
    >
      <div className="max-w-7xl mx-auto px-8 py-12 relative">
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
              {showGlobalOverride ? 'Global Folder Repository' : 'Project Directories'}
              {refreshing && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              {showGlobalOverride ? 'All Platform Data' : 'Workspace Folders'}
            </h1>
            <p className="text-gray-400 font-medium mt-2">
              {showGlobalOverride 
                ? `Currently viewing all ${allSystemFolders.length} folders from every company.` 
                : 'Manage your organization publications and project reports.'}
            </p>

            {/* Admin Management Toolbar */}
            {isAdmin && (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="bg-gray-900 text-white px-4 py-2 rounded-xl flex items-center gap-3 shadow-xl">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <div className="text-[10px] font-mono leading-none">
                    <p className="text-gray-500 mb-1 font-bold">ADMIN CONSOLE</p>
                    <p>{folders.length} Matches | {allSystemFolders.length} Global</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowGlobalOverride(!showGlobalOverride)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${showGlobalOverride ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'}`}
                >
                  {showGlobalOverride ? 'Switch to Company View' : 'Show Global Repository'}
                </button>

                <button 
                  onClick={() => fetchData()}
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 border border-gray-100 transition-all"
                  title="Full Database Re-sync"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" />
            New Folder
          </button>
        </header>

        {activeFolders.length === 0 ? (
          <div className="bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 py-32 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
              <FolderIcon className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No folders found</h3>
            <p className="text-gray-400 font-medium mb-8">
              {showGlobalOverride ? 'The database is completely empty.' : 'This company has no folders yet. Create one to get started.'}
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg"
              >
                Create First Folder
              </button>
              {isAdmin && !showGlobalOverride && allSystemFolders.length > 0 && (
                <button 
                  onClick={() => setShowGlobalOverride(true)}
                  className="px-8 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-500"
                >
                  Check Global Repository ({allSystemFolders.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeFolders.map((folder) => {
              const isMismatch = folder.company_id !== companyId;
              return (
                <button
                  key={folder.id}
                  onClick={() => navigate(`/folder/${folder.id}/editor`)}
                  className={`group bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-2xl transition-all text-left flex flex-col justify-between min-h-[240px] relative overflow-hidden ${isMismatch ? 'border-orange-100 opacity-80 grayscale-[0.5]' : 'border-gray-100'}`}
                >
                  {isMismatch && (
                    <div className="absolute top-0 right-0 bg-orange-600 text-white px-4 py-1 text-[8px] font-black uppercase tracking-tighter rounded-bl-xl z-20">
                      Cross-Workspace Row
                    </div>
                  )}

                  <div className="flex items-start justify-between relative z-10">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${isMismatch ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                      <FolderIcon className="w-8 h-8" />
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <ChevronRight className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2 pr-4">
                      {folder.name}
                    </h3>
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Updated {new Date(folder.updated_at).toLocaleDateString()}
                      </span>
                      {isMismatch && (
                        <span className="text-[8px] font-mono text-orange-400 font-bold truncate">
                          Owner: {folder.company_id.slice(0, 12)}...
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Folder Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">New Project Folder</h2>
                <p className="text-gray-400 font-medium mt-1">Organize your publications</p>
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
                      placeholder="e.g. Q4 Executive Reports"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[10px] text-blue-700 leading-relaxed">
                  Creating this folder for: <span className="font-bold">{company?.name || 'Current Workspace'}</span><br/>
                  <span className="font-mono opacity-60">{companyId}</span>
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
