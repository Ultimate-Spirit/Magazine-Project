import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Folder as FolderIcon, Plus, Loader2, ChevronRight, LayoutGrid, X, FolderPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import type { Folder, Company } from '../types';

interface Props {
  onSelectCompany: (company: Company) => void;
}

export function FoldersView({ onSelectCompany }: Props) {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [companyRes, foldersRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', companyId).single(),
        supabase.from('folders').select('*').eq('company_id', companyId).order('updated_at', { ascending: false })
      ]);

      if (companyRes.error) {
        console.error('Error fetching company:', companyRes.error);
        showNotification('error', `Company Fetch Error: ${companyRes.error.message}`);
      }
      if (foldersRes.error) {
        console.error('Error fetching folders:', foldersRes.error);
        showNotification('error', `Folders Fetch Error: ${foldersRes.error.message}`);
      }

      if (companyRes.data) {
        setCompany(companyRes.data);
        onSelectCompany(companyRes.data);
      }
      
      if (foldersRes.data) {
        setFolders(foldersRes.data);
      }
    } catch (err: any) {
      console.error('Data fetch error:', err);
      showNotification('error', `Unexpected Error: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, onSelectCompany, profile]);

  useEffect(() => {
    if (companyId) {
      fetchData(true);
    }
  }, [companyId, fetchData]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('folders')
        .insert([{ 
          name: newFolderName.trim(), 
          company_id: companyId 
        }]);
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      showNotification('success', `Folder "${newFolderName}" created successfully`);
      setNewFolderName('');
      setIsModalOpen(false);
      
      // Refresh data
      await fetchData();
    } catch (err: any) {
      console.error('Folder creation exception:', err);
      showNotification('error', `Creation Error: ${err.message}`);
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

  return (
    <WorkspaceLayout 
      company={company || { id: companyId || 'none', name: 'Loading...' }}
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
              Project Directories
              {refreshing && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Workspace Folders</h1>
            <p className="text-gray-400 font-medium mt-2">Organize your magazines and publications into dedicated projects.</p>
            
            <div className="mt-4 p-2 bg-gray-100 rounded text-[10px] font-mono text-gray-500 flex flex-wrap gap-x-4">
              <span>Role: {profile?.role || 'null'}</span>
              <span>C_ID: {profile?.company_id || 'null'}</span>
              <span>U_ID: {profile?.id?.slice(0, 8) || 'null'}</span>
              <span>Loaded: {folders.length}</span>
              <span>Target C_ID: {companyId?.slice(0, 8)}</span>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" />
            New Folder
          </button>
        </header>

        {folders.length === 0 ? (
          <div className="bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 py-32 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
              <FolderIcon className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">This workspace is empty</h3>
            <p className="text-gray-400 font-medium mb-8">Create your first folder to start building magazines.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigate(`/folder/${folder.id}/editor`)}
                className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all text-left flex flex-col justify-between min-h-[220px]"
              >
                <div className="flex items-start justify-between">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <FolderIcon className="w-8 h-8" />
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                    <ChevronRight className="w-5 h-5 text-blue-600" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {folder.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Modified {new Date(folder.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
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
