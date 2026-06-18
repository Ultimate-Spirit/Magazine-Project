import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { A4Preview } from './A4Preview';
import { ArrowLeft, Loader2, AlertCircle, UploadCloud, Download } from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────────────── */
const toTitleCase = (name: string) =>
  name
    .split(/[\s_]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

const isImageVar = (name: string) => {
  const l = name.toLowerCase();
  return l.includes('image') || l.includes('url') || l.includes('pic') || l.includes('cover');
};

const UNSPLASH_PLACEHOLDER =
  'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=800&q=80';

const extractVars = (html: string): string[] =>
  Array.from(new Set((html.match(/\{\{([^}]+)\}\}/g) || []).map(v => v.slice(2, -2).trim())));

/* ─── Toast ────────────────────────────────────────────────────── */
const Toast: React.FC<{ message: string; type: 'error' | 'success'; onClose: () => void }> = ({
  message,
  type,
  onClose,
}) => (
  <div
    className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-xl shadow-xl max-w-sm border animate-in slide-in-from-bottom-4 fade-in ${
      type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
    }`}
  >
    <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${type === 'error' ? 'text-red-500' : 'text-green-500'}`} />
    <p className="text-sm font-semibold leading-snug">{message}</p>
    <button
      onClick={onClose}
      className={`ml-auto font-bold text-lg leading-none ${
        type === 'error' ? 'text-red-400 hover:text-red-600' : 'text-green-400 hover:text-green-600'
      }`}
    >
      ×
    </button>
  </div>
);

