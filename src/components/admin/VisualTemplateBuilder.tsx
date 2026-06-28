import React, { useState, useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { supabase } from '../../lib/supabaseClient';
import { Image as ImageIcon, Type, BarChart2, Smile, UploadCloud, X, Loader2, Plus, Settings } from 'lucide-react';

export interface TemplateField {
  id: string;
  type: 'Text' | 'Image' | 'Chart' | 'Icon';
  name: string;
  top: number;
  left: number;
  width: number;
  height: number;
  metadata?: {
    chartType?: string;
  };
}

export interface TemplatePayload {
  background_url: string;
  fields: TemplateField[];
}

interface VisualTemplateBuilderProps {
  value: TemplatePayload | null;
  onChange: (val: TemplatePayload) => void;
}

export const VisualTemplateBuilder: React.FC<VisualTemplateBuilderProps> = ({ value, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const payload = value || { background_url: '', fields: [] };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/svg+xml'].includes(file.type)) {
      alert('Strictly accepts high-resolution PNGs and vector SVGs.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('magazine_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('magazine_assets')
        .getPublicUrl(filePath);

      onChange({
        ...payload,
        background_url: data.publicUrl
      });
    } catch (err: any) {
      console.error('Upload error', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const addField = (type: TemplateField['type']) => {
    let metadata = {};
    if (type === 'Chart') {
      const chartType = prompt('Select chart type (bar, line, pie, radar):', 'bar');
      if (!chartType || !['bar', 'line', 'pie', 'radar'].includes(chartType.toLowerCase())) {
        alert('Invalid or no chart type selected.');
        return;
      }
      metadata = { chartType: chartType.toLowerCase() };
    }

    const newField: TemplateField = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      name: `new_${type.toLowerCase()}`,
      top: 10,
      left: 10,
      width: 30,
      height: 10,
      metadata,
    };

    onChange({
      ...payload,
      fields: [...payload.fields, newField]
    });
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    onChange({
      ...payload,
      fields: payload.fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    });
  };

  const deleteField = (id: string) => {
    onChange({
      ...payload,
      fields: payload.fields.filter(f => f.id !== id)
    });
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const getContainerSize = () => {
    if (!containerRef.current) return { width: 0, height: 0 };
    return {
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight
    };
  };

  if (!payload.background_url) {
    return (
      <div className="w-full h-96 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-muted/20 relative">
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <span className="font-bold">Uploading background...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <UploadCloud className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-bold">Upload Background Image</p>
              <p className="text-sm text-muted-foreground mt-1">Accepts PNG or SVG only</p>
            </div>
            <input 
              type="file" 
              accept=".png,.svg"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-4 rounded-xl border border-border/50">
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground mr-2">Add Field:</span>
        <button onClick={() => addField('Text')} className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:border-primary hover:text-primary transition-colors text-sm font-bold">
          <Type className="w-4 h-4" /> Text
        </button>
        <button onClick={() => addField('Image')} className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:border-primary hover:text-primary transition-colors text-sm font-bold">
          <ImageIcon className="w-4 h-4" /> Image
        </button>
        <button onClick={() => addField('Chart')} className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:border-primary hover:text-primary transition-colors text-sm font-bold">
          <BarChart2 className="w-4 h-4" /> Chart
        </button>
        <button onClick={() => addField('Icon')} className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:border-primary hover:text-primary transition-colors text-sm font-bold">
          <Smile className="w-4 h-4" /> Icon
        </button>
        <div className="flex-1"></div>
        <button 
          onClick={() => onChange({ ...payload, background_url: '' })}
          className="text-xs font-bold text-destructive hover:underline"
        >
          Change Background
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex justify-center bg-muted/20 border border-border rounded-xl p-8 overflow-auto">
          <div 
            ref={containerRef}
            className="relative bg-white shadow-xl aspect-[210/297] w-full max-w-2xl overflow-hidden"
            style={{
              backgroundImage: `url(${payload.background_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {payload.fields.map(field => {
              const { width, height } = getContainerSize();
              
              // Only render Rnd if container size is known (ref is attached)
              if (width === 0) return null;

              return (
                <Rnd
                  key={field.id}
                  bounds="parent"
                  size={{
                    width: `${field.width}%`,
                    height: `${field.height}%`
                  }}
                  position={{
                    x: (field.left / 100) * width,
                    y: (field.top / 100) * height
                  }}
                  onDragStop={(e, d) => {
                    updateField(field.id, {
                      left: (d.x / width) * 100,
                      top: (d.y / height) * 100
                    });
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    const newWidth = parseFloat(ref.style.width); // This is in % because of default settings
                    const newHeight = parseFloat(ref.style.height); // This is in %
                    
                    updateField(field.id, {
                      width: newWidth,
                      height: newHeight,
                      left: (position.x / width) * 100,
                      top: (position.y / height) * 100
                    });
                  }}
                  className={`border-2 group cursor-move flex items-center justify-center bg-primary/20 backdrop-blur-[1px] ${
                    selectedFieldId === field.id ? 'border-primary z-10 shadow-lg' : 'border-primary/50 border-dashed hover:border-primary z-0'
                  }`}
                  onClick={() => setSelectedFieldId(field.id)}
                >
                  <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button 
                      className="bg-destructive text-white p-1 rounded-sm"
                      onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 text-primary font-black drop-shadow-md text-center break-words w-full h-full overflow-hidden">
                    {field.type === 'Text' && <Type className="w-6 h-6 mb-1 opacity-50" />}
                    {field.type === 'Image' && <ImageIcon className="w-6 h-6 mb-1 opacity-50" />}
                    {field.type === 'Chart' && <BarChart2 className="w-6 h-6 mb-1 opacity-50" />}
                    {field.type === 'Icon' && <Smile className="w-6 h-6 mb-1 opacity-50" />}
                    <span className="text-[10px] leading-tight break-all">{field.name}</span>
                    {field.metadata?.chartType && (
                      <span className="text-[8px] opacity-75 mt-1 uppercase">[{field.metadata.chartType}]</span>
                    )}
                  </div>
                </Rnd>
              );
            })}
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-bold text-lg border-b border-border pb-2">Field Settings</h3>
          {selectedFieldId ? (
            <div className="space-y-4">
              {payload.fields.filter(f => f.id === selectedFieldId).map(field => (
                <div key={field.id} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Variable Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                      value={field.name}
                      onChange={(e) => updateField(field.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Top (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none"
                        value={field.top.toFixed(1)}
                        onChange={(e) => updateField(field.id, { top: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Left (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none"
                        value={field.left.toFixed(1)}
                        onChange={(e) => updateField(field.id, { left: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Width (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none"
                        value={field.width.toFixed(1)}
                        onChange={(e) => updateField(field.id, { width: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Height (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none"
                        value={field.height.toFixed(1)}
                        onChange={(e) => updateField(field.id, { height: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  {field.type === 'Chart' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Chart Type</label>
                      <select 
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm outline-none"
                        value={field.metadata?.chartType || 'bar'}
                        onChange={(e) => updateField(field.id, { metadata: { ...field.metadata, chartType: e.target.value } })}
                      >
                        <option value="bar">Bar</option>
                        <option value="line">Line</option>
                        <option value="pie">Pie</option>
                        <option value="radar">Radar</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">Coordinates are calculated strictly as percentages relative to the A4 container.</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
              <Settings className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm font-medium">Select a field on the canvas to edit its properties.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
