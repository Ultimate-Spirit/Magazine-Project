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
  Trash2
} from 'lucide-react';
import type { Template } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { VisualTemplateBuilder, type TemplatePayload } from './VisualTemplateBuilder';



interface StandaloneTemplateManagerProps {
  category: 'Cover' | 'Last Page';
}

export const StandaloneTemplateManager: React.FC<StandaloneTemplateManagerProps> = ({ category }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    department_tag: '',
    weight: 10,
  });
  
  const [templatePayload, setTemplatePayload] = useState<TemplatePayload | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [category]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('category', category)
        .order('weight', { ascending: true });
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error(`Error fetching ${category} templates:`, err);
    } finally {
      setLoading(false);
    }
  };



  const handleSaveTemplate = async () => {
    if (!templateForm.template_name.trim()) return;
    setActionLoading(true);
    try {
      const templateData = {
        template_name: templateForm.template_name,
        category: category,
        department_tag: templateForm.department_tag,
        weight: templateForm.weight,
        layout_json: templatePayload,
        is_global: true, // Standalone templates are global by nature
        bundle_id: null // No bundle associated
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
        department_tag: '',
        weight: 10,
      });
      setTemplatePayload(null);
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
      department_tag: template.department_tag || '',
      weight: template.weight,
    });
    setTemplatePayload(template.layout_json as TemplatePayload || null);
    setShowCreateTemplate(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 pb-32 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-500 font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">{category}s</h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Manage standalone {category.toLowerCase()} layouts</p>
          </div>
          <button 
            onClick={() => {
              setEditingTemplate(null);
              setTemplateForm({
                template_name: '',
                department_tag: '',
                weight: 10,
              });
              setTemplatePayload(null);
              setShowCreateTemplate(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-card border border-border text-foreground rounded-xl font-bold hover:bg-secondary transition-all"
          >
            <Plus className="w-4 h-4" />
            Create {category}
          </button>
        </div>

        {showCreateTemplate && (
          <div className="micro-surface p-6 lg:p-8 rounded-[2rem] border border-border/10 space-y-6 animate-in slide-in-from-top-4">
            <h3 className="text-lg font-bold">{editingTemplate ? `Update ${category}` : `New ${category}`}</h3>
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
                <input 
                  type="text" 
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-muted-foreground cursor-not-allowed"
                  value={category}
                  disabled
                />
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
              </div>

              <div className="col-span-full space-y-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Visual Template Builder</label>
                <VisualTemplateBuilder 
                  value={templatePayload} 
                  onChange={setTemplatePayload} 
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-6 border-t border-border/10">
              <button 
                onClick={handleSaveTemplate}
                disabled={actionLoading || !templateForm.template_name.trim()}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save {category}
              </button>
              <button 
                onClick={() => {
                  setShowCreateTemplate(false);
                  setEditingTemplate(null);
                }}
                className="px-8 py-3 text-muted-foreground font-bold hover:text-foreground hover:bg-muted rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="group relative p-6 micro-surface border border-border/10 rounded-[2rem] hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openEditTemplate(template)}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setTemplateToDelete(template)}
                  className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-secondary rounded-2xl">
                  <LayoutTemplate className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{template.template_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                      {template.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!templates || templates.length === 0) && !showCreateTemplate && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-border/20 rounded-[2.5rem]">
              <p className="text-muted-foreground font-medium">No {category} templates found.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!templateToDelete}
        title="Delete Template"
        message={`Are you sure you want to delete the template "${templateToDelete?.template_name}"? This action cannot be undone.`}
        confirmLabel="Delete Template"
        onConfirm={handleDeleteTemplate}
        onCancel={() => setTemplateToDelete(null)}
        isDestructive={true}
      />
    </div>
  );
};
