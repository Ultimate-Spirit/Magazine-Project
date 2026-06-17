import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkspaceLayout } from './WorkspaceLayout';
import { supabase } from '../lib/supabaseClient';
import { A4Preview } from './A4Preview';
import { Save, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import type { Company } from '../types';

export const MagazineEditor: React.FC = () => {
  const { folderId, pageId } = useParams<{ folderId: string; pageId: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [pageTitle, setPageTitle] = useState<string>('');
  const [rawHtml, setRawHtml] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  
  // Real-time input values state
  const [formData, setFormData] = useState<Record<string, string>>({});
  // Debounced/Buffered preview state to prevent layout jitter
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  
  const [uploadingVars, setUploadingVars] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEditorData = async () => {
      if (!pageId || !folderId) return;
      try {
        setLoading(true);
        // 1. Fetch folder & company info
        const { data: folderData, error: folderErr } = await supabase
          .from('folders')
          .select('*, companies(*)')
          .eq('id', folderId)
          .single();

        if (folderErr) throw folderErr;
        if (folderData?.companies) {
          setCompany(folderData.companies);
        }

        // 2. Fetch page and its template details
        const { data: pageData, error: pageErr } = await supabase
          .from('pages')
          .select('*, templates(*)')
          .eq('id', pageId)
          .single();

        if (pageErr) throw pageErr;
        if (!pageData) throw new Error('Page not found');

        setPageTitle(pageData.title || 'Untitled Page');

        const template = pageData.templates;
        if (template) {
          const html = template.raw_html || template.payload?.rawHtml || '';
          setRawHtml(html);
          
          // Pre-populate with saved database data state
          setFormData(pageData.data || {});
        } else {
          setError('No template associated with this page.');
        }
      } catch (err: any) {
        console.error('Fetch Editor Data Error:', err);
        setError(err.message || 'An error occurred while loading page editor.');
      } finally {
        setLoading(false);
      }
    };

    fetchEditorData();
  }, [folderId, pageId]);

  // Dynamic client-side variable extraction on rawHtml load & dummy data injection
  useEffect(() => {
    if (!rawHtml) return;
    
    const matches = rawHtml.match(/\{\{([^}]+)\}\}/g) || [];
    const vars = Array.from(
      new Set(
        matches.map(v => v.slice(2, -2).trim())
      )
    );
    
    setTemplateVariables(vars);

    setFormData(prev => {
      const isDbEmpty = Object.keys(prev).length === 0;
      const initialForm = { ...prev };
      
      vars.forEach((v: string) => {
        if (initialForm[v] === undefined || initialForm[v] === '') {
          if (isDbEmpty) {
            // Database data is empty, inject dynamic initial dummy data
            const lower = v.toLowerCase();
            if (lower.includes('image') || lower.includes('url') || lower.includes('pic') || lower.includes('cover')) {
              initialForm[v] = 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=800&q=80';
            } else {
              initialForm[v] = v.replace(/_/g, ' ').toUpperCase();
            }
          } else {
            initialForm[v] = '';
          }
        }
      });
      return initialForm;
    });
  }, [rawHtml]);

  // Snappy real-time text input handler
  const handleInputChange = (variable: string, value: string) => {
    setFormData(prev => ({ ...prev, [variable]: value }));
  };

  // Asynchronous Supabase storage image uploader
  const handleImageUpload = async (variable: string, file: File) => {
    if (!file) return;
    setUploadingVars(prev => ({ ...prev, [variable]: true }));
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${pageId}-${variable}-${Date.now()}.${fileExt}`;
      const filePath = `${folderId}/${fileName}`;

      // Upload file to Supabase Storage bucket 'magazine_assets'
      const { error: uploadErr } = await supabase.storage
        .from('magazine_assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data } = supabase.storage
        .from('magazine_assets')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) throw new Error('Failed to retrieve public URL');

      // Silently update variable state with publicUrl to trigger reactive preview update
      setFormData(prev => ({ ...prev, [variable]: data.publicUrl }));
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploadingVars(prev => ({ ...prev, [variable]: false }));
    }
  };

  // Debounce formData to previewData to avoid iframe reloading jitter while typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setPreviewData(formData);
    }, 250);

    return () => clearTimeout(handler);
  }, [formData]);

  const handleSave = async () => {
    if (!pageId) return;
    setSaving(true);
    setError(null);
    try {
      const { error: saveErr } = await supabase
        .from('pages')
        .update({
          data: formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', pageId);

      if (saveErr) throw saveErr;
      navigate(`/folder/${folderId}`);
    } catch (err: any) {
      console.error('Save Page Error:', err);
      setError(err.message || 'Failed to save page data.');
    } finally {
      setSaving(false);
    }
  };

  const processedHtml = useMemo(() => {
    if (!rawHtml) return '';
    let html = rawHtml;
    templateVariables.forEach(variable => {
      const value = previewData[variable] || '';
      const escapedVar = variable.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\{\\{\\s*${escapedVar}\\s*\\}\\}`, 'g');
      html = html.replace(regex, value);
    });
    return html;
  }, [rawHtml, templateVariables, previewData]);

  const isImageVar = (name: string) => {
    const lower = name.toLowerCase();
    return lower.includes('image') || lower.includes('url') || lower.includes('pic') || lower.includes('cover');
  };

  if (loading) {
    return (
      <WorkspaceLayout company={company || ({ id: 'none', name: 'Magazine Builder' } as any)}>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Loading Workspace Editor</p>
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout company={company || ({ id: 'none', name: 'Magazine Builder' } as any)}>
      {/* Aggressively rigid split-screen architecture layout */}
      <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
        
        {/* Left preview area: flex-1 min-w-0 bg-[#ECECEC] flex items-center justify-center p-8 overflow-hidden */}
        <div className="flex-1 min-w-0 bg-[#ECECEC] flex items-center justify-center p-8 overflow-hidden relative">
          <div className="absolute top-6 left-6 z-10">
            <button 
              onClick={() => navigate(`/folder/${folderId}`)}
              className="flex items-center gap-2 text-xs font-black text-slate-700 hover:text-black transition-all uppercase tracking-wider bg-white/80 hover:bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200/50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="w-full max-w-xl bg-white border border-slate-300 rounded-2xl p-4 shadow-xl overflow-hidden max-h-full flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center">
              <A4Preview htmlContent={processedHtml} />
            </div>
          </div>
        </div>

        {/* Right data-entry sidebar: w-[450px] flex-shrink-0 bg-white border-l border-gray-300 p-6 overflow-y-auto */}
        <div className="w-[450px] flex-shrink-0 bg-white border-l border-gray-300 p-6 flex flex-col justify-between overflow-y-auto h-full">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Content Editor</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">Fill in fields for this template slot</p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-500 font-medium">{error}</p>
              </div>
            )}

            {templateVariables.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No variables detected</p>
                <p className="text-[10px] text-slate-400/80 mt-1">This template has no dynamic fields to edit.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Fields</h3>
                {templateVariables.map((variable) => (
                  <div key={variable} className="space-y-2">
                    {isImageVar(variable) ? (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                          {variable.replace(/_/g, ' ')}
                        </label>
                        <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                          {formData[variable] ? (
                            <img 
                              src={formData[variable]} 
                              alt={variable} 
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm" 
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                              No Pic
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {uploadingVars[variable] ? (
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                Uploading...
                              </div>
                            ) : (
                              <label className="inline-block px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-black rounded-lg cursor-pointer hover:bg-slate-50 transition-all text-center">
                                Upload Image
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(variable, file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                          {variable.replace(/_/g, ' ')}
                        </label>
                        <input 
                          type="text" 
                          value={formData[variable] || ''}
                          onChange={(e) => handleInputChange(variable, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                          placeholder={`Enter ${variable.replace(/_/g, ' ').toLowerCase()}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-200 mt-8 bg-white sticky bottom-0">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground font-black rounded-xl hover:bg-primary/90 transition-all text-sm shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Changes...
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
    </WorkspaceLayout>
  );
};
