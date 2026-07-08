import React, { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { supabase } from '../../lib/supabaseClient';
import { Image as ImageIcon, Type, BarChart2, Smile, UploadCloud, X, Loader2, Plus, Settings, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Select from 'react-select';

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
    maxChars?: number;
    borderRadius?: number;
    sampleText?: string;
    fontFamily?: string;
    fontColor?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: 'left' | 'center' | 'right';
  };
}

export interface TemplatePayload {
  background_url: string;
  fields: TemplateField[];
}

interface VisualTemplateBuilderProps {
  value: TemplatePayload | null;
  onChange: (val: TemplatePayload) => void;
  isLoading?: boolean;
}

const FONT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "'Roboto', sans-serif", label: "Roboto" },
  { value: "'Open Sans', sans-serif", label: "Open Sans" },
  { value: "'Lato', sans-serif", label: "Lato" },
  { value: "'Montserrat', sans-serif", label: "Montserrat" },
  { value: "'Oswald', sans-serif", label: "Oswald" },
  { value: "'Source Sans Pro', sans-serif", label: "Source Sans Pro" },
  { value: "'Slabo 27px', serif", label: "Slabo 27px" },
  { value: "'Raleway', sans-serif", label: "Raleway" },
  { value: "'PT Sans', sans-serif", label: "PT Sans" },
  { value: "'Merriweather', serif", label: "Merriweather" },
  { value: "'Nunito', sans-serif", label: "Nunito" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Lora', serif", label: "Lora" },
  { value: "'Mukta', sans-serif", label: "Mukta" },
  { value: "'Work Sans', sans-serif", label: "Work Sans" },
  { value: "'Fira Sans', sans-serif", label: "Fira Sans" },
  { value: "'Quicksand', sans-serif", label: "Quicksand" },
  { value: "'Barlow', sans-serif", label: "Barlow" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
  { value: "'Ubuntu', sans-serif", label: "Ubuntu" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Rubik', sans-serif", label: "Rubik" },
  { value: "'Karla', sans-serif", label: "Karla" },
  { value: "'Josefin Sans', sans-serif", label: "Josefin Sans" },
  { value: "'Cabin', sans-serif", label: "Cabin" },
  { value: "'Arimo', sans-serif", label: "Arimo" },
  { value: "'Dancing Script', cursive", label: "Dancing Script" },
  { value: "'Inconsolata', monospace", label: "Inconsolata" },
  { value: "'Crimson Text', serif", label: "Crimson Text" },
  { value: "'Anton', sans-serif", label: "Anton" },
  { value: "'Oxygen', sans-serif", label: "Oxygen" },
  { value: "'Bebas Neue', sans-serif", label: "Bebas Neue" },
  { value: "'Libre Baskerville', serif", label: "Libre Baskerville" },
  { value: "'Lobster', cursive", label: "Lobster" },
  { value: "'Pacifico', cursive", label: "Pacifico" },
  { value: "'Varela Round', sans-serif", label: "Varela Round" },
  { value: "'Abel', sans-serif", label: "Abel" },
  { value: "'Comfortaa', cursive", label: "Comfortaa" },
  { value: "'Exo 2', sans-serif", label: "Exo 2" },
  { value: "'Kanit', sans-serif", label: "Kanit" },
  { value: "'Teko', sans-serif", label: "Teko" },
  { value: "'Fjalla One', sans-serif", label: "Fjalla One" },
  { value: "'Caveat', cursive", label: "Caveat" },
  { value: "'Righteous', cursive", label: "Righteous" },
  { value: "'Abril Fatface', cursive", label: "Abril Fatface" },
  { value: "'Permanent Marker', cursive", label: "Permanent Marker" },
  { value: "'Creepster', cursive", label: "Creepster" },
  { value: "'Alfa Slab One', cursive", label: "Alfa Slab One" },
  { value: "'Cinzel', serif", label: "Cinzel" },
];

const CHART_OPTIONS = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'pie', label: 'Pie' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'radar', label: 'Radar' },
  { value: 'funnel', label: 'Funnel' },
  { value: 'gauge', label: 'Gauge' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'tree', label: 'Tree' },
  { value: 'treemap', label: 'Treemap' },
  { value: 'sunburst', label: 'Sunburst' },
  { value: 'candlestick', label: 'Candlestick' },
  { value: 'boxplot', label: 'Boxplot' },
];

