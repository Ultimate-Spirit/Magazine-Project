import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  FileText, 
  Plus, 
  Loader2, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Edit2,
  Clock,
  ArrowLeft,
  Layout
} from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from './common/ConfirmModal';
import { logActivity } from '../lib/activityLogger';
import type { Page, Folder, Company } from '../types';

export function FolderContents() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [pages, setPages] = useState<Page[]>([]);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    
    try {
      // Fetch folder and associated company
      const { data: folderData, error: folderErr } = await supabase
        .from('folders')
        .select('*, companies(*)')
        .eq('id', folderId)
        .single();

      if (folderErr) throw folderErr;
      
      setFolder(folderData);
      setCompany(folderData.companies);

      // Fetch pages inside this folder
      const { data: pagesData, error: pagesErr } = await supabase
        .from('pages')
        .select('*')
        .eq('folder_id', folderId)
        .order('updated_at', { ascending: false });

      if (pagesErr) throw pagesErr;
      setPages(pagesData || []);

    } catch (err: any) {
      console.error('Fetch Error:', err);
      showNotification('error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [folderId]);

  useEffect(() => {
    if (folderId && profile) {
      fetchData(true);
    }
  }, [folderId, profile, fetchData]);

  const confirmDeletePage = async () => {
    if (!pageToDelete) return;
    
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from('pages').delete().eq('id', pageToDelete.id);
      if (error) throw error;

      await logActivity('deleted', 'publication', pageToDelete.title, company?.id || '', profile?.id || '');

      showNotification('success', 'Page deleted successfully');
      setPageToDelete(null);
      await fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const goBack = () => {
    navigate(`/company/${company?.id}/folders`, { replace: true });
  };

  return (
    <WorkspaceLayout 
      company={company || { id: 'none', name: 'Workspace' }}
      currentView="folder_view"
      onNavigateBack={goBack}
      onHome={() => navigate('/', { replace: true })}
    >
      <div className="w-full px-8 md:px-12 xl:px-16 py-16">
        {notification && (
          <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        <header className="flex items-end justify-between mb-16">
          <div>
            <button 
              onClick={goBack}
              className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 hover:text-blue-600 transition-colors group"
            >
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              Back to Directories
            </button>
            <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-none mb-4">
              {folder?.name}
            </h1>
            <p className="text-gray-400 font-medium text-lg max-w-xl">
              Internal documentation and publication registry for this directory.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchData()}
              className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-white hover:border-blue-100 transition-all"
              title="Sync Database"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => navigate(`/folder/${folderId}/editor/new`)}
              className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10"
            >
              <Plus className="w-5 h-5" />
              Create New Page
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-12">
            {pages.length === 0 ? (
              <div className="bg-gray-50/50 rounded-2xl border border-gray-100 py-32 text-center">
                <div className="w-20 h-20 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mx-auto mb-8 text-gray-200">
                  <Layout className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No pages found</h3>
                <p className="text-gray-400 font-medium mb-10">Start by creating a new publication or executive report.</p>
                <button 
                  onClick={() => navigate(`/folder/${folderId}/editor/new`)}
                  className="px-10 py-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Create First Page
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className="group relative bg-white rounded-2xl border border-gray-100 hover:border-blue-500/20 hover:bg-gray-50/30 transition-all duration-300 p-8 flex flex-col justify-between min-h-[200px] cursor-pointer"
                    onClick={() => navigate(`/folder/${folderId}/editor/${page.id}`)}
                  >
                    <div className="absolute top-6 right-6 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/folder/${folderId}/editor/${page.id}`);
                        }}
                        className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPageToDelete(page);
                        }}
                        className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-600 hover:border-red-100 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-start">
                      <div className="w-12 h-12 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                        <FileText className="w-6 h-6" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1 pr-10">
                        {page.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {new Date(page.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transform group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!pageToDelete}
        title="Delete Page"
        message={`Are you sure you want to delete "${pageToDelete?.title}"? This publication will be permanently removed from the registry.`}
        confirmLabel="Purge Page"
        onConfirm={confirmDeletePage}
        onCancel={() => setPageToDelete(null)}
        isLoading={isActionLoading}
        variant="danger"
      />
    </WorkspaceLayout>
  );
}
