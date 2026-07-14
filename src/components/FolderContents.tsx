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
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import * as LucideIcons from 'lucide-react';
import { Settings, Lock } from 'lucide-react'; // Added Lock and Settings

const getChartOptions = (chartType: string, chartDataStr?: string) => {
  let labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let series = [120, 200, 150, 80, 70, 110, 130];
  try {
    if (chartDataStr) {
      const parsed = JSON.parse(chartDataStr);
      if (parsed.labels) labels = parsed.labels;
      if (parsed.series) series = parsed.series;
    }
  } catch (e) {}

  const grid = { top: 10, bottom: 20, left: 10, right: 10, containLabel: true };

  const baseOptions = {
    tooltip: { trigger: 'axis' },
    grid,
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [{ data: series, type: 'bar' }]
  };

  switch (chartType) {
    case 'pie':
      return {
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: '75%', center: ['50%', '50%'], data: labels.map((l, i) => ({ name: l, value: series[i] || 0 })) }]
      };
    case 'line':
      return { ...baseOptions, series: [{ data: series, type: 'line', smooth: true }] };
    case 'scatter':
      return {
        grid,
        xAxis: {},
        yAxis: {},
        series: [{ symbolSize: 10, data: series.map((s, i) => [i, s]), type: 'scatter' }]
      };
    case 'radar':
      return {
        radar: { indicator: labels.map(l => ({ name: l, max: Math.max(...series) * 1.2 || 100 })), center: ['50%', '50%'], radius: '70%' },
        series: [{ type: 'radar', data: [{ value: series, name: 'Data' }] }]
      };
    case 'funnel':
      return {
        tooltip: { trigger: 'item' },
        series: [{ type: 'funnel', left: '10%', width: '80%', height: '80%', data: labels.map((l, i) => ({ name: l, value: series[i] || 0 })) }]
      };
    default:
      return baseOptions;
  }
};

// StagingRenderer is removed as it will be handled by the headless browser on a dedicated route
import { ConfirmModal } from './common/ConfirmModal';
import { logActivity } from '../lib/activityLogger';
import type { Page, Folder, Company, Template } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PrintTemplate } from './PrintTemplate';

import React from 'react';
import Select from 'react-select';

const SELECT_STYLES = {
  control: () => '!bg-background !border-border/10 !rounded-xl !min-h-[42px] hover:!border-primary/50 !shadow-none !cursor-pointer',
  menu: () => '!bg-background !border !border-border/20 !rounded-xl !shadow-xl !overflow-hidden !z-50',
  option: (state: any) => `!cursor-pointer ${state.isFocused ? '!bg-muted/50' : ''} ${state.isSelected ? '!bg-primary/10 !text-primary !font-bold' : '!text-foreground'}`,
  singleValue: () => '!text-foreground !font-bold !text-sm',
  input: () => '!text-foreground'
};

