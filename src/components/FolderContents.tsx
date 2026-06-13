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
  const { profile, permissions } = useAuth();
  
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const goBack = () => {
    navigate(`/company/${company?.id}/folders`, { replace: true });
  };

  return (
    <WorkspaceLayout 
      company={company || { id: 'none', name: 'Workspace' }}
    >
      <div className="w-full px-5 lg:px-10 xl:px-16 py-8 lg:py-16 text-foreground">
        {notification && (
          <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-foreground text-background' : 'bg-destructive text-destructive-foreground'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        <header className="flex flex-wrap items-end justify-between gap-6 mb-12 lg:mb-16 px-1">
          <div className="w-full md:w-auto">
            <button 
              onClick={goBack}
              className="inline-flex items-center gap-2 px-4 py-2 micro-surface border border-border/10 rounded-full text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-4 hover:text-foreground hover:bg-secondary transition-all group"
            >
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              Back to Directories
            </button>
            <h1 className="text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-none mb-4">
              {folder?.name}
            </h1>
            <p className="text-muted-foreground/60 font-medium text-base lg:text-lg max-w-xl">
              Internal documentation and publication registry for this directory.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => fetchData()}
              className="p-4 micro-surface border border-border/10 rounded-xl text-muted-foreground/40 hover:text-primary transition-all flex-shrink-0"
              title="Sync Database"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {permissions?.can_create_publications && (
              <button 
                onClick={() => navigate(`/folder/${folderId}/editor/new`)}
                className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-black rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10"
              >
                <Plus className="w-5 h-5" />
                Create New Page
              </button>
            )}
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-12">
            {pages.length === 0 ? (
              <div className="micro-surface rounded-[2.5rem] border border-border/10 py-32 text-center">
                <div className="w-20 h-20 bg-secondary rounded-2xl border border-border/5 flex items-center justify-center mx-auto mb-8 text-muted-foreground/20">
                  <Layout className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black mb-2 tracking-tight">No pages found</h3>
                <p className="text-muted-foreground/50 font-medium mb-10">Start by creating a new publication or executive report.</p>
                {permissions?.can_create_publications && (
                  <button 
                    onClick={() => navigate(`/folder/${folderId}/editor/new`)}
                    className="px-10 py-4 micro-surface border border-border/10 rounded-xl font-bold hover:bg-secondary transition-all uppercase tracking-widest text-[10px]"
                  >
                    Create First Page
                  </button>
                )}
              </div>

            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className="group relative bento-card micro-surface micro-surface-hover border border-border/10 hover:border-primary/30 transition-all duration-500 p-8 flex flex-col justify-between min-h-[220px] cursor-pointer"
                    onClick={() => navigate(`/folder/${folderId}/editor/${page.id}`)}
                  >
                    <div className="absolute top-6 right-6 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                      {(permissions?.can_edit_all_publications || (permissions?.can_edit_own_publications && page.created_by === profile?.id)) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/folder/${folderId}/editor/${page.id}`);
                          }}
                          className="p-2.5 micro-surface border border-border/10 rounded-xl text-muted-foreground/40 hover:text-primary transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(permissions?.can_delete_all_publications || (permissions?.can_delete_own_publications && page.created_by === profile?.id)) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPageToDelete(page);
                          }}
                          className="p-2.5 micro-surface border border-border/10 rounded-xl text-muted-foreground/40 hover:text-destructive transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-start">
                      <div className="w-12 h-12 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-center text-primary/40 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                        <FileText className="w-6 h-6" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-1 pr-10 tracking-tight">
                        {page.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(page.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
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
