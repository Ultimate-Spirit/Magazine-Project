import { useState, useRef } from 'react';
import { Upload, Save, Image as ImageIcon, Type, LayoutGrid } from 'lucide-react';
import type { Folder, Page } from '../types';

interface Props {
  folder: Folder;
  initialPage: Page | null;
  onSave: (pageData: Partial<Page>) => void;
  onCancel: () => void;
}

export function PageBuilder({ initialPage, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initialPage?.title || 'Untitled Page');
  const [data, setData] = useState<any>(initialPage?.data || {
    headline: 'Placeholder Headline',
    subheadline: 'Drag an Excel sheet to populate data, or click to edit.',
    metrics: [
      { label: 'Metric A', value: '-' },
      { label: 'Metric B', value: '-' },
      { label: 'Metric C', value: '-' }
    ]
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Simulate reading Excel data
    simulateExcelLoad();
  };

  const simulateExcelLoad = () => {
    // In a real app, parse the Excel file here
    setData({
      headline: 'Q3 Financial Performance Overview',
      subheadline: 'Sustained growth across key regional markets driven by new product lines.',
      metrics: [
        { label: 'Revenue', value: '$42.5M' },
        { label: 'EBITDA Margin', value: '24.1%' },
        { label: 'YOY Growth', value: '+15.3%' }
      ]
    });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Builder Header */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center space-x-4">
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page Title"
            className="text-lg font-serif font-medium bg-transparent border-none focus:ring-0 outline-none w-64 placeholder:text-muted-foreground/30 text-foreground"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={onCancel}
            className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave({ title, data })}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-1.5 text-sm font-medium rounded flex items-center transition-colors"
          >
            <Save size={16} className="mr-2" />
            Save Page
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Tools Sidebar */}
        <div className="w-16 border-r border-border bg-card flex flex-col items-center py-4 space-y-4 shrink-0">
          <button className="w-10 h-10 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all" title="Layout Grid">
            <LayoutGrid size={18} />
          </button>
          <button className="w-10 h-10 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all" title="Text Tools">
            <Type size={18} />
          </button>
          <button className="w-10 h-10 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all" title="Image Upload">
            <ImageIcon size={18} />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-secondary/50 p-8 overflow-y-auto flex justify-center relative">
          
          {/* Data Drop Zone Overlay (when dragging over entire canvas) */}
          <div 
            className={`absolute inset-0 z-10 bg-primary/10 backdrop-blur-sm border-2 border-primary border-dashed m-8 rounded-xl flex items-center justify-center transition-all ${isDragging ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="bg-card p-6 rounded-lg border border-border flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3">
                <Upload size={24} />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Drop Excel Data Sheet</h3>
              <p className="text-sm text-muted-foreground max-w-[200px]">Release to auto-populate layout fields</p>
            </div>
          </div>

          {/* The Page Layout Canvas */}
          <div 
            className="w-full max-w-4xl bg-white border border-slate-200 rounded-sm min-h-[800px] p-12 flex flex-col shadow-xl"
            onDragOver={handleDragOver} // Also listen here so we can drop anywhere
          >
            {/* Header Data Zone */}
            <div className="border-b-2 border-blue-600/20 pb-6 mb-8 group relative">
              <div className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 text-xs text-slate-300 transition-opacity">H1</div>
              <input
                type="text"
                value={data.headline}
                onChange={(e) => setData({ ...data, headline: e.target.value })}
                className="w-full text-4xl font-serif font-bold text-slate-900 border-none outline-none focus:bg-slate-50 p-2 -ml-2 rounded transition-colors bg-transparent"
                placeholder="Headline"
              />
              <input
                type="text"
                value={data.subheadline}
                onChange={(e) => setData({ ...data, subheadline: e.target.value })}
                className="w-full text-xl text-slate-400 mt-2 border-none outline-none focus:bg-slate-50 p-2 -ml-2 rounded transition-colors bg-transparent"
                placeholder="Subheadline"
              />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-3 gap-8 mb-8">
              {data.metrics.map((metric: any, idx: number) => (
                <div key={idx} className="border border-slate-100 p-6 rounded relative group hover:border-blue-600/30 transition-colors bg-slate-50">
                  <div className="text-sm uppercase tracking-wider text-slate-400 mb-2 font-medium">
                    <input 
                      value={metric.label}
                      onChange={(e) => {
                        const newMetrics = [...data.metrics];
                        newMetrics[idx].label = e.target.value;
                        setData({ ...data, metrics: newMetrics });
                      }}
                      className="w-full border-none outline-none bg-transparent text-slate-400"
                    />
                  </div>
                  <div className="text-3xl font-serif font-bold text-slate-900">
                    <input 
                      value={metric.value}
                      onChange={(e) => {
                        const newMetrics = [...data.metrics];
                        newMetrics[idx].value = e.target.value;
                        setData({ ...data, metrics: newMetrics });
                      }}
                      className="w-full border-none outline-none bg-transparent text-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Area */}
            <div className="flex-1 border-2 border-dashed border-slate-100 rounded flex flex-col items-center justify-center bg-slate-50 group hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
              />
              <div className="w-12 h-12 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3 group-hover:text-blue-600 transition-colors">
                <ImageIcon size={20} />
              </div>
              <span className="text-sm font-medium text-slate-400">Click to upload visual creative</span>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-300">
              <span>Internal / Strictly Confidential</span>
              <button 
                onClick={simulateExcelLoad}
                className="hover:text-blue-600 hover:underline"
              >
                Simulate Data Upload
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