const PagePreview = ({ page }: { page: Page }) => {
  const layoutJson = page.templates?.layout_json;
  const fields = layoutJson?.fields || [];
  const formData = page.data || {};
  
  return (
    <div 
      className="bg-white shadow-sm shrink-0 overflow-hidden" 
      style={{ 
        width: '794px', 
        height: '1123px', 
        backgroundImage: `url('${layoutJson?.background_url || ''}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {fields.map((field: any) => {
        const val = formData[field.id] || formData[field.name] || '';
        const metadata = field.metadata || {};
        
        return (
          <div 
            key={field.id}
            style={{
              position: 'absolute',
              top: `${field.top}%`,
              left: `${field.left}%`,
              width: `${field.width}%`,
              height: `${field.height}%`,
              borderRadius: metadata.borderRadius ? `${metadata.borderRadius}px` : undefined,
              overflow: 'hidden',
              display: 'flex',
              alignItems: metadata.textAlign === 'left' ? 'flex-start' : metadata.textAlign === 'right' ? 'flex-end' : 'center',
              justifyContent: metadata.textAlign === 'left' ? 'flex-start' : metadata.textAlign === 'right' ? 'flex-end' : 'center',
              color: metadata.fontColor || 'inherit',
              fontFamily: metadata.fontFamily || 'inherit',
              fontSize: metadata.fontSize ? `${metadata.fontSize}px` : '16px',
              lineHeight: metadata.lineHeight || '1.5',
              fontWeight: metadata.fontWeight || 'normal',
              fontStyle: metadata.fontStyle || 'normal',
              textDecoration: metadata.textDecoration || 'none',
              textAlign: metadata.textAlign || 'center',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {field.type === 'Image' ? (
              <div style={{ width: '100%', height: '100%', backgroundImage: val ? `url('${val}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
            ) : field.type === 'Chart' ? (
              <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                <ReactECharts option={getChartOptions(metadata.chartType || 'bar', val)} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            ) : field.type === 'Icon' ? (
              (() => {
                const IconCmp = (LucideIcons as any)[val || 'Smile'] || LucideIcons.Smile;
                return <IconCmp className="w-full h-full" />;
              })()
            ) : (
              <span style={{ width: '100%' }}>{val}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface SortableGridItemProps {
  page: Page;
  included: boolean;
  onToggle: () => void;
  isCompiling: boolean;
}

function SortableGridItem({ page, included, onToggle, isCompiling }: SortableGridItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
    disabled: isCompiling
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex flex-col gap-2 p-2 rounded-xl border ${isDragging ? 'shadow-xl scale-105 border-primary z-50 bg-card' : 'shadow-sm border-border/10 bg-card'} transition-all`}
    >
      <div className="absolute top-4 right-4 z-10 bg-white rounded-md shadow-sm p-0.5 border border-gray-200">
        <input 
          type="checkbox" 
          checked={included} 
          onChange={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          disabled={isCompiling}
          className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()}
        />
      </div>
      <div 
        {...attributes}
        {...listeners}
        className={`relative w-full aspect-[1/1.414] overflow-hidden bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing border ${included ? 'border-transparent' : 'border-dashed border-gray-300 opacity-50'}`}
      >
        <div className="absolute top-0 left-0 transform scale-[0.15] origin-top-left pointer-events-none" style={{ width: '794px', height: '1123px' }}>
          <PagePreview page={page} />
        </div>
      </div>
      <div className="text-center">
        <h4 className="text-xs font-bold text-foreground truncate px-1">{page.title || 'Untitled'}</h4>
      </div>
    </div>
  );
}

export function FolderContents() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { profile, permissions } = useAuth();
  
  const [pages, setPages] = useState<Page[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [globalTemplates, setGlobalTemplates] = useState<Template[]>([]);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [pageToReset, setPageToReset] = useState<{ page: Page, template: Template } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Global Bookend Selection
  const [selectedCoverId, setSelectedCoverId] = useState<string>('');
  const [selectedLastPageId, setSelectedLastPageId] = useState<string>('');

  // Hydration & Mounting Stability
  const [isMounted, setIsMounted] = useState(false);
  const [isCompilerOpen, setIsCompilerOpen] = useState(false);
  const [compilerPages, setCompilerPages] = useState<Page[]>([]);
  
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [zoneA, setZoneA] = useState<Page | null>(null);
  const [zoneB, setZoneB] = useState<Page[]>([]);
  const [zoneC, setZoneC] = useState<Page | null>(null);
  const [zoneBIncluded, setZoneBIncluded] = useState<Record<string, boolean>>({});

  const [isCompiling, setIsCompiling] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

      // 2. Fetch bundle-specific content templates
      if (folderData.bundle_id) {
        const { data: templatesData, error: templatesErr } = await supabase
          .from('templates')
          .select('*')
          .eq('bundle_id', folderData.bundle_id)
          .in('category', ['Content', 'Newsletter'])
          .order('weight', { ascending: true });
        
        if (templatesErr) throw templatesErr;
        setTemplates(templatesData || []);
      }

      // 3. Fetch global templates (Cover & Last Page)
      const { data: globData, error: globErr } = await supabase
        .from('templates')
        .select('*')
        .eq('is_global', true)
        .order('weight', { ascending: true });
        
      if (globErr) throw globErr;
      setGlobalTemplates(globData || []);

      // 4. Fetch all pages in this folder
      const { data: pagesData, error: pagesErr } = await supabase
        .from('pages')
        .select('*, templates(*)')
        .eq('folder_id', folderId);

      if (pagesErr) throw pagesErr;

      // Client-side sorting using the _order_index injected in the JSONB data
      const sortedPages = (pagesData || []).sort((a, b) => {
        const orderA = a.data?._order_index ?? a.templates?.weight ?? 10;
        const orderB = b.data?._order_index ?? b.templates?.weight ?? 10;
        return orderA - orderB;
      });

      setPages(sortedPages);

      // Initial state mapping for Global Bookend drop-downs
      if (pagesData) {
        const coverPage = pagesData.find(p => p.templates?.category === 'Cover');
        if (coverPage) setSelectedCoverId(coverPage.template_id || '');

        const lastPage = pagesData.find(p => p.templates?.category === 'Last Page');
        if (lastPage) setSelectedLastPageId(lastPage.template_id || '');
      }

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

  const handleUpdateGlobalPage = async (newTemplateId: string, category: 'Cover' | 'Last Page') => {
    if (!permissions?.can_edit_all_folders && !(permissions?.can_edit_own_folders && folder?.created_by === profile?.id)) {
      showNotification('error', 'Unauthorized to modify this bundle.');
      return;
    }

    setIsActionLoading(true);
    try {
      const template = globalTemplates.find(t => t.id === newTemplateId);
      if (!template) throw new Error('Template not found');

      const existingPage = pages.find(p => p.templates?.category === category);
      if (!existingPage) throw new Error(`${category} page not found to update`);

      const newPayload = template.layout_json || { background_url: '', fields: [] };
      
      const { data, error } = await supabase
        .from('pages')
        .update({
          template_id: template.id,
          title: template.template_name,
          data: newPayload
        })
        .eq('id', existingPage.id)
        .select('*, templates(*)')
        .single();

      if (error) throw error;

      // Instant UI state update
      setPages(pages.map(p => p.id === existingPage.id ? data : p));
      
      if (category === 'Cover') setSelectedCoverId(template.id);
      if (category === 'Last Page') setSelectedLastPageId(template.id);
      
      await logActivity('updated', 'publication', template.template_name, company?.id || '', profile?.id || '');
      showNotification('success', `${category} successfully changed`);
    } catch (err: any) {
      console.error('Update Error:', err);
      showNotification('error', err.message || 'Failed to update template');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartDraft = async (template: Template) => {
    if (!permissions?.can_create_publications) {
      showNotification('error', 'Unauthorized to create publications');
      return;
    }

    setIsActionLoading(true);
    try {
      const masterPayload = template.layout_json || {};
      
      const { data, error } = await supabase
        .from('pages')
        .insert([{
          folder_id: folderId,
          title: template.template_name,
          template_id: template.id,
          data: masterPayload,
          created_by: profile?.id
        }])
        .select()
        .single();

      if (error) throw error;

      await logActivity('created', 'publication', template.template_name, company?.id || '', profile?.id || '');
      
      showNotification('success', 'Blueprint slot initialized');
      navigate(`/folder/${folderId}/editor/${data.id}`);
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetToTemplate = async () => {
    if (!pageToReset) return;
    
    setIsActionLoading(true);
    try {
      const { page, template } = pageToReset;
      
      const { error } = await supabase
        .from('pages')
        .update({
          title: template.template_name,
          data: template.layout_json || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', page.id);

      if (error) throw error;

      await logActivity('updated', 'publication (reset)', template.template_name, company?.id || '', profile?.id || '');
      
      showNotification('success', 'Page restored to master blueprint');
      setPageToReset(null);
      await fetchData();
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

  const openExportSettings = () => {
    const cover = pages.find(p => p.templates?.category === 'Cover') || null;
    const lastPage = pages.find(p => p.templates?.category === 'Last Page') || null;
    const contents = pages.filter(p => p.templates?.category !== 'Cover' && p.templates?.category !== 'Last Page').sort((a, b) => {
      const orderA = a.data?._order_index ?? a.templates?.weight ?? 10;
      const orderB = b.data?._order_index ?? b.templates?.weight ?? 10;
      return orderA - orderB;
    });

    setZoneA(cover);
    setZoneC(lastPage);
    setZoneB(contents);

    const initialIncluded: Record<string, boolean> = {};
    contents.forEach(p => initialIncluded[p.id] = true);
    setZoneBIncluded(initialIncluded);

    setIsExportSettingsOpen(true);
  };

  const handleDragEndSettings = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = zoneB.findIndex(p => p.id === active.id);
    const newIndex = zoneB.findIndex(p => p.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    const newZoneB = arrayMove(zoneB, oldIndex, newIndex);
    setZoneB(newZoneB);

    try {
      const updates = newZoneB.map((p, idx) => ({
        id: p.id,
        data: { ...(p.data || {}), _order_index: idx }
      }));

      for (const update of updates) {
        await supabase.from('pages').update({ data: update.data }).eq('id', update.id);
      }
    } catch (err: any) {
      console.error('Failed to persist order', err);
    }
  };

  const generatePDFFromSettings = async () => {
    setIsCompiling(true);
    try {
      showNotification('success', 'Building Master PDF on Server, please wait...');

      const selectedZoneB = zoneB.filter(p => zoneBIncluded[p.id]);
      const finalArray = [];
      if (zoneA) finalArray.push(zoneA);
      finalArray.push(...selectedZoneB);
      if (zoneC) finalArray.push(zoneC);

      // Ensure no React elements or functions are sent
      const cleanPayload = JSON.parse(JSON.stringify({ pages: finalArray }));

      const response = await fetch('/api/generate-pdf', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(cleanPayload) 
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/pdf')) {
        let errMessage = 'Invalid file format received';
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch (e) {}
        throw new Error(errMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'magazine-export.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      showNotification('success', 'Master PDF compiled and downloaded');
      setIsExportSettingsOpen(false);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to generate PDF');
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

  // Build the combined array of active templates (Local Bundle + Global Selections)
  const activeTemplates = [...templates];
  
  if (selectedCoverId) {
    const activeCover = globalTemplates.find(t => t.id === selectedCoverId);
    if (activeCover && !activeTemplates.some(t => t.id === activeCover.id)) {
      activeTemplates.push(activeCover);
    }
  }

  if (selectedLastPageId) {
    const activeLastPage = globalTemplates.find(t => t.id === selectedLastPageId);
    if (activeLastPage && !activeTemplates.some(t => t.id === activeLastPage.id)) {
      activeTemplates.push(activeLastPage);
    }
  }

  activeTemplates.sort((a, b) => (a.weight || 0) - (b.weight || 0));

  // Logic to separate "Custom/Legacy" pages that aren't part of the active slots
  const legacyPages = pages.filter(p => !activeTemplates.some(t => t.id === p.template_id));

  return (
    <WorkspaceLayout company={company || { id: 'none', name: 'Workspace' }}>
      <div className="w-full px-2 lg:px-10 xl:px-16 py-6 lg:py-16 text-foreground relative font-sans">
        {notification && (
          <div className={`fixed top-8 right-8 !z-[9999] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-foreground text-background' : 'bg-destructive text-destructive-foreground'}`}>
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
              <div className="flex flex-1 md:flex-none items-center gap-2">
                <button 
                  onClick={openExportSettings}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-foreground text-background font-black rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-[10px] shadow-lg"
                >
                  <Printer className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Global Bookends & Blueprint Checklist Grid */}
        <div className="space-y-12">
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground/60">Blueprint Checklist Slots</h2>
              </div>
            </div>

            {/* Mix & Match Global Bookends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 lg:p-8 micro-surface border border-border/10 rounded-[2rem]">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Layout className="w-3.5 h-3.5" /> Global Cover Master
                </label>
                <Select 
                  value={globalTemplates.filter(t => t.category === 'Cover').map(t => ({ value: t.id, label: t.template_name })).find(o => o.value === selectedCoverId) || null}
                  onChange={(option) => option && handleUpdateGlobalPage(option.value, 'Cover')}
                  options={globalTemplates.filter(t => t.category === 'Cover').map(t => ({ value: t.id, label: t.template_name }))}
                  classNames={SELECT_STYLES}
                  placeholder="Choose a Cover Template..."
                  isDisabled={isActionLoading}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Layout className="w-3.5 h-3.5" /> Global Back Cover Master
                </label>
                <Select 
                  value={globalTemplates.filter(t => t.category === 'Last Page').map(t => ({ value: t.id, label: t.template_name })).find(o => o.value === selectedLastPageId) || null}
                  onChange={(option) => option && handleUpdateGlobalPage(option.value, 'Last Page')}
                  options={globalTemplates.filter(t => t.category === 'Last Page').map(t => ({ value: t.id, label: t.template_name }))}
                  classNames={SELECT_STYLES}
                  placeholder="Choose a Last Page Template..."
                  isDisabled={isActionLoading}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activeTemplates.map((template) => {
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
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/30 text-[8px] font-black uppercase tracking-widest text-muted-foreground border border-border/5">
                          {template.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-foreground tracking-tight leading-tight line-clamp-2">
                        {template.template_name}
                      </h3>
                      <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-2 flex items-center gap-2">
                        {template.department_tag || 'General'}
                        {template.is_global && <span className="text-primary font-black ml-auto bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">GLOBAL</span>}
                      </p>
                    </div>

                    <div className="mt-8 flex gap-2">
                      {isCompleted ? (
                        <>
                          <button 
                            onClick={() => navigate(`/folder/${folderId}/editor/${existingPage.id}`)}
                            className="flex-1 py-3 bg-secondary text-foreground font-black rounded-xl hover:bg-muted transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit Page
                          </button>
                          <button 
                            onClick={() => setPageToReset({ page: existingPage, template })}
                            className="p-3 micro-surface border border-border/10 text-muted-foreground hover:text-primary rounded-xl transition-all"
                            title="Reset to Template"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </>
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
              
              {activeTemplates.length === 0 && (
                 <div className="col-span-full py-20 text-center micro-surface border border-dashed border-border/20 rounded-[2.5rem]">
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">No blueprint slots active. Select global masters above to begin.</p>
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

        {/* Export Settings Modal */}
        {isMounted && isExportSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end lg:justify-center items-center p-4 pb-0 lg:p-10 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => !isCompiling && setIsExportSettingsOpen(false)} />
            <div className="relative w-full max-w-5xl bg-white dark:bg-slate-950 border border-border/10 rounded-t-[2.5rem] lg:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] lg:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-8">
              <div className="p-6 lg:p-8 border-b border-border/5 flex items-center justify-between bg-card/30 shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Export Settings</h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Select pages and adjust order for PDF generation</p>
                </div>
                <button 
                  onClick={() => setIsExportSettingsOpen(false)}
                  disabled={isCompiling}
                  className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-all disabled:opacity-50"
                >
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-8 invisible-scrollbar bg-slate-50/50 dark:bg-slate-900/10">
                <div className="flex flex-wrap gap-4 lg:gap-8 justify-center lg:justify-start">
                  
                  {/* Zone A: Locked Cover */}
                  {zoneA && (
                    <div className="flex flex-col gap-2 p-2 rounded-xl shadow-sm border border-border/10 bg-card opacity-90 w-[140px]">
                      <div className="relative w-full aspect-[1/1.414] overflow-hidden bg-slate-100 rounded-lg border border-transparent pointer-events-none">
                        <div className="absolute top-0 left-0 transform scale-[0.15] origin-top-left pointer-events-none" style={{ width: '794px', height: '1123px' }}>
                          <PagePreview page={zoneA} />
                        </div>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xs font-bold text-foreground truncate px-1">Zone A: Cover</h4>
                      </div>
                    </div>
                  )}

                  {/* Zone B: Sortable Contents */}
                  <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCenter} 
                    onDragEnd={handleDragEndSettings}
                  >
                    <SortableContext items={zoneB.map(p => p.id)} strategy={verticalListSortingStrategy}>
                      {zoneB.map((page) => (
                        <div key={page.id} className="w-[140px]">
                          <SortableGridItem 
                            page={page} 
                            included={zoneBIncluded[page.id] ?? true}
                            onToggle={() => setZoneBIncluded(prev => ({ ...prev, [page.id]: !prev[page.id] }))}
                            isCompiling={isCompiling} 
                          />
                        </div>
                      ))}
                    </SortableContext>
                  </DndContext>

                  {/* Zone C: Locked Back Page */}
                  {zoneC && (
                    <div className="flex flex-col gap-2 p-2 rounded-xl shadow-sm border border-border/10 bg-card opacity-90 w-[140px]">
                      <div className="relative w-full aspect-[1/1.414] overflow-hidden bg-slate-100 rounded-lg border border-transparent pointer-events-none">
                        <div className="absolute top-0 left-0 transform scale-[0.15] origin-top-left pointer-events-none" style={{ width: '794px', height: '1123px' }}>
                          <PagePreview page={zoneC} />
                        </div>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xs font-bold text-foreground truncate px-1">Zone C: Back Page</h4>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className="p-6 lg:p-8 border-t border-border/5 bg-card/50 shrink-0">
                <button
                  onClick={generatePDFFromSettings}
                  disabled={isCompiling || (!zoneA && !zoneC && zoneB.length === 0)}
                  className="w-full py-5 bg-primary text-primary-foreground font-black rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest shadow-xl shadow-primary/20"
                >
                  {isCompiling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Server PDF...
                    </>
                  ) : (
                    <>
                      <Printer className="w-5 h-5" />
                      Generate PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}



      </div>

      <ConfirmModal
        isOpen={!!pageToReset}
        title="Restore Blueprint Layout"
        message="This action will permanently erase your work on this page and restore it to the original master template layout. This cannot be undone."
        confirmLabel="Reset to Blueprint"
        onConfirm={handleResetToTemplate}
        onCancel={() => setPageToReset(null)}
        isLoading={isActionLoading}
        variant="danger"
      />

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
