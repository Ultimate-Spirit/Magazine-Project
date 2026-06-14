import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  Save, 
  Download, 
  Upload, 
  Image as ImageIcon, 
  Layout, 
  ChevronLeft, 
  Loader2,
  CheckCircle2,
  FileText,
  AlertCircle,
  Clock,
  ChevronRight,
  Plus,
  Minus,
  Type,
  Palette,
  Camera,
  Maximize2
} from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { PrintTemplate } from './PrintTemplate';
import { AttendancePageTemplate } from './templates/AttendancePageTemplate';
import type { Page, Company } from '../types';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import jsPDF from 'jspdf';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { AttendanceReportPDF } from './pdf/AttendanceReportPDF';

import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../lib/activityLogger';

// --- Visual Builder Helpers ---

const StyleToolbar = ({ onColorChange }: { onColorChange: (color: string) => void }) => {
  const colors = [
    'bg-slate-900', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-500', 
    'bg-indigo-600', 'bg-white', 'text-slate-900', 'text-blue-600', 'text-emerald-600'
  ];

  return (
    <div className="absolute -top-14 left-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl rounded-2xl p-2 flex items-center gap-2 border border-border/10 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex gap-1.5 px-2 border-r border-border/10 mr-1">
        {colors.slice(0, 6).map(c => (
          <button 
            key={c}
            onClick={() => onColorChange(c)}
            className={`w-6 h-6 rounded-full border border-border/20 ${c} hover:scale-110 transition-transform`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 px-2">
        <Palette className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Appearance</span>
      </div>
    </div>
  );
};

const EditableText = ({ 
  value, 
  onChange, 
  className, 
  tagName: Tag = 'div',
  placeholder = "Type here..." 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  className?: string, 
  tagName?: any,
  placeholder?: string 
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value || '';
    }
  }, [value]);

  return (
    <Tag
      ref={ref}
      contentEditable={true}
      suppressContentEditableWarning={true}
      onBlur={(e: any) => onChange(e.target.innerText)}
      className={`outline-none focus:ring-2 focus:ring-primary/20 rounded-md transition-all ${className}`}
      data-placeholder={placeholder}
    />
  );
};

// --- Dynamic Block Components ---

const HeaderTagline = ({ block, onUpdate, isActive, onSelect }: any) => (
  <div 
    onClick={onSelect}
    className={`relative group cursor-pointer py-2 px-4 rounded-xl transition-all ${isActive ? 'ring-2 ring-primary/40 bg-primary/5' : 'hover:bg-slate-50'}`}
  >
    {isActive && <StyleToolbar onColorChange={(c) => onUpdate({ style: c })} />}
    <div className="text-center mb-12">
      <EditableText
        value={block.text}
        onChange={(val) => onUpdate({ text: val })}
        className={`text-[10px] font-black uppercase tracking-[0.4em] border-b border-slate-100 pb-2 inline-block ${block.style || 'text-slate-400'}`}
      />
    </div>
  </div>
);

const Masthead = ({ block, onUpdate, isActive, onSelect }: any) => (
  <div 
    onClick={onSelect}
    className={`relative group cursor-pointer py-4 rounded-2xl transition-all ${isActive ? 'ring-2 ring-primary/40 bg-primary/5' : 'hover:bg-slate-50'}`}
  >
    {isActive && <StyleToolbar onColorChange={(c) => onUpdate({ style: c })} />}
    <div className="text-center mb-16 px-4">
      <EditableText
        value={block.text}
        onChange={(val) => onUpdate({ text: val })}
        className={`text-7xl lg:text-8xl font-black tracking-tighter leading-none break-words ${block.style || 'text-slate-900'}`}
      />
    </div>
  </div>
);

const MetaBanner = ({ block, onUpdate, isActive, onSelect }: any) => (
  <div 
    onClick={onSelect}
    className={`relative group cursor-pointer py-6 border-y-2 border-slate-900 mb-16 mx-4 px-4 transition-all ${isActive ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
  >
    <div className="flex justify-between items-center">
      {(block.items || []).map((item: any, i: number) => (
        <div key={i} className="text-center">
          <EditableText
            value={item.label}
            onChange={(val) => {
              const newItems = [...block.items];
              newItems[i].label = val;
              onUpdate({ items: newItems });
            }}
            className="text-[8px] font-black text-slate-400 uppercase tracking-widest"
          />
          <EditableText
            value={item.value}
            onChange={(val) => {
              const newItems = [...block.items];
              newItems[i].value = val;
              onUpdate({ items: newItems });
            }}
            className="text-sm font-black text-slate-900 uppercase tracking-tight mt-1"
          />
        </div>
      ))}
    </div>
  </div>
);

const ImageBlock = ({ block, onUpdate, isActive, onSelect }: any) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUpdate({ url });
    }
  };

  return (
    <div 
      onClick={onSelect}
      className={`relative group cursor-pointer mb-16 mx-4 rounded-3xl overflow-hidden shadow-xl transition-all ${isActive ? 'ring-4 ring-primary' : ''}`}
    >
      <label className="cursor-pointer block w-full h-full">
        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        <div className="aspect-video relative">
          {block.url ? (
            <img src={block.url} className="w-full h-full object-cover" alt="Visual" />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200">
              <Camera className="w-12 h-12 text-slate-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
              <Camera className="w-5 h-5 text-slate-900" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Replace Visual</span>
            </div>
          </div>
        </div>
      </label>
    </div>
  );
};

const FeatureGrid = ({ block, onUpdate, isActive, onSelect }: any) => (
  <div 
    onClick={onSelect}
    className={`relative group cursor-pointer mb-16 mx-4 p-4 rounded-3xl transition-all ${isActive ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
  >
    <div className="grid grid-cols-2 gap-x-12 gap-y-16">
      {(block.articles || []).map((art: any, i: number) => (
        <div key={i} className="space-y-3">
          <EditableText
            value={art.tag}
            onChange={(val) => {
              const newArts = [...block.articles];
              newArts[i].tag = val;
              onUpdate({ articles: newArts });
            }}
            className="text-[8px] font-black text-blue-600 uppercase tracking-widest"
          />
          <EditableText
            value={art.headline}
            onChange={(val) => {
              const newArts = [...block.articles];
              newArts[i].headline = val;
              onUpdate({ articles: newArts });
            }}
            className="text-xl font-black text-slate-900 leading-tight tracking-tight"
          />
        </div>
      ))}
    </div>
  </div>
);

const HighlightBadge = ({ block, onUpdate, isActive, onSelect }: any) => (
  <div 
    onClick={onSelect}
    className={`relative group cursor-pointer m-4 transition-all ${isActive ? 'scale-[1.02]' : ''}`}
  >
    {isActive && <StyleToolbar onColorChange={(c) => onUpdate({ style: c })} />}
    <div className={`p-10 rounded-[2rem] flex flex-col justify-between min-h-[240px] shadow-2xl transition-all duration-500 ${block.style || 'bg-slate-900 text-white'}`}>
      <EditableText
        value={block.number}
        onChange={(val) => onUpdate({ number: val })}
        className="text-6xl font-black tracking-tighter opacity-20"
      />
      <EditableText
        value={block.headline}
        onChange={(val) => onUpdate({ headline: val })}
        className="text-2xl font-black leading-tight tracking-tight"
      />
    </div>
  </div>
);

export const MagazineEditor: React.FC = () => {
  const { folderId, pageId } = useParams<{ folderId: string, pageId: string }>();
  const navigate = useNavigate();
  const { profile, permissions } = useAuth();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);

  const [editorData, setEditorData] = useState<any>({
    title: 'Untitled Report',
    headline: 'Enter Main Headline',
    subheadline: 'Enter subheadline or report description here...',
    summaryText: '',
    growthDriversText: '',
    outlookText: '',
    footerConfidentiality: 'Internal / Strictly Confidential',
    footerDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    metrics: [
      { label: 'Key Metric 1', value: '0.0', percentage: 0 },
      { label: 'Key Metric 2', value: '0.0', percentage: 0 }
    ],
    templateId: 'modern-executive'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveCanvasRef = useRef<HTMLDivElement>(null); // Ref for Live Preview capture

  // ── ATTENDANCE DETECTION: deep-search the serialised payload so no nesting
  // depth or key-order variation can cause a false-negative. This is the
  // single source of truth used by BOTH the render block and handleDownloadPDF.
  const isAttendance = JSON.stringify(editorData).includes('attendance_dashboard');

  const canEdit = permissions?.can_edit_all_publications || (permissions?.can_edit_own_publications && (page?.created_by === profile?.id || pageId === 'new'));

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setZoom(0.4);
      else setZoom(1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (folderId) fetchData();
  }, [folderId, pageId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: folderData, error: folderErr } = await supabase.from('folders').select('*, companies(*)').eq('id', folderId).single();
      if (folderErr) throw folderErr;
      setCompany(folderData.companies);
      
      if (pageId && pageId !== 'new') {
        const { data: pageData, error: pageErr } = await supabase.from('pages').select('*').eq('id', pageId).single();
        if (pageErr) throw pageErr;
        if (pageData) {
          setPage(pageData);
          // Deep-merge: pageData.data may itself contain a nested .data key from older saves.
          // Flatten all levels so layout_style is always reachable at the top of editorData.
          const rawPayload = pageData.data ?? {};
          const flatPayload = rawPayload.data ? { ...rawPayload, ...rawPayload.data } : rawPayload;
          console.debug('[MagazineEditor] raw pageData.data =>', rawPayload);
          console.debug('[MagazineEditor] flatPayload =>', flatPayload);
          setEditorData((prev: any) => ({ ...prev, title: pageData.title, ...flatPayload }));
        }
      }
    } catch (err: any) {
      console.error('Fetch Error:', err);
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async () => {
    if (!canEdit) {
      showNotification('error', 'Unauthorized');
      return;
    }
    setSaving(true);
    try {
      const pagePayload = {
        folder_id: folderId,
        title: editorData.title,
        data: editorData,
        updated_at: new Date().toISOString()
      };

      if (page) {
        const { error } = await supabase.from('pages').update(pagePayload).eq('id', page.id);
        if (error) throw error;
        await logActivity('updated', 'publication', editorData.title, company?.id || '', profile?.id || '');
      } else {
        const { data, error } = await supabase.from('pages').insert([{ ...pagePayload, created_by: profile?.id }]).select().single();
        if (error) throw error;
        setPage(data);
        await logActivity('created', 'publication', editorData.title, company?.id || '', profile?.id || '');
        navigate(`/folder/${folderId}/editor/${data.id}`, { replace: true });
      }
      showNotification('success', 'Page Configuration Synchronized');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      // ── NATIVE PDF ENGINE: uses the same isAttendance flag as the render ──
      if (isAttendance) {
        const blob = await pdf(
          <AttendanceReportPDF
            heroImageUrl={editorData.hero?.imageUrl}
            metrics={editorData.metrics}
            departmentData={editorData.departmentData}
            headcountData={editorData.headcountData}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `${editorData.title || 'Attendance-Report'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('success', 'Native Vector PDF Exported');
        return;
      }

      // ── LEGACY html2canvas path for other templates ─────────────────────
      if (!liveCanvasRef.current) return;
      const element        = liveCanvasRef.current;
      const originalTransform = element.style.transform;
      element.style.transform = 'none';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
        scrollX: 0,
        scrollY: 0,
        // @ts-ignore
        letterRendering: true,
      });

      element.style.transform = originalTransform;
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const legacyPdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [794, 1123] });
      legacyPdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123);
      legacyPdf.save(`${editorData.title}.pdf`);
      showNotification('success', 'A4 Architecture Exported');
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      showNotification('error', 'Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  const updateBlock = (index: number, updates: any) => {
    const newBlocks = [...editorData.blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    setEditorData({ ...editorData, blocks: newBlocks });
  };

  const renderDynamicBlocks = () => {
    if (!editorData.blocks || !Array.isArray(editorData.blocks)) return null;

    return editorData.blocks.map((block: any, index: number) => {
      const props = {
        block,
        onUpdate: (u: any) => updateBlock(index, u),
        isActive: activeBlockId === index,
        onSelect: () => setActiveBlockId(index)
      };

      switch (block.type) {
        case 'header_tagline': return <HeaderTagline key={index} {...props} />;
        case 'masthead': return <Masthead key={index} {...props} />;
        case 'meta_banner': return <MetaBanner key={index} {...props} />;
        case 'image_block': return <ImageBlock key={index} {...props} />;
        case 'feature_grid': return <FeatureGrid key={index} {...props} />;
        case 'highlight_badge': return <HighlightBadge key={index} {...props} />;
        default: return null;
      }
    });
  };

  return (
    <WorkspaceLayout company={company || { id: 'none', name: 'Select Company' }}>
      <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] bg-background relative overflow-hidden w-full max-w-[100vw]">
        
        <div className="h-auto min-h-16 lg:h-20 bg-card border-b border-border flex flex-col lg:flex-row items-center justify-between px-2 lg:px-12 shrink-0 py-3 lg:py-0 gap-4 z-30">
          <div className="flex items-center gap-3 lg:gap-6 w-full lg:w-auto">
            <button onClick={() => navigate(`/folder/${folderId}`)} className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all shrink-0">
              <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            <div className="min-w-0 flex-1">
              <input 
                type="text" 
                value={editorData.title}
                onChange={(e) => setEditorData({ ...editorData, title: e.target.value })}
                className="text-base lg:text-xl font-black text-foreground bg-transparent border-none focus:ring-0 p-0 w-full lg:w-64 truncate"
              />
              <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-0.5">Visual Page Builder</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-card border border-border text-foreground font-bold rounded-xl hover:bg-secondary transition-all disabled:opacity-50 text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Progress
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm"
            >
              {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Export PDF
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          <div className="flex flex-row lg:flex-col items-center justify-around lg:justify-start lg:py-8 gap-6 shrink-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-border p-3 lg:w-20 lg:h-full">
            <button className="p-3 lg:p-4 bg-primary/10 text-primary rounded-xl lg:rounded-2xl shadow-lg shadow-primary/10">
              <Layout className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            <button className="p-3 lg:p-4 text-muted-foreground/40 hover:text-foreground hover:bg-secondary rounded-xl lg:rounded-2xl transition-all">
              <Type className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            <button className="p-3 lg:p-4 text-muted-foreground/40 hover:text-foreground hover:bg-secondary rounded-xl lg:rounded-2xl transition-all">
              <ImageIcon className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          </div>

          <main className="flex-1 overflow-auto bg-secondary/50 invisible-scrollbar scroll-smooth pb-48 lg:pb-12 w-full relative">
            {notification && (
              <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-destructive text-destructive-foreground'}`}>
                {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="font-bold text-sm">{notification.message}</p>
              </div>
            )}

            {/* ── ATTENDANCE FORCE-RENDER: isAttendance is the single gating flag ── */}
            {isAttendance ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: '32px',
                  gap: '16px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Status pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', alignSelf: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6b7280' }}>
                    Live PDF Preview · Vector Engine Active
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 600, color: '#a78bfa', background: '#f3e8ff', borderRadius: '999px', padding: '2px 8px' }}>
                    layout: {editorData.layout_style ?? 'detected via deep-search'}
                  </span>
                </div>
                {/* The ONLY element when isAttendance is true — no HTML fallback anywhere below */}
                <PDFViewer
                  width="100%"
                  height="800px"
                  showToolbar={true}
                  style={{ border: 'none', borderRadius: '4px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
                >
                  <AttendanceReportPDF
                    heroImageUrl={editorData.hero?.imageUrl}
                    metrics={editorData.metrics}
                    departmentData={editorData.departmentData}
                    headcountData={editorData.headcountData}
                  />
                </PDFViewer>
              </div>
            ) : (
            <div className="min-w-max p-4 lg:p-12 min-h-full flex items-start justify-center">
              {/* Visual Scaling Wrapper: Fits the A4 canvas into the screen without altering its DOM dimensions */}
              <div 
                style={{ 
                  width: `${794 * zoom}px`, 
                  height: `${1123 * zoom}px`, 
                  transition: 'all 0.3s ease' 
                }}
                className="relative shrink-0 mb-12 origin-top"
              >
                <div 
                  ref={liveCanvasRef}
                  style={{ 
                    width: '794px', 
                    height: '1123px', 
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left'
                  }}
                  className="bg-white relative overflow-hidden shadow-2xl transition-transform"
                  onClick={(e) => e.target === e.currentTarget && setActiveBlockId(null)}
                >
                  {/* DATA-DRIVEN ROUTING LAYER */}
                  {editorData.blocks && Array.isArray(editorData.blocks) ? (
                    <div className="flex-1 flex flex-col">{renderDynamicBlocks()}</div>
                  ) : (
                    /* FALLBACK: LEGACY KPI DASHBOARD */
                    <div className="p-12 lg:p-20 flex flex-col h-full">
                      <div className="border-b-4 border-slate-900 pb-12 mb-12">
                        <EditableText value={editorData.headline} onChange={(v) => setEditorData({ ...editorData, headline: v })} className="w-full text-5xl font-black text-slate-900" />
                        <EditableText value={editorData.subheadline} onChange={(v) => setEditorData({ ...editorData, subheadline: v })} className="w-full text-xl font-bold text-blue-600 mt-4 uppercase tracking-widest" />
                      </div>

                      <div className="grid grid-cols-2 gap-10 lg:gap-20 mb-12">
                        <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Executive Summary</h3>
                          <EditableText value={editorData.summaryText} onChange={(v) => setEditorData({ ...editorData, summaryText: v })} className="w-full text-slate-600 leading-relaxed text-sm min-h-[150px]" />
                        </div>
                        <div className="space-y-8">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Performance</h3>
                          <div className="space-y-6 lg:space-y-8">
                            {(Array.isArray(editorData.metrics) ? editorData.metrics : []).map((metric: any, idx: number) => (
                              <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <EditableText value={metric.label} onChange={(v) => {
                                  const nm = [...editorData.metrics]; nm[idx].label = v; setEditorData({ ...editorData, metrics: nm });
                                }} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]" />
                                <div className="flex items-baseline gap-2 mt-2">
                                  <EditableText value={metric.value} onChange={(v) => {
                                    const nm = [...editorData.metrics]; nm[idx].value = v; setEditorData({ ...editorData, metrics: nm });
                                  }} className="text-3xl font-black text-slate-900 w-32" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <footer className="mt-auto pt-8 border-t border-slate-100 flex justify-between items-center text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                        <EditableText value={editorData.footerConfidentiality} onChange={(v) => setEditorData({ ...editorData, footerConfidentiality: v })} className="w-48 text-[8px] text-slate-300" />
                        <EditableText value={editorData.footerDate} onChange={(v) => setEditorData({ ...editorData, footerDate: v })} className="text-right w-32 text-[8px] text-slate-300" />
                      </footer>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )} {/* end attendance_dashboard ternary */}
          </main>

          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-border p-4 pb-safe flex flex-col gap-3">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 micro-surface px-3 py-1.5 rounded-full border border-border/10">
                <button onClick={() => setZoom(Math.max(0.2, zoom - 0.1))} className="p-1 text-muted-foreground"><Minus className="w-3.5 h-3.5" /></button>
                <span className="text-[10px] font-black w-10 text-center uppercase tracking-tighter">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-1 text-muted-foreground"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <button onClick={handleSave} disabled={saving} className="flex items-center justify-center p-3 bg-secondary rounded-xl">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</button>
                <button onClick={handleDownloadPDF} disabled={exporting} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest">{exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
