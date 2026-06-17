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
  const [formData, setFormData] = useState<Record<string, string>>({});
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
          const html = template.payload?.rawHtml || '';
          const vars = template.payload?.variables || [];
          setRawHtml(html);
          setTemplateVariables(vars);

          // Initialize form data with saved values or empty strings
          const savedData = pageData.data || {};
          const initialForm: Record<string, string> = {};
          vars.forEach((v: string) => {
            initialForm[v] = savedData[v] !== undefined ? String(savedData[v]) : '';
          });
          setFormData(initialForm);
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

  const handleInputChange = (variable: string, value: string) => {
    setFormData(prev => ({ ...prev, [variable]: value }));
  };

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
      const value = formData[variable] || '';
      const escapedVar = variable.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\{\\{\\s*${escapedVar}\\s*\\}\\}`, 'g');
      html = html.replace(regex, value);
    });
    return html;
  }, [rawHtml, templateVariables, formData]);

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
      <div className="flex h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] bg-background w-full overflow-hidden">
        
        {/* Left Column (Wide, scrollable canvas preview) */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-900/50 overflow-y-auto p-8 lg:p-12 flex flex-col items-center justify-start">
          <div className="w-full max-w-2xl flex items-center justify-between mb-6">
            <button 
              onClick={() => navigate(`/folder/${folderId}`)}
              className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Folder
            </button>
            <h1 className="text-sm font-black text-foreground uppercase tracking-widest">{pageTitle}</h1>
          </div>

          <div className="w-full max-w-2xl bg-card border border-border rounded-[2rem] p-6 shadow-xl">
            <A4Preview htmlContent={processedHtml} />
          </div>
        </div>

        {/* Right Column (Fixed sidebar for data entry) */}
        <div className="w-96 bg-card border-l border-border p-6 flex flex-col justify-between overflow-y-auto shrink-0 h-full">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-foreground">Content Editor</h2>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Fill in fields for this template slot</p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-500 font-medium">{error}</p>
              </div>
            )}

            {templateVariables.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-border/50 rounded-2xl">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">No variables detected</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">This template has no dynamic fields to edit.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Fields</h3>
                {templateVariables.map((variable) => (
                  <div key={variable} className="space-y-2">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {variable}
                    </label>
                    <input 
                      type="text" 
                      value={formData[variable] || ''}
                      onChange={(e) => handleInputChange(variable, e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      placeholder={`Enter value for ${variable}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-border mt-8">
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
