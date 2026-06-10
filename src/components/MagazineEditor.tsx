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
  AlertCircle
} from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { PrintTemplate } from './PrintTemplate';
import type { Page, Company } from '../types';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import jsPDF from 'jspdf';

import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../lib/activityLogger';

export const MagazineEditor: React.FC = () => {
  const { folderId, pageId } = useParams<{ folderId: string, pageId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [editorData, setEditorData] = useState({
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
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (folderId) {
      fetchData();
    }
  }, [folderId, pageId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: folderData, error: folderErr } = await supabase
        .from('folders')
        .select('*, companies(*)')
        .eq('id', folderId)
        .single();

      if (folderErr) throw folderErr;
      setCompany(folderData.companies);
      
      if (pageId && pageId !== 'new') {
        const { data: pageData, error: pageErr } = await supabase
          .from('pages')
          .select('*')
          .eq('id', pageId)
          .single();
        
        if (pageErr) throw pageErr;
        
        if (pageData) {
          setPage(pageData);
          setEditorData({
            ...editorData,
            title: pageData.title,
            ...pageData.data
          });
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
    setSaving(true);
    try {
      const pagePayload = {
        folder_id: folderId,
        title: editorData.title,
        data: editorData,
        updated_at: new Date().toISOString()
      };

      if (page) {
        const { error } = await supabase
          .from('pages')
          .update(pagePayload)
          .eq('id', page.id);
        if (error) throw error;
        await logActivity('updated', 'publication', editorData.title, company?.id || '', profile?.id || '');
      } else {
        const { data, error } = await supabase
          .from('pages')
          .insert([pagePayload])
          .select()
          .single();
        if (error) throw error;
        setPage(data);
        await logActivity('created', 'publication', editorData.title, company?.id || '', profile?.id || '');
        navigate(`/folder/${folderId}/editor/${data.id}`, { replace: true });
      }
      showNotification('success', 'Publication saved successfully');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/_/backend/upload-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to process Excel file');
      
      const result = await response.json();
      const imported = result.data;
      
      setEditorData({
        ...editorData,
        headline: imported.title || editorData.headline,
        subheadline: imported.reportType || editorData.subheadline,
        summaryText: imported.summaryText || editorData.summaryText,
        growthDriversText: imported.growthDriversText || editorData.growthDriversText,
        outlookText: imported.outlookText || editorData.outlookText,
        footerConfidentiality: imported.footerConfidentiality || editorData.footerConfidentiality,
        footerDate: imported.footerDate || editorData.footerDate,
        metrics: imported.metrics || editorData.metrics
      });

      showNotification('success', 'Data imported from Excel successfully');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    setExporting(true);
    try {
      // Use the 'Hidden Print Template' pattern for pixel-perfect A4 export
      const element = printRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 3, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${editorData.title}.pdf`);
      
      showNotification('success', 'High-fidelity PDF exported successfully');
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      showNotification('error', 'Failed to generate high-fidelity PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const goBackToFolder = () => {
    navigate(`/folder/${folderId}`, { replace: true });
  };

  return (
    <WorkspaceLayout 
      company={company || { id: 'none', name: 'Select Company' }}
      currentView="page_builder"
      onNavigateBack={goBackToFolder}
      onHome={() => navigate('/', { replace: true })}
    >
      <div className="flex flex-col h-[calc(100vh-5rem)] bg-background relative overflow-hidden">
        {/* Hidden Print Template (Off-screen) */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <PrintTemplate ref={printRef} data={editorData} />
        </div>

        {/* Editor Toolbar */}
        <div className="h-20 bg-card border-b border-border flex items-center justify-between px-12 shrink-0">
          <div className="flex items-center gap-6">
            <button 
              onClick={goBackToFolder}
              className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <input 
                type="text" 
                value={editorData.title}
                onChange={(e) => setEditorData({ ...editorData, title: e.target.value })}
                className="text-xl font-black text-foreground bg-transparent border-none focus:ring-0 p-0 w-64"
              />
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">Editor Mode</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportExcel}
              className="hidden" 
              accept=".xlsx,.xls"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-3 bg-card border border-border text-foreground font-bold rounded-xl hover:bg-secondary transition-all disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import Excel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-card border border-border text-foreground font-bold rounded-xl hover:bg-secondary transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Progress
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export PDF
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Tools */}
          <div className="w-20 bg-card border-r border-border flex flex-col items-center py-8 gap-6">
            <button className="p-4 bg-secondary text-primary rounded-2xl" title="Templates">
              <Layout className="w-6 h-6" />
            </button>
            <button className="p-4 text-muted-foreground/40 hover:text-foreground hover:bg-secondary rounded-2xl transition-all" title="Structure">
              <FileText className="w-6 h-6" />
            </button>
            <button className="p-4 text-muted-foreground/40 hover:text-foreground hover:bg-secondary rounded-2xl transition-all" title="Assets">
              <ImageIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Canvas Area (UI Version for live editing) */}
          <main className="flex-1 overflow-y-auto p-12 flex justify-center bg-secondary/50">
            {notification && (
              <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-destructive text-destructive-foreground'}`}>
                {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="font-bold text-sm">{notification.message}</p>
              </div>
            )}

            <div className="w-full max-w-[850px] bg-white rounded-sm p-20 flex flex-col min-h-[1100px] border border-slate-200 shadow-xl">
              <div className="border-b-4 border-slate-900 pb-12 mb-12">
                <input 
                  className="w-full text-5xl font-black text-slate-900 border-none p-0 focus:ring-0 placeholder:text-slate-200 leading-[1.2] bg-transparent"
                  value={editorData.headline}
                  onChange={(e) => setEditorData({ ...editorData, headline: e.target.value })}
                  placeholder="Enter Headline"
                />
                <input 
                  className="w-full text-xl font-bold text-blue-600 mt-4 border-none p-0 focus:ring-0 placeholder:text-slate-200 uppercase tracking-widest leading-[1.2] bg-transparent"
                  value={editorData.subheadline}
                  onChange={(e) => setEditorData({ ...editorData, subheadline: e.target.value })}
                  placeholder="REPORT CATEGORY"
                />
              </div>

              <div className="grid grid-cols-2 gap-20 mb-12">
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Executive Summary</h3>
                  <textarea 
                    className="w-full text-slate-600 leading-relaxed text-sm border-none p-0 focus:ring-0 min-h-[150px] resize-none bg-transparent"
                    value={editorData.summaryText}
                    onChange={(e) => setEditorData({ ...editorData, summaryText: e.target.value })}
                    placeholder="Enter summary text here..."
                  />
                </div>
                <div className="space-y-8">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Key Performance</h3>
                  <div className="space-y-8">
                    {editorData.metrics.map((metric, idx) => (
                      <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <input 
                          className="w-full text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-transparent border-none p-0 focus:ring-0"
                          value={metric.label}
                          onChange={(e) => {
                            const newMetrics = [...editorData.metrics];
                            newMetrics[idx].label = e.target.value;
                            setEditorData({ ...editorData, metrics: newMetrics });
                          }}
                        />
                        <div className="flex items-baseline gap-2 mt-2">
                          <input 
                            className="text-3xl font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 w-32"
                            value={metric.value}
                            onChange={(e) => {
                              const newMetrics = [...editorData.metrics];
                              newMetrics[idx].value = e.target.value;
                              setEditorData({ ...editorData, metrics: newMetrics });
                            }}
                          />
                          <span className={`text-sm font-bold ${metric.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {metric.percentage >= 0 ? '+' : ''}{metric.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-20 mb-auto">
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Strategic Drivers</h3>
                  <textarea 
                    className="w-full text-slate-600 leading-relaxed text-sm border-none p-0 focus:ring-0 min-h-[120px] resize-none bg-transparent"
                    value={editorData.growthDriversText}
                    onChange={(e) => setEditorData({ ...editorData, growthDriversText: e.target.value })}
                    placeholder="Enter growth drivers..."
                  />
                </div>
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Future Outlook</h3>
                  <textarea 
                    className="w-full text-slate-600 leading-relaxed text-sm border-none p-0 focus:ring-0 min-h-[120px] resize-none bg-transparent"
                    value={editorData.outlookText}
                    onChange={(e) => setEditorData({ ...editorData, outlookText: e.target.value })}
                    placeholder="Enter outlook details..."
                  />
                </div>
              </div>

              <footer className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                <input 
                  className="bg-transparent border-none p-0 focus:ring-0 w-64 text-slate-300"
                  value={editorData.footerConfidentiality}
                  onChange={(e) => setEditorData({ ...editorData, footerConfidentiality: e.target.value })}
                />
                <input 
                  className="bg-transparent border-none p-0 focus:ring-0 text-right w-48 text-slate-300"
                  value={editorData.footerDate}
                  onChange={(e) => setEditorData({ ...editorData, footerDate: e.target.value })}
                />
              </footer>
            </div>
          </main>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