const SELECT_STYLES = {
  control: (state: any) => `!bg-background !border-border !rounded-xl !shadow-sm !min-h-[42px] ${state.isFocused ? '!border-primary !ring-1 !ring-primary' : ''}`,
  menu: () => `!bg-background !border !border-border !rounded-xl !shadow-md !mt-1 !z-50`,
  option: (state: any) => `!cursor-pointer ${state.isFocused ? '!bg-muted/50' : ''} ${state.isSelected ? '!bg-primary/10 !text-primary !font-bold' : '!text-foreground'}`,
  singleValue: () => `!text-foreground !text-sm`,
  input: () => `!text-foreground`,
  placeholder: () => `!text-muted-foreground`,
};

export const VisualTemplateBuilder: React.FC<VisualTemplateBuilderProps> = ({ value: data, onChange, isLoading }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const [fields, setFields] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (data === null) {
      setFields([]);
      setIsReady(true);
      return;
    }

    if (data && !isReady) {
      const safeData = data.layout_json !== undefined ? data : { layout_json: data };
      const layout = safeData?.layout_json; 
      const safeFields = (layout && Array.isArray(layout.fields)) ? layout.fields : []; 
      setFields(safeFields); 
      setIsReady(true);
    }
  }, [data, isReady]);

  const payload = data || { background_url: '', fields: [] };

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize(prev => {
          const newWidth = Math.round(entry.contentRect.width);
          const newHeight = Math.round(entry.contentRect.height);
          if (prev.width === newWidth && prev.height === newHeight) return prev;
          return { width: newWidth, height: newHeight };
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isReady, payload.background_url]);

  // Google Font Injection
  useEffect(() => {
    const fonts = new Set<string>();
    fields.forEach(f => {
      if (f.type === 'Text' && f.metadata?.fontFamily) {
        const match = f.metadata.fontFamily.match(/^'([^']+)'/);
        if (match) fonts.add(match[1]);
      }
    });

    fonts.forEach(font => {
      const linkId = `google-font-${font.replace(/\s+/g, '-')}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
        document.head.appendChild(link);
      }
    });
  }, [fields]);

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
      metadata = { chartType: 'bar' };
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

    const newFields = [...fields, newField];
    setFields(newFields);
    onChange({
      ...payload,
      fields: newFields
    });
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    const newFields = fields.map((f) => (f.id === id ? { ...f, ...updates } : f));
    setFields(newFields);
    onChange({
      ...payload,
      fields: newFields
    });
  };

  const deleteField = (id: string) => {
    const newFields = fields.filter(f => f.id !== id);
    setFields(newFields);
    onChange({
      ...payload,
      fields: newFields
    });
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const getContainerSize = () => {
    return containerSize;
  };

  return !isReady ? (
    <div className="flex h-screen items-center justify-center">Loading Canvas System...</div>
  ) : (
    <div className="canvas-wrapper">
      {!payload.background_url ? (
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
      ) : (
        <TransformWrapper
          initialScale={1}
          minScale={0.25}
          maxScale={3}
          centerOnInit={true}
          limitToBounds={false}
          wheel={{ step: 0.1 }}
          doubleClick={{ disabled: true }}
          panning={{ disabled: false, excluded: ['react-draggable'], velocityDisabled: false }}
          alignmentAnimation={{ animationTime: 200 }}
          zoomAnimation={{ animationTime: 200 }}
          onTransformed={(ref) => {
            const el = document.getElementById('zoom-indicator');
            if (el) el.innerText = `${Math.round(ref.state.scale * 100)}%`;
          }}
          onZoom={(ref) => {
            const el = document.getElementById('zoom-indicator');
            if (el) el.innerText = `${Math.round(ref.state.scale * 100)}%`;
          }}
        >
          {({ zoomIn, zoomOut, resetTransform, state }) => (
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
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1 ml-4 shadow-sm">
                  <button onClick={() => zoomOut(0.25)} className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-muted-foreground font-bold">-</button>
                  <span id="zoom-indicator" className="text-xs font-bold w-12 text-center text-foreground">{Math.round(state.scale * 100)}%</span>
                  <button onClick={() => zoomIn(0.25)} className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-muted-foreground font-bold">+</button>
                  <button onClick={() => resetTransform()} className="text-[10px] font-bold px-2 hover:bg-muted rounded text-muted-foreground uppercase tracking-wider">100%</button>
                </div>
                <div className="flex-1"></div>
                <button 
                  onClick={() => onChange({ ...payload, background_url: '' })}
                  className="text-xs font-bold text-destructive hover:underline"
                >
                  Change Background
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-muted/20 border border-border rounded-xl overflow-hidden h-[800px] w-full">
                  <TransformComponent 
                    wrapperStyle={{ width: '100%', height: '100%', minHeight: '800px' }} 
                    contentStyle={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <div 
                      ref={containerRef}
                      className="relative bg-white shadow-2xl aspect-[210/297] w-full max-w-2xl overflow-hidden"
                      style={{
                        backgroundImage: `url(${payload.background_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {fields.map(field => {
                        const { width, height } = getContainerSize();
                        
                        if (width === 0) return null;

                        return (
                          <Rnd
                            key={field.id}
                            scale={state.scale}
                            size={{
                              width: (field.width / 100) * width,
                              height: (field.height / 100) * height
                            }}
                            position={{
                              x: (field.left / 100) * width,
                              y: (field.top / 100) * height
                            }}
                            onDragStart={(e, d) => {
                              dragStartPos.current = { x: d.x, y: d.y };
                            }}
                            onDragStop={(e, d) => {
                              const dx = Math.abs(d.x - dragStartPos.current.x);
                              const dy = Math.abs(d.y - dragStartPos.current.y);
                              if (dx < 3 && dy < 3) return;

                              updateField(field.id, {
                                left: (d.x / width) * 100,
                                top: (d.y / height) * 100
                              });
                            }}
                            onResizeStop={(e, direction, ref, delta, position) => {
                              const newWidthPx = parseFloat(ref.style.width);
                              const newHeightPx = parseFloat(ref.style.height);
                              
                              updateField(field.id, {
                                width: (newWidthPx / width) * 100,
                                height: (newHeightPx / height) * 100,
                                left: (position.x / width) * 100,
                                top: (position.y / height) * 100
                              });
                            }}
                            style={{
                              borderRadius: field.metadata?.borderRadius ? `${field.metadata.borderRadius}px` : undefined,
                            }}
                            className={`border-2 group cursor-move flex items-center justify-center bg-primary/20 backdrop-blur-[1px] react-draggable ${
                              selectedFieldId === field.id ? 'border-primary z-10 shadow-lg' : 'border-primary/50 border-dashed hover:border-primary z-0'
                            }`}
                            onClick={() => setSelectedFieldId(field.id)}
                          >
                            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-50">
                              <button 
                                type="button"
                                className="bg-destructive text-white p-1 rounded-sm hover:bg-red-600 transition-colors pointer-events-auto"
                                onPointerDown={(e) => { e.stopPropagation(); deleteField(field.id); }}
                                onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div 
                              className="flex flex-col items-center justify-center p-2 font-black drop-shadow-md text-center break-words w-full h-full overflow-hidden"
                              style={{
                                color: field.metadata?.fontColor || 'hsl(var(--primary))',
                                fontFamily: field.metadata?.fontFamily || undefined,
                                fontWeight: field.metadata?.fontWeight || 'normal',
                                fontStyle: field.metadata?.fontStyle || 'normal',
                                textDecoration: field.metadata?.textDecoration || 'none',
                                textAlign: field.metadata?.textAlign || 'center',
                                alignItems: field.metadata?.textAlign === 'left' ? 'flex-start' : field.metadata?.textAlign === 'right' ? 'flex-end' : 'center',
                              }}
                            >
                              {field.type === 'Text' && (
                                field.metadata?.sampleText ? (
                                  <span className="text-base leading-tight break-all" style={{ width: '100%' }}>{field.metadata.sampleText}</span>
                                ) : (
                                  <Type className="w-6 h-6 mb-1 opacity-50" />
                                )
                              )}
                              {field.type === 'Image' && <ImageIcon className="w-6 h-6 mb-1 opacity-50" />}
                              {field.type === 'Chart' && <BarChart2 className="w-6 h-6 mb-1 opacity-50" />}
                              {field.type === 'Icon' && <Smile className="w-6 h-6 mb-1 opacity-50" />}
                              {!field.metadata?.sampleText && (
                                <span className="text-[10px] leading-tight break-all">{field.name}</span>
                              )}
                              {field.metadata?.chartType && (
                                <span className="text-[8px] opacity-75 mt-1 uppercase">[{field.metadata.chartType}]</span>
                              )}
                            </div>
                          </Rnd>
                        );
                      })}
                    </div>
                  </TransformComponent>
                </div>
                
                <div className="space-y-4 max-h-[800px] overflow-auto pr-2">
                  <h3 className="font-bold text-lg border-b border-border pb-2">Field Settings</h3>
                  {selectedFieldId ? (
                    <div className="space-y-4 pb-12">
                      {fields.filter(f => f.id === selectedFieldId).map(field => (
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

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Border Radius (px)</label>
                            <input 
                              type="number" 
                              min="0"
                              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                              value={field.metadata?.borderRadius || ''}
                              onChange={(e) => updateField(field.id, { metadata: { ...field.metadata, borderRadius: e.target.value ? parseInt(e.target.value, 10) : undefined } })}
                            />
                          </div>

                          {field.type === 'Chart' && (
                            <div className="space-y-2 relative">
                              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Chart Type</label>
                              <Select 
                                options={CHART_OPTIONS}
                                value={CHART_OPTIONS.find(o => o.value === (field.metadata?.chartType || 'bar'))}
                                onChange={(option) => updateField(field.id, { metadata: { ...field.metadata, chartType: option?.value || 'bar' } })}
                                classNames={SELECT_STYLES}
                                unstyled
                                menuPlacement="auto"
                              />
                            </div>
                          )}

                          {field.type === 'Text' && (
                            <>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sample Text</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. Header Title"
                                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                                  value={field.metadata?.sampleText || ''}
                                  onChange={(e) => updateField(field.id, { metadata: { ...field.metadata, sampleText: e.target.value } })}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Font Family</label>
                                <Select 
                                  options={FONT_OPTIONS}
                                  value={FONT_OPTIONS.find(o => o.value === (field.metadata?.fontFamily || '')) || FONT_OPTIONS[0]}
                                  onChange={(option) => updateField(field.id, { metadata: { ...field.metadata, fontFamily: option?.value || '' } })}
                                  classNames={SELECT_STYLES}
                                  unstyled
                                  isSearchable
                                  menuPlacement="auto"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Text Formatting</label>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => updateField(field.id, { metadata: { ...field.metadata, fontWeight: field.metadata?.fontWeight === 'bold' ? 'normal' : 'bold' }})}
                                    className={`p-2 border rounded-lg transition-colors ${field.metadata?.fontWeight === 'bold' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                  >
                                    <Bold className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => updateField(field.id, { metadata: { ...field.metadata, fontStyle: field.metadata?.fontStyle === 'italic' ? 'normal' : 'italic' }})}
                                    className={`p-2 border rounded-lg transition-colors ${field.metadata?.fontStyle === 'italic' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                  >
                                    <Italic className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => updateField(field.id, { metadata: { ...field.metadata, textDecoration: field.metadata?.textDecoration === 'underline' ? 'none' : 'underline' }})}
                                    className={`p-2 border rounded-lg transition-colors ${field.metadata?.textDecoration === 'underline' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                  >
                                    <Underline className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Text Alignment</label>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => updateField(field.id, { metadata: { ...field.metadata, textAlign: 'left' }})}
                                    className={`p-2 border rounded-lg transition-colors ${field.metadata?.textAlign === 'left' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                  >
                                    <AlignLeft className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => updateField(field.id, { metadata: { ...field.metadata, textAlign: 'center' }})}
                                    className={`p-2 border rounded-lg transition-colors ${(!field.metadata?.textAlign || field.metadata?.textAlign === 'center') ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                  >
                                    <AlignCenter className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => updateField(field.id, { metadata: { ...field.metadata, textAlign: 'right' }})}
                                    className={`p-2 border rounded-lg transition-colors ${field.metadata?.textAlign === 'right' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                  >
                                    <AlignRight className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Text Color</label>
                                <div className="flex gap-2 items-center">
                                  <input 
                                    type="color" 
                                    className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                                    value={field.metadata?.fontColor || '#000000'}
                                    onChange={(e) => updateField(field.id, { metadata: { ...field.metadata, fontColor: e.target.value } })}
                                  />
                                  <input 
                                    type="text"
                                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                                    value={field.metadata?.fontColor || ''}
                                    onChange={(e) => updateField(field.id, { metadata: { ...field.metadata, fontColor: e.target.value } })}
                                    placeholder="#000000"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Max Characters</label>
                                <input 
                                  type="number" 
                                  placeholder="No limit"
                                  min="1"
                                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                                  value={field.metadata?.maxChars || ''}
                                  onChange={(e) => updateField(field.id, { metadata: { ...field.metadata, maxChars: e.target.value ? parseInt(e.target.value, 10) : undefined } })}
                                />
                              </div>
                            </>
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
          )}
        </TransformWrapper>
      )}
    </div>
  );
};