/* ─── Main Component ──────────────────────────────────────────── */
export const MagazineEditor: React.FC = () => {
  const { folderId, pageId } = useParams<{ folderId: string; pageId: string }>();
  const navigate = useNavigate();

  const [pageTitle, setPageTitle] = useState('');
  const [rawHtml, setRawHtml] = useState('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [uploadingVars, setUploadingVars] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  useEffect(() => {
    const fetch = async () => {
      if (!pageId || !folderId) return;
      try {
        setLoading(true);
        const { data: pageData, error: pageErr } = await supabase
          .from('pages')
          .select('*, templates(*)')
          .eq('id', pageId)
          .single();
        if (pageErr) throw pageErr;
        if (!pageData) throw new Error('Page not found');

        setPageTitle(pageData.title || 'Untitled');

        const tpl = pageData.templates;
        if (tpl) {
          const html = tpl.raw_html || tpl.payload?.rawHtml || '';
          setRawHtml(html);
          
          const vars = extractVars(html);
          setTemplateVariables(vars);
          
          const dbData = pageData.data || {};
          const initialState: Record<string, string> = {};
          
          vars.forEach(v => {
            if (dbData[v]) {
              initialState[v] = dbData[v];
            } else {
              initialState[v] = isImageVar(v) ? UNSPLASH_PLACEHOLDER : toTitleCase(v);
            }
          });
          
          setFormData(initialState);
        } else {
          showToast('No template is linked to this page.', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load editor data.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [folderId, pageId]);

  const handleInputChange = (variable: string, value: string) => {
    setFormData(prev => ({ ...prev, [variable]: value }));
  };

  const handleFileUpload = async (variable: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert("File exceeds 500kb limit");
      return;
    }

    setUploadingVars(prev => ({ ...prev, [variable]: true }));
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${folderId}/${pageId}-${variable}-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('magazine_assets')
        .upload(fileName, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('magazine_assets').getPublicUrl(fileName);
      if (!data?.publicUrl) throw new Error('Could not retrieve public URL.');

      setFormData(prev => ({ ...prev, [variable]: data.publicUrl }));
    } catch (err: any) {
      showToast(err.message || 'Unexpected upload error.', 'error');
    } finally {
      setUploadingVars(prev => ({ ...prev, [variable]: false }));
      event.target.value = ''; // reset input
    }
  };

  const liveHtml = useMemo(() => {
    let html = rawHtml;
    if (!html) return '';
    const vars = Object.keys(formData);
    vars.forEach(key => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      html = html.replace(regex, formData[key] || '');
    });
    return html;
  }, [rawHtml, formData]);

  const handleDownloadPdf = async () => {
    try {
      showToast('Generating PDF, please wait...', 'success');
      
      const cleanHtml = liveHtml.replace(/<\/?(?:html|head|body|!DOCTYPE)[^>]*>/gi, '');
      const wrappedHtml = `<div class="a4-wrapper" style="width: 794px; height: 1123px; position: relative; overflow: hidden; page-break-after: always; display: flex; flex-direction: column; background-color: white;">${cleanHtml}</div>`;
      
      const fullHTML = `<!DOCTYPE html><html lang="en"><head><script src="https://cdn.tailwindcss.com"></script><style> @page { size: A4 portrait; margin: 0; } body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: block !important; } .a4-wrapper > div { width: 100% !important; height: 100% !important; max-width: none !important; aspect-ratio: auto !important; margin: 0 !important; padding: 0 !important; } </style></head><body>${wrappedHtml}</body></html>`;

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: fullHTML }),
      });

      if (!response.ok) {
        let errMsg = `Server error ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errMsg += `: ${errData.error}`;
        } catch(e) {}
        throw new Error(errMsg);
      }

      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('PDF downloaded successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate PDF.', 'error');
    }
  };

  const handleSave = async () => {
    if (!pageId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pages')
        .update({ data: formData, updated_at: new Date().toISOString() })
        .eq('id', pageId);
      if (error) throw error;
      showToast('Page saved!', 'success');
      setTimeout(() => navigate(`/folder/${folderId}`), 800);
    } catch (err: any) {
      showToast(err.message || 'Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full bg-white items-center justify-center flex-col gap-4 text-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-gray-900" />
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-gray-500 animate-pulse">
          Loading Editor
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Left Canvas Workspace */}
      <div className="flex-1 w-full h-full bg-white relative">
        <A4Preview htmlContent={liveHtml} />
        
        <button
          onClick={() => navigate(`/folder/${folderId}`)}
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:text-gray-900 shadow-sm transition-all z-20"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
            {pageTitle}
          </span>
        </div>
      </div>

      {/* Right Properties Panel */}
      <div className="w-[420px] flex-shrink-0 bg-white border-l border-gray-200 p-6 flex flex-col gap-6 overflow-y-auto">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
          <p className="text-sm text-gray-500">Edit template fields below</p>
        </div>

        {templateVariables.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl py-16 gap-3">
            <span className="text-2xl">📄</span>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">No Fields Found</p>
            <p className="text-xs text-gray-400 text-center max-w-[18ch]">This template has no dynamic variables.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {templateVariables.map(variable => (
              <div key={variable} className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-700">
                  {toTitleCase(variable)}
                </label>

                {isImageVar(variable) ? (
                  <div className="relative flex flex-col items-center justify-center w-full h-32 rounded-lg border border-dashed border-gray-300 bg-white hover:bg-gray-50 transition-colors overflow-hidden group">
                    <input 
                      type="file" 
                      accept=".jpg,.jpeg,.png" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      onChange={(e) => handleFileUpload(variable, e)}
                      disabled={uploadingVars[variable]}
                    />
                    
                    {formData[variable] && formData[variable] !== UNSPLASH_PLACEHOLDER && (
                      <img
                        src={formData[variable]}
                        alt={variable}
                        className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                      />
                    )}

                    <div className="relative z-0 flex flex-col items-center gap-2">
                      {uploadingVars[variable] ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-gray-900" />
                          <span className="text-xs font-medium text-gray-900">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                          <span className="text-xs font-medium text-gray-600">
                            {formData[variable] && formData[variable] !== UNSPLASH_PLACEHOLDER ? 'Replace Image' : 'Upload Image'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={formData[variable] || ''}
                    onChange={(e) => setFormData({ ...formData, [variable]: e.target.value })}
                    placeholder={`Enter ${toTitleCase(variable).toLowerCase()}`}
                    className="bg-white border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all w-full"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto pt-6 border-t border-gray-100 flex flex-col gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-black hover:bg-gray-800 text-white font-medium rounded-md transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
