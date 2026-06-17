import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { A4Preview } from './A4Preview';
import { Save, ArrowLeft, Loader2, AlertCircle, ImageIcon, Upload } from 'lucide-react';
import type { Company } from '../types';

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

const buildDummyState = (vars: string[]): Record<string, string> => {
  const state: Record<string, string> = {};
  vars.forEach(v => {
    state[v] = isImageVar(v) ? UNSPLASH_PLACEHOLDER : toTitleCase(v);
  });
  return state;
};

const extractVars = (html: string): string[] =>
  Array.from(new Set((html.match(/\{\{([^}]+)\}\}/g) || []).map(v => v.slice(2, -2).trim())));

/* ─── Toast ────────────────────────────────────────────────────── */
const Toast: React.FC<{ message: string; type: 'error' | 'success'; onClose: () => void }> = ({
  message,
  type,
  onClose,
}) => (
  <div
    className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm animate-in slide-in-from-bottom-4 fade-in ${
      type === 'error' ? 'bg-red-900/90 border border-red-500/30' : 'bg-emerald-900/90 border border-emerald-500/30'
    }`}
  >
    <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${type === 'error' ? 'text-red-400' : 'text-emerald-400'}`} />
    <p className="text-sm font-medium text-gray-100 leading-snug">{message}</p>
    <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white text-lg leading-none">×</button>
  </div>
);

/* ─── Image Upload Zone ───────────────────────────────────────── */
const ImageUploadZone: React.FC<{
  variable: string;
  value: string;
  uploading: boolean;
  onChange: (file: File) => void;
}> = ({ variable, value, uploading, onChange }) => {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) onChange(file);
    },
    [onChange],
  );

  return (
    <label
      className={`relative flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
        dragging
          ? 'border-blue-400 bg-blue-500/10'
          : 'border-[#444] hover:border-[#666] bg-[#1a1a1a]'
      }`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Background thumbnail */}
      {value && (
        <img
          src={value}
          alt={variable}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-2 pointer-events-none">
        {uploading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Uploading…</span>
          </>
        ) : (
          <>
            {value ? (
              <ImageIcon className="w-6 h-6 text-white/60" />
            ) : (
              <Upload className="w-6 h-6 text-gray-500" />
            )}
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {value ? 'Replace Image' : 'Drop or Click to Upload'}
            </span>
          </>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onChange(file);
        }}
      />
    </label>
  );
};

