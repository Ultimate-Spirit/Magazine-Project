import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, Plus, LayoutTemplate, Layers, AlertCircle, Save } from 'lucide-react';
import type { TemplateBundle, Template } from '../../types';

export const BlueprintManager: React.FC = () => {
  const [bundles, setBundles] = useState<TemplateBundle[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBundle, setSelectedBundle] = useState<TemplateBundle | null>(null);

  const [showCreateBundle, setShowCreateBundle] = useState(false);
  const [newBundleName, setNewBundleName] = useState('');

  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    template_name: '',
    category: 'Content' as const,
    department_tag: '',
    weight: 10,
    payload: '{}'
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('template_bundles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchErr) throw fetchErr;
      setBundles(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async (bundleId: string) => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('templates')
        .select('*')
        .eq('bundle_id', bundleId)
        .order('weight', { ascending: true });
      
      if (fetchErr) throw fetchErr;
      setTemplates(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleSelectBundle = (bundle: TemplateBundle) => {
    setSelectedBundle(bundle);
    fetchTemplates(bundle.id);
  };

  const handleCreateBundle = async () => {
    if (!newBundleName.trim()) return;
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
    }
  };

  const handleCreateTemplate = async () => {
    if (!selectedBundle || !newTemplate.template_name.trim()) return;
    try {
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(newTemplate.payload);
      } catch (e) {
        throw new Error("Invalid JSON in payload");
      }

      const { data, error: insertErr } = await supabase
        .from('templates')
        .insert([{
          bundle_id: selectedBundle.id,
          template_name: newTemplate.template_name,
          category: newTemplate.category,
          department_tag: newTemplate.department_tag,
          weight: newTemplate.weight,
          payload: parsedPayload
        }])
        .select()
        .single();

      if (insertErr) throw insertErr;
      setTemplates([...templates, data].sort((a, b) => a.weight - b.weight));
      setShowCreateTemplate(false);
      setNewTemplate({
        template_name: '',
        category: 'Content',
        department_tag: '',
        weight: 10,
        payload: '{}'
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-12 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-12 space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-foreground">Blueprint Engine</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage relational template bundles</p>
        </div>
        {!selectedBundle ? (
          <button 
            onClick={() => setShowCreateBundle(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            New Bundle
          </button>
        ) : (
          <button 
            onClick={() => setSelectedBundle(null)}
            className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Bundles
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl flex items-center gap-3 border border-destructive/20">
          <AlertCircle className="w-5 h-5" />
          <p className="font-bold text-sm">{error}</p>
        </div>
      )}

      {showCreateBundle && !selectedBundle && (
        <div className="micro-surface p-6 lg:p-8 rounded-3xl border border-border/10 space-y-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-black text-foreground">Initialize New Blueprint Bundle</h3>
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="e.g. Standard Corporate Profile"
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium"
              value={newBundleName}
              onChange={(e) => setNewBundleName(e.target.value)}
            />
            <button 
              onClick={handleCreateBundle}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all whitespace-nowrap"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {!selectedBundle ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundles.map(bundle => (
            <div 
              key={bundle.id}
              onClick={() => handleSelectBundle(bundle)}
              className="group cursor-pointer micro-surface hover:micro-surface-hover p-6 lg:p-8 rounded-[2rem] border border-border/10 transition-all space-y-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">{bundle.bundle_name}</h3>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${bundle.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                    {bundle.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {bundles.length === 0 && !showCreateBundle && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-border/20 rounded-[2.5rem]">
              <p className="text-muted-foreground font-medium">No blueprint bundles found.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">{selectedBundle.bundle_name} Templates</h2>
            <button 
              onClick={() => setShowCreateTemplate(true)}
              className="flex items-center gap-2 px-6 py-3 bg-card border border-border text-foreground rounded-xl font-bold hover:bg-secondary transition-all"
            >
              <LayoutTemplate className="w-4 h-4" />
              Add Template
            </button>
          </div>

          {showCreateTemplate && (
            <div className="micro-surface p-6 lg:p-8 rounded-3xl border border-border/10 space-y-6">
              <h3 className="text-lg font-bold">New Template Definition</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Template Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    value={newTemplate.template_name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, template_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Category</label>
                  <select 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as any })}
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
                    value={newTemplate.department_tag}
                    onChange={(e) => setNewTemplate({ ...newTemplate, department_tag: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sorting Weight</label>
                  <input 
                    type="number" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    value={newTemplate.weight}
                    onChange={(e) => setNewTemplate({ ...newTemplate, weight: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">0 for Cover, 10 for Content, 1000 for Last Page</p>
                </div>
                <div className="col-span-full space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Initial Payload (JSON)</label>
                  <textarea 
                    className="w-full h-32 bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y"
                    value={newTemplate.payload}
                    onChange={(e) => setNewTemplate({ ...newTemplate, payload: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border/10">
                <button 
                  onClick={() => setShowCreateTemplate(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-secondary transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateTemplate}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all text-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Template
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
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {templates.map(template => (
                    <tr key={template.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{template.weight}</td>
                      <td className="px-6 py-4 text-sm font-bold text-foreground">{template.template_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                          template.category === 'Cover' ? 'bg-purple-500/10 text-purple-500' :
                          template.category === 'Last Page' ? 'bg-orange-500/10 text-orange-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {template.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                        {template.department_tag || '-'}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        {new Date(template.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {templates.length === 0 && (
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
    </div>
  );
};
