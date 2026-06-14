import { useEffect, useState, useCallback, useRef } from 'react';
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
  Layout,
  Printer,
  GripVertical,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from './common/ConfirmModal';
import { logActivity } from '../lib/activityLogger';
import type { Page, Folder, Company, Template } from '../types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import jsPDF from 'jspdf';
import { PrintTemplate } from './PrintTemplate';
import React from 'react';

export function FolderContents() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { profile, permissions } = useAuth();
  
  const [pages, setPages] = useState<Page[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Hydration & Mounting Stability
  const [isMounted, setIsMounted] = useState(false);
  const [isCompilerOpen, setIsCompilerOpen] = useState(false);
  const [compilerPages, setCompilerPages] = useState<Page[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    
    try {
      // 1. Fetch folder with bundle
      const { data: folderData, error: folderErr } = await supabase
        .from('folders')
        .select('*, companies(*), template_bundles(*)')
        .eq('id', folderId)
        .single();

      if (folderErr) throw folderErr;
      
      setFolder(folderData);
      setCompany(folderData?.companies || null);

      // 2. Fetch all templates for this bundle, sorted by weight
      if (folderData.bundle_id) {
        const { data: templatesData, error: templatesErr } = await supabase
          .from('templates')
          .select('*')
          .eq('bundle_id', folderData.bundle_id)
          .order('weight', { ascending: true });
        
        if (templatesErr) throw templatesErr;
        setTemplates(templatesData || []);
      }

      // 3. Fetch all pages in this folder
      const { data: pagesData, error: pagesErr } = await supabase
        .from('pages')
        .select('*, templates(*)')
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

  const handleStartDraft = async (template: Template) => {
    if (!permissions?.can_create_publications) {
      showNotification('error', 'Unauthorized to create publications');
      return;
    }

    setIsActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .insert([{
          folder_id: folderId,
          title: template.template_name,
          template_id: template.id,
          data: template.payload || {},
          created_by: profile?.id
        }])
        .select()
        .single();

      if (error) throw error;

      await logActivity('created', 'publication', template.template_name, company?.id || '', profile?.id || '');
      
      showNotification('success', 'Draft initialized successfully');
      navigate(`/folder/${folderId}/editor/${data.id}`);
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

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

  const openCompiler = () => {
    const sorted = [...(pages || [])].sort((a, b) => {
      const weightA = a.templates?.weight ?? 10;
      const weightB = b.templates?.weight ?? 10;
      return weightA - weightB;
    });
    setCompilerPages(sorted);
    setIsCompilerOpen(true);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    const draggedPage = compilerPages[sourceIndex];
    const draggedCategory = draggedPage?.templates?.category;
    if (draggedCategory === 'Cover' || draggedCategory === 'Last Page') return;
    const items = Array.from(compilerPages);
    const destPage = items[destIndex];
    if (destPage?.templates?.category === 'Cover') return;
    if (destPage?.templates?.category === 'Last Page' && destIndex === items.length - 1) return;
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(destIndex, 0, reorderedItem);
    const coverIndex = items.findIndex(p => p.templates?.category === 'Cover');
    if (coverIndex > 0) {
      const cover = items.splice(coverIndex, 1)[0];
      items.unshift(cover);
    }
    const lastPageIndex = items.findIndex(p => p.templates?.category === 'Last Page');
    if (lastPageIndex !== -1 && lastPageIndex !== items.length - 1) {
      const lastP = items.splice(lastPageIndex, 1)[0];
      items.push(lastP);
    }
    setCompilerPages(items);
  };

  const generatePDF = async () => {
    if (!printRef.current) return;
    if (!compilerPages || compilerPages.length === 0) return;
    setIsCompiling(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const container = printRef.current;
      const pagesToRender = Array.from(container.children) as HTMLElement[];
      for (let i = 0; i < pagesToRender.length; i++) {
        const pageElement = pagesToRender[i];
        const originalDisplay = pageElement.style.display;
        pageElement.style.display = 'block';
        const canvas = await html2canvas(pageElement, {
          scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff', scrollY: 0, windowWidth: 850
        });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pageElement.style.display = originalDisplay;
      }
      pdf.save(`${folder?.name || 'Magazine_Export'}.pdf`);
      showNotification('success', 'PDF compiled and downloaded');
      setIsCompilerOpen(false);
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Compilation failed. Please try again.');
    } finally {
      setIsCompiling(false);
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
    navigate(`/company/${company?.id || 'none'}/folders`, { replace: true });
  };

  // Logic to separate "Custom/Legacy" pages that aren't part of the current bundle's template slots
  const legacyPages = pages.filter(p => !templates.some(t => t.id === p.template_id));

  return (
    <WorkspaceLayout company={company || { id: 'none', name: 'Workspace' }}>
      <div className="w-full px-2 lg:px-10 xl:px-16 py-6 lg:py-16 text-foreground relative font-sans">
        {notification && (
          <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-foreground text-background' : 'bg-destructive text-destructive-foreground'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 lg:mb-16 px-1">
          <div className="w-full md:w-auto">
            <button 
              onClick={goBack}
              className="inline-flex items-center gap-2 px-3 py-1.5 micro-surface border border-border/10 rounded-full text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-3 hover:text-foreground hover:bg-secondary transition-all group"
            >
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
              <h1 className="text-3xl lg:text-5xl font-black text-foreground tracking-tight leading-none">
                {folder?.name || 'Directory'}
              </h1>
              {folder?.template_bundles && (
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-widest self-center md:mt-1">
                  Blueprint: {folder.template_bundles?.bundle_name || 'Standard'}
                </span>
              )}
            </div>
            <p className="text-muted-foreground/60 font-medium text-sm lg:text-lg max-w-xl">
              Strict blueprint execution layer. Fulfill all template slots to finalize publication.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 flex-wrap">
            <button 
              onClick={() => fetchData()}
              className="p-4 micro-surface border border-border/10 rounded-xl text-muted-foreground/40 hover:text-primary transition-all flex-shrink-0"
              title="Sync Database"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {(pages && pages.length > 0) && (
              <button 
                onClick={openCompiler}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-foreground text-background font-black rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-[10px] shadow-lg"
              >
                <Printer className="w-4 h-4" />
                Assemble Master PDF
              </button>
            )}
          </div>
        </header>

        {/* Blueprint Checklist Grid */}
        <div className="space-y-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground/60">Blueprint Checklist Slots</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {templates.map((template) => {
                const existingPage = pages.find(p => p.template_id === template.id);
                const isCompleted = !!existingPage;

                return (
                  <div 
                    key={template.id}
                    className={`group relative micro-surface border rounded-[2rem] p-6 lg:p-8 flex flex-col justify-between min-h-[200px] lg:min-h-[240px] transition-all duration-500 ${isCompleted ? 'border-primary/20 opacity-100' : 'border-border/10 opacity-70 hover:opacity-100 hover:border-border/30'}`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-500 ${isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground/30'}`}>
                          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Layout className="w-6 h-6" />}
                        </div>
                        <span className="px-2 py-0.5 rounded bg-muted/30 text-[8px] font-black uppercase tracking-widest text-muted-foreground border border-border/5">
                          {template.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-foreground tracking-tight leading-tight line-clamp-2">
                        {template.template_name}
                      </h3>
                      <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-2">
                        {template.department_tag || 'General'}
                      </p>
                    </div>

                    <div className="mt-8">
                      {isCompleted ? (
                        <button 
                          onClick={() => navigate(`/folder/${folderId}/editor/${existingPage.id}`)}
                          className="w-full py-3 bg-secondary text-foreground font-black rounded-xl hover:bg-muted transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Page
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleStartDraft(template)}
                          className="w-full py-3 bg-primary text-primary-foreground font-black rounded-xl hover:opacity-90 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Start Draft
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {templates.length === 0 && (
                 <div className="col-span-full py-20 text-center micro-surface border border-dashed border-border/20 rounded-[2.5rem]">
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">No blueprint slots defined for this bundle.</p>
                 </div>
              )}
            </div>
          </div>

          {/* Legacy / Custom Pages Section */}
          {legacyPages.length > 0 && (
            <div className="space-y-6 pt-12 border-t border-border/5">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground/40">Custom / Legacy Assets</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                {legacyPages.map((page) => (
                  <div
                    key={page.id}
                    className="group relative micro-surface border border-border/10 hover:border-primary/20 transition-all duration-500 p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer"
                    onClick={() => navigate(`/folder/${folderId}/editor/${page.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground/30 group-hover:text-primary transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <button 
                         onClick={(e) => { e.stopPropagation(); setPageToDelete(page); }}
                         className="p-2 text-muted-foreground/20 hover:text-destructive transition-colors"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-4">
                      <h4 className="font-bold text-foreground truncate">{page.title}</h4>
                      <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(page.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PDF Pre-Flight Compiler Modal */}
        {isMounted && isCompilerOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end lg:justify-center items-center p-4 pb-0 lg:p-10 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => !isCompiling && setIsCompilerOpen(false)} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-950 border border-border/10 rounded-t-[2.5rem] lg:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] lg:max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-8">
              <div className="p-6 lg:p-8 border-b border-border/5 flex items-center justify-between bg-card/30 shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Pre-Flight PDF Compiler</h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Drag to adjust assembly order</p>
                </div>
                <button 
                  onClick={() => setIsCompilerOpen(false)}
                  disabled={isCompiling}
                  className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-all disabled:opacity-50"
                >
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-8 invisible-scrollbar bg-slate-50/50 dark:bg-slate-900/10">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="pdf-pages">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {(compilerPages || []).map((page, index) => {
                          const isAnchor = page.templates?.category === 'Cover' || page.templates?.category === 'Last Page';
                          return (
                            <Draggable key={page.id} draggableId={page.id} index={index} isDragDisabled={isAnchor || isCompiling}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center gap-4 p-4 rounded-2xl border ${isAnchor ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/10'} ${snapshot.isDragging ? 'shadow-xl scale-[1.02] border-primary/40' : 'shadow-sm'} transition-all`}
                                >
                                  <div 
                                    {...provided.dragHandleProps} 
                                    className={`shrink-0 ${isAnchor ? 'opacity-20 cursor-not-allowed' : 'opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing text-foreground'}`}
                                  >
                                    {isAnchor ? <Layout className="w-5 h-5" /> : <GripVertical className="w-5 h-5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-sm font-black text-foreground truncate">{page.title || 'Untitled'}</h4>
                                      {isAnchor && (
                                        <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest">
                                          Anchor: {page.templates?.category}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                                      Source: {page.templates?.template_name || 'Custom Definition'}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              <div className="p-6 lg:p-8 border-t border-border/5 bg-card/50 shrink-0">
                <button
                  onClick={generatePDF}
                  disabled={isCompiling || !compilerPages || compilerPages.length === 0}
                  className="w-full py-5 bg-primary text-primary-foreground font-black rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest shadow-xl shadow-primary/20"
                >
                  {isCompiling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Compiling Architecture...
                    </>
                  ) : (
                    <>
                      <Printer className="w-5 h-5" />
                      Generate Master PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} ref={printRef}>
           {(compilerPages || []).map(page => (
             <div key={page.id} style={{ display: 'none', width: '850px', height: '1100px', backgroundColor: 'white' }}>
               <PrintTemplate data={page.data || {}} />
             </div>
           ))}
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