/* ─── Main Component ──────────────────────────────────────────── */
export const MagazineEditor: React.FC = () => {
  const { folderId, pageId } = useParams<{ folderId: string; pageId: string }>();
  const navigate = useNavigate();

  const [_company, setCompany] = useState<Company | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [rawHtml, setRawHtml] = useState('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [uploadingVars, setUploadingVars] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  /* Fetch page + template */
  useEffect(() => {
    const fetch = async () => {
      if (!pageId || !folderId) return;
      try {
        setLoading(true);
        const { data: folderData } = await supabase
          .from('folders')
          .select('*, companies(*)')
          .eq('id', folderId)
          .single();
        if (folderData?.companies) setCompany(folderData.companies);

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
          setFormData(pageData.data || {});
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

  /* Extract variables & inject dummy state if DB is empty */
  useEffect(() => {
    if (!rawHtml) return;
    const vars = extractVars(rawHtml);
    setTemplateVariables(vars);
    setFormData(prev => {
      const isEmpty = Object.keys(prev).length === 0;
      const base = isEmpty ? buildDummyState(vars) : { ...prev };
      vars.forEach(v => { if (base[v] === undefined) base[v] = ''; });
      return base;
    });
  }, [rawHtml]);

  /* Debounce form → preview (250ms) to prevent iframe jitter */
  useEffect(() => {
    const id = setTimeout(() => setPreviewData(formData), 250);
    return () => clearTimeout(id);
  }, [formData]);

  /* Text input handler */
  const handleInputChange = (variable: string, value: string) =>
    setFormData(prev => ({ ...prev, [variable]: value }));

  /* Supabase Storage image upload */
  const handleImageUpload = async (variable: string, file: File) => {
    setUploadingVars(prev => ({ ...prev, [variable]: true }));
    try {
      const ext = file.name.split('.').pop();
      const path = `${folderId}/${pageId}-${variable}-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('magazine_assets')
        .upload(path, file, { upsert: true });

      if (uploadErr) {
        showToast(
          uploadErr.message.includes('not found')
            ? "Storage Error: Please create a public bucket named 'magazine_assets' in your Supabase dashboard."
            : `Upload failed: ${uploadErr.message}`,
          'error',
        );
        return;
      }

      const { data } = supabase.storage.from('magazine_assets').getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('Could not retrieve public URL.');

      setFormData(prev => ({ ...prev, [variable]: data.publicUrl }));
      showToast('Image uploaded successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Unexpected upload error.', 'error');
    } finally {
      setUploadingVars(prev => ({ ...prev, [variable]: false }));
    }
  };

  /* Processed HTML for preview */
  const processedHtml = useMemo(() => {
    if (!rawHtml) return '';
    return templateVariables.reduce((html, variable) => {
      const val = previewData[variable] || '';
      const esc = variable.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return html.replace(new RegExp(`\\{\\{\\s*${esc}\\s*\\}\\}`, 'g'), val);
    }, rawHtml);
  }, [rawHtml, templateVariables, previewData]);

  /* Save page */
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

  /* ─── Loading State ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex h-screen w-full bg-[#1e1e1e] items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
        <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 animate-pulse">
          Loading Editor
        </p>
      </div>
    );
  }

  /* ─── Editor UI ─────────────────────────────────────────────── */
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#1e1e1e] font-sans text-gray-100">
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Left: Dark canvas workspace ── */}
      <div className="flex-1 bg-[#0f0f0f] flex justify-center items-center p-12 overflow-y-auto relative">
        {/* Back button */}
        <button
          onClick={() => navigate(`/folder/${folderId}`)}
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Page title */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-600">
            {pageTitle}
          </span>
        </div>

        {/* A4 Canvas — pops violently off dark background */}
        <div className="max-w-xl w-full overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] ring-1 ring-white/10 rounded-sm">
          <A4Preview htmlContent={processedHtml} />
        </div>
      </div>

      {/* ── Right: Dark properties panel ── */}
      <div className="w-[420px] flex-shrink-0 bg-[#252627] border-l border-[#3a3a3a] p-8 overflow-y-auto flex flex-col gap-6 h-full">
        {/* Panel header */}
        <div className="space-y-1">
          <h2 className="text-base font-black text-white tracking-tight">Properties</h2>
          <p className="text-xs text-gray-500 font-medium">Edit template fields below</p>
        </div>

        {/* Fields */}
        {templateVariables.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#3a3a3a] rounded-2xl py-16 gap-3">
            <span className="text-2xl">📄</span>
            <p className="text-xs font-black uppercase tracking-widest text-gray-600">No Fields Found</p>
            <p className="text-[10px] text-gray-700 text-center max-w-[18ch]">This template has no dynamic variables.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {templateVariables.map(variable => (
              <div key={variable} className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                  {toTitleCase(variable)}
                </label>

                {isImageVar(variable) ? (
                  <ImageUploadZone
                    variable={variable}
                    value={formData[variable] || ''}
                    uploading={!!uploadingVars[variable]}
                    onChange={file => handleImageUpload(variable, file)}
                  />
                ) : (
                  <input
                    type="text"
                    value={formData[variable] || ''}
                    onChange={e => handleInputChange(variable, e.target.value)}
                    placeholder={`Enter ${toTitleCase(variable).toLowerCase()}`}
                    className="w-full bg-[#1a1a1a] border border-[#333] focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder:text-gray-600 outline-none transition-all"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Save button — sticky at bottom */}
        <div className="mt-auto pt-6 border-t border-[#3a3a3a]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black rounded-xl transition-all text-sm shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Page
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
