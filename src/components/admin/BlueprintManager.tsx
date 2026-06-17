import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Loader2, 
  Plus, 
  LayoutTemplate, 
  Layers, 
  AlertCircle, 
  Save, 
  Edit2, 
  Trash2, 
  Archive, 
  MoreVertical,
  ChevronRight,
  CheckCircle2,
  X
} from 'lucide-react';
import type { TemplateBundle, Template } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

export const BlueprintManager: React.FC = () => {
  const [bundles, setBundles] = useState<TemplateBundle[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBundle, setSelectedBundle] = useState<TemplateBundle | null>(null);

  const [showCreateBundle, setShowCreateBundle] = useState(false);
  const [newBundleName, setNewBundleName] = useState('');
  
  const [editingBundle, setEditingBundle] = useState<TemplateBundle | null>(null);
  const [bundleToDelete, setBundleToDelete] = useState<TemplateBundle | null>(null);

  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  
  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    category: 'Content' as any,
    department_tag: '',
    weight: 10,
    is_global: false
  });

  const [rawHtmlInput, setRawHtmlInput] = useState('');
  const [parsedVariables, setParsedVariables] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('template_bundles')
        .select('*')
        .order('status', { ascending: true }) // active first
        .order('created_at', { ascending: false });
      
      if (fetchErr) throw fetchErr;
      setBundles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Fetch Bundles Error:', err);
      setError(err.message);
      setBundles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async (bundleId: string) => {
    if (!bundleId) return;
    try {
      const { data, error: fetchErr } = await supabase
        .from('templates')
        .select('*')
        .eq('bundle_id', bundleId)
        .order('weight', { ascending: true });
      
      if (fetchErr) throw fetchErr;
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Fetch Templates Error:', err);
      setError(err.message);
      setTemplates([]);
    }
  };

  const handleSelectBundle = (bundle: TemplateBundle) => {
    if (!bundle?.id) return;
    setSelectedBundle(bundle);
    fetchTemplates(bundle.id);
  };

  const handleCreateBundle = async () => {
    if (!newBundleName.trim()) return;
    setActionLoading(true);
    try {
      const { data, error: insertErr } = await supabase
        .from('template_bundles')
        .insert([{ bundle_name: newBundleName }])
        .select()
        .single();
      
      if (insertErr) throw insertErr;
      setBundles([data, ...bundles]);
      setShowCreateBundle(false);
      setNewBundleName('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBundle = async () => {
    if (!editingBundle || !newBundleName.trim()) return;
    setActionLoading(true);
    try {
      const { data, error: updateErr } = await supabase
        .from('template_bundles')
        .update({ bundle_name: newBundleName })
        .eq('id', editingBundle.id)
        .select()
        .single();
      
      if (updateErr) throw updateErr;
      setBundles(bundles.map(b => b.id === data.id ? data : b));
      setEditingBundle(null);
      setNewBundleName('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveBundle = async (bundle: TemplateBundle) => {
    setActionLoading(true);
    try {
      const newStatus = bundle.status === 'active' ? 'archived' : 'active';
      const { data, error: updateErr } = await supabase
        .from('template_bundles')
        .update({ status: newStatus })
        .eq('id', bundle.id)
        .select()
        .single();
      
      if (updateErr) throw updateErr;
      setBundles(bundles.map(b => b.id === data.id ? data : b));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedBundle || !templateForm.template_name.trim()) return;
    setActionLoading(true);
    try {
      const templateData = {
        bundle_id: selectedBundle.id,
        template_name: templateForm.template_name,
        category: templateForm.category,
        department_tag: templateForm.department_tag,
        weight: templateForm.weight,
        payload: {
          rawHtml: rawHtmlInput,
          variables: parsedVariables
        },
        is_global: templateForm.is_global
      };

      if (editingTemplate) {
        const { data, error: updateErr } = await supabase
          .from('templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
          .select()
          .single();
        if (updateErr) throw updateErr;
        setTemplates(templates.map(t => t.id === data.id ? data : t).sort((a, b) => a.weight - b.weight));
      } else {
        const { data, error: insertErr } = await supabase
          .from('templates')
          .insert([templateData])
          .select()
          .single();
        if (insertErr) throw insertErr;
        setTemplates([...templates, data].sort((a, b) => a.weight - b.weight));
      }

      setShowCreateTemplate(false);
      setEditingTemplate(null);
      setTemplateForm({
        template_name: '',
        category: 'Content',
        department_tag: '',
        weight: 10,
        is_global: false
      });
      setRawHtmlInput('');
      setParsedVariables([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setActionLoading(true);
    try {
      const { error: delErr } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateToDelete.id);
      
      if (delErr) throw delErr;
      setTemplates(templates.filter(t => t.id !== templateToDelete.id));
      setTemplateToDelete(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateForm({
      template_name: template.template_name,
      category: template.category,
      department_tag: template.department_tag || '',
      weight: template.weight,
      is_global: template.is_global || false
    });
    setRawHtmlInput(template.payload?.rawHtml || '');
    setParsedVariables(template.payload?.variables || []);
    setShowCreateTemplate(true);
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-12 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-12 space-y-12 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-foreground">Blueprint Engine</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage relational template bundles</p>
        </div>
        {!selectedBundle ? (
          <button 
            onClick={() => {
              setEditingBundle(null);
              setNewBundleName('');
              setShowCreateBundle(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            New Bundle
          </button>
        ) : (
          <button 
            onClick={() => setSelectedBundle(null)}
            className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            ← Back to Bundles
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl flex items-center gap-3 border border-destructive/20 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5" />
          <p className="font-bold text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)} className="p-1 hover:bg-destructive/10 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      {(showCreateBundle || editingBundle) && !selectedBundle && (
        <div className="micro-surface p-6 lg:p-8 rounded-[2rem] border border-border/10 space-y-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-black text-foreground">{editingBundle ? 'Rename Blueprint Bundle' : 'Initialize New Blueprint Bundle'}</h3>
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="e.g. Standard Corporate Profile"
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium"
              value={newBundleName}
              onChange={(e) => setNewBundleName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button 
                onClick={() => { setShowCreateBundle(false); setEditingBundle(null); }}
                className="px-6 py-3 micro-surface border border-border/10 rounded-xl font-bold hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={editingBundle ? handleUpdateBundle : handleCreateBundle}
                disabled={actionLoading || !newBundleName.trim()}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all whitespace-nowrap disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingBundle ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {!selectedBundle ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundles?.map(bundle => (
            <div 
              key={bundle.id}
              className={`group relative micro-surface p-6 lg:p-8 rounded-[2rem] border border-border/10 transition-all flex flex-col justify-between min-h-[200px] ${bundle.status === 'archived' ? 'opacity-50 grayscale' : 'hover:micro-surface-hover'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bundle.status === 'archived' ? 'bg-slate-500/10 text-slate-500' : 'bg-primary/10 text-primary'}`}>
                  <Layers className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      setEditingBundle(bundle);
                      setNewBundleName(bundle.bundle_name);
                      setShowCreateBundle(false);
                    }}
                    className="p-2 micro-surface border border-border/10 rounded-xl text-muted-foreground hover:text-primary transition-all"
                    title="Edit Name"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleArchiveBundle(bundle)}
                    className={`p-2 micro-surface border border-border/10 rounded-xl transition-all ${bundle.status === 'active' ? 'text-muted-foreground hover:text-orange-500' : 'text-emerald-500 hover:text-emerald-600'}`}
                    title={bundle.status === 'active' ? 'Archive' : 'Unarchive'}
                  >
                    {bundle.status === 'active' ? <Archive className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="mt-6 cursor-pointer" onClick={() => handleSelectBundle(bundle)}>
                <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">{bundle?.bundle_name || 'Unnamed Bundle'}</h3>
                <div className="flex items-center justify-between mt-3">
                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${bundle?.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                    {bundle?.status || 'unknown'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
                </div>
              </div>
            </div>
          ))}
          {(!bundles || bundles.length === 0) && !showCreateBundle && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-border/20 rounded-[2.5rem]">
              <p className="text-muted-foreground font-medium">No blueprint bundles found.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">{selectedBundle?.bundle_name || 'Bundle'} Templates</h2>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Configure layout slots for this blueprint</p>
            </div>
            <button 
              onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({
                  template_name: '',
                  category: 'Content',
                  department_tag: '',
                  weight: 10,
                  is_global: false
                });
                setRawHtmlInput('');
                setParsedVariables([]);
                setShowCreateTemplate(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-card border border-border text-foreground rounded-xl font-bold hover:bg-secondary transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Template Slot
            </button>
          </div>

          {showCreateTemplate && (
            <div className="micro-surface p-6 lg:p-8 rounded-[2rem] border border-border/10 space-y-6 animate-in slide-in-from-top-4">
              <h3 className="text-lg font-bold">{editingTemplate ? 'Update Template Definition' : 'New Template Definition'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Template Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    value={templateForm.template_name}
                    onChange={(e) => setTemplateForm({ ...templateForm, template_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Category</label>
                  <select 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none"
                    value={templateForm.category}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTemplateForm({ 
                        ...templateForm, 
                        category: val as any,
                        is_global: (val === 'Cover' || val === 'Last Page') ? templateForm.is_global : false
                      });
                    }}
                  >
                    <option value="Cover">Cover</option>
                    <option value="Content">Content</option>
                    <option value="Newsletter">Newsletter</option>
                    <option value="Last Page">Last Page</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Department Tag</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Sales, Marketing"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    value={templateForm.department_tag}
                    onChange={(e) => setTemplateForm({ ...templateForm, department_tag: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sorting Weight</label>
                  <input 
                    type="number" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    value={templateForm.weight}
                    onChange={(e) => setTemplateForm({ ...templateForm, weight: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">0 for Cover, 10 for Content, 1000 for Last Page</p>
                </div>
                
                {(templateForm.category === 'Cover' || templateForm.category === 'Last Page') && (
                  <div className="space-y-2 flex flex-col justify-center mt-2 col-span-full md:col-span-1 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-border/20 text-primary bg-background focus:ring-primary/20 accent-primary"
                        checked={templateForm.is_global}
                        onChange={(e) => setTemplateForm({ ...templateForm, is_global: e.target.checked })}
                      />
                      <span className="text-sm font-black text-primary uppercase tracking-widest">Global Asset</span>
                    </label>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-8">Make this template mixable across all directories.</p>
                  </div>
                )}

                <div className="col-span-full space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Template Code (HTML/Tailwind)</label>
                  <textarea 
                    className="w-full h-64 bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y"
                    value={rawHtmlInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRawHtmlInput(val);
                      const regex = /\{\{([^}]+)\}\}/g;
                      const vars = new Set<string>();
                      let match;
                      while ((match = regex.exec(val)) !== null) {
                        vars.add(match[1].trim());
                      }
                      setParsedVariables(Array.from(vars));
                    }}
                    placeholder="Paste your raw HTML here using {{variable}} syntax..."
                  />
                </div>

                {parsedVariables.length > 0 && (
                  <div className="col-span-full space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Detected Variables</label>
                    <div className="flex flex-wrap gap-2">
                      {parsedVariables.map(v => (
                        <span key={v} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-black uppercase tracking-widest">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {rawHtmlInput && (
                  <div className="col-span-full space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Live Template Preview</label>
                    <div className="relative w-full h-[800px] border-2 border-gray-300 rounded bg-gray-100 overflow-hidden">
                      <iframe 
                        className="w-full h-full border-0"
                        srcDoc={`<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #f3f4f6; }
  </style>
</head>
<body>
  <div id="scroll-area" style="width: 100%; height: 100%; overflow-y: auto; display: flex; justify-content: center; padding: 20px 0; box-sizing: border-box;">
    <div id="a4-board" style="width: 794px; min-height: 1123px; background-color: white; transform-origin: top center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
      ${rawHtmlInput}
    </div>
  </div>
  <script>
    function updateScale() {
      const scrollArea = document.getElementById('scroll-area');
      const board = document.getElementById('a4-board');
      if (!scrollArea || !board) return;
      
      const availableWidth = scrollArea.clientWidth - 40;
      let scale = availableWidth / 794;
      if (scale > 1) scale = 1;
      
      board.style.transform = 'scale(' + scale + ')';
      
      const excessSpace = 1123 - (1123 * scale);
      board.style.marginBottom = '-' + excessSpace + 'px';
    }
    
    updateScale();
    window.addEventListener('resize', updateScale);
  </script>
</body>
</html>`}
                        title="Live Template Preview"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border/10 mt-6">
                <button 
                  onClick={() => { setShowCreateTemplate(false); setEditingTemplate(null); }}
                  className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-secondary transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveTemplate}
                  disabled={actionLoading || !templateForm.template_name.trim()}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingTemplate ? 'Update Slot' : 'Save Template'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-[2rem] border border-border/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border/10 bg-muted/20">
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Weight</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Template Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Department</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {templates?.map(template => (
                    <tr key={template.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{template?.weight ?? '-'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-foreground">{template?.template_name || 'Unnamed'}</td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                          template?.category === 'Cover' ? 'bg-purple-500/10 text-purple-500' :
                          template?.category === 'Last Page' ? 'bg-orange-500/10 text-orange-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {template?.category || 'Content'}
                        </span>
                        {template?.is_global && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[8px] font-black uppercase tracking-widest border border-primary/20">Global</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                        {template?.department_tag || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditTemplate(template)}
                            className="p-2 micro-surface border border-border/10 rounded-lg text-muted-foreground hover:text-primary transition-all"
                            title="Edit Definition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setTemplateToDelete(template)}
                            className="p-2 micro-surface border border-border/10 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                            title="Delete Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!templates || templates.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                        No templates in this bundle yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!templateToDelete}
        title="Delete Template Slot"
        message={`Are you sure you want to permanently delete the "${templateToDelete?.template_name}" slot? This will not delete existing pages but new pages can no longer be started from this definition.`}
        confirmLabel="Delete Permanent"
        onConfirm={handleDeleteTemplate}
        onCancel={() => setTemplateToDelete(null)}
        isLoading={actionLoading}
        variant="danger"
      />
    </div>
  );
};
