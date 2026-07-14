import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { ArrowLeft, Loader2, AlertCircle, UploadCloud, Download, Image as ImageIcon, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Papa from 'papaparse';

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

const extractVarsFromLayout = (layout: any): string[] => {
  if (!layout || !layout.fields) return [];
  return layout.fields.map((f: any) => f.name);
};

const getChartOptions = (chartType: string, chartDataStr?: string) => {
  let labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let series = [120, 200, 150, 80, 70, 110, 130];
  try {
    if (chartDataStr) {
      const parsed = JSON.parse(chartDataStr);
      if (parsed.labels) labels = parsed.labels;
      if (parsed.series) series = parsed.series;
    }
  } catch (e) {}

  const grid = { top: 10, bottom: 20, left: 10, right: 10, containLabel: true };

  const baseOptions = {
    tooltip: { trigger: 'axis' },
    grid,
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [{ data: series, type: 'bar' }]
  };

  switch (chartType) {
    case 'pie':
      return {
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: '75%', center: ['50%', '50%'], data: labels.map((l, i) => ({ name: l, value: series[i] || 0 })) }]
      };
    case 'line':
      return { ...baseOptions, series: [{ data: series, type: 'line', smooth: true }] };
    case 'scatter':
      return {
        grid,
        xAxis: {},
        yAxis: {},
        series: [{ symbolSize: 10, data: series.map((s, i) => [i, s]), type: 'scatter' }]
      };
    case 'radar':
      return {
        radar: { indicator: labels.map(l => ({ name: l, max: Math.max(...series) * 1.2 || 100 })), center: ['50%', '50%'], radius: '70%' },
        series: [{ type: 'radar', data: [{ value: series, name: 'Data' }] }]
      };
    case 'funnel':
      return {
        tooltip: { trigger: 'item' },
        series: [{ type: 'funnel', left: '10%', width: '80%', height: '80%', data: labels.map((l, i) => ({ name: l, value: series[i] || 0 })) }]
      };
    default:
      return baseOptions;
  }
};

/* ─── Field Components ────────────────────────────────────────── */
const COMMON_ICONS = [
  'Smile', 'Heart', 'Star', 'ThumbsUp', 'ThumbsDown', 'Zap', 'Coffee', 'Activity',
  'AlertCircle', 'AlertTriangle', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown',
  'Bell', 'Bookmark', 'Briefcase', 'Calendar', 'Camera', 'Check', 'CheckCircle',
  'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight', 'Clock', 'Cloud',
  'Compass', 'Copy', 'CreditCard', 'Download', 'Edit', 'Eye', 'EyeOff', 'File',
  'FileText', 'Filter', 'Flag', 'Folder', 'Gift', 'Globe', 'Headphones', 'Home',
  'Image', 'Info', 'Key', 'Layers', 'Layout', 'Link', 'Lock', 'Mail', 'Map',
  'MapPin', 'MessageCircle', 'MessageSquare', 'Mic', 'Minus', 'Moon', 'MoreHorizontal',
  'MoreVertical', 'Music', 'Package', 'Paperclip', 'Pause', 'PenTool', 'Phone',
  'Play', 'Plus', 'PlusCircle', 'Power', 'Printer', 'RefreshCw', 'Repeat',
  'Save', 'Search', 'Send', 'Settings', 'Share', 'Share2', 'Shield', 'ShoppingBag',
  'ShoppingCart', 'Shuffle', 'SkipBack', 'SkipForward', 'Slash', 'Sliders',
  'Smartphone', 'Speaker', 'StarHalf', 'StopCircle', 'Sun', 'Sunrise', 'Sunset',
  'Tablet', 'Tag', 'Target', 'Terminal', 'Thermometer', 'Trash', 'Trash2',
  'TrendingDown', 'TrendingUp', 'Tv', 'Type', 'Umbrella', 'Unlock', 'Upload',
  'UploadCloud', 'User', 'UserCheck', 'UserMinus', 'UserPlus', 'Users', 'Video',
  'VideoOff', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Watch', 'Wifi',
  'WifiOff', 'Wind', 'X', 'XCircle', 'XSquare', 'Youtube', 'ZapOff', 'ZoomIn',
  'ZoomOut'
];

const ChartDataEditor = ({ value, onChange, chartType }: { value: string, onChange: (v: string) => void, chartType: string }) => {
  let chartData = { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], series: [120, 200, 150, 80, 70, 110, 130] };
  try {
    if (value) {
      chartData = JSON.parse(value);
    }
  } catch(e) {}

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="text-xs font-semibold text-gray-700">Chart Data ({chartType})</div>
      <div className="flex flex-col gap-2">
        {chartData.labels.map((lbl: string, idx: number) => (
          <div key={idx} className="flex gap-2 items-center">
            <input 
              type="text"
              value={lbl}
              onChange={(e) => {
                const newData = { ...chartData };
                newData.labels[idx] = e.target.value;
                onChange(JSON.stringify(newData));
              }}
              onBlur={onBlur}
              className="w-1/2 px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-black outline-none"
              placeholder="Label"
            />
            <input 
              type="number"
              value={chartData.series[idx]}
              onChange={(e) => {
                const newData = { ...chartData };
                newData.series[idx] = parseFloat(e.target.value) || 0;
                onChange(JSON.stringify(newData));
              }}
              onBlur={onBlur}
              className="w-1/2 px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-black outline-none"
              placeholder="Value"
            />
            <button 
              onClick={() => {
                const newData = { ...chartData };
                newData.labels.splice(idx, 1);
                newData.series.splice(idx, 1);
                onChange(JSON.stringify(newData));
              }}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const newData = { ...chartData };
            newData.labels.push(`Item ${newData.labels.length + 1}`);
            newData.series.push(0);
            onChange(JSON.stringify(newData));
          }}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium self-start flex items-center gap-1"
        >
          + Add Data Point
        </button>
      </div>
    </div>
  );
};

const IconPicker = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
  const [search, setSearch] = useState('');
  
  const filtered = COMMON_ICONS.filter(name => name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="text-xs font-semibold text-gray-700">Select Icon</div>
      <input 
        type="text" 
        placeholder="Search icons..." 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:border-black outline-none"
      />
      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <span className="text-xs text-gray-400">No icons found.</span>
        ) : (
          filtered.map(name => {
            const IconCmp = (LucideIcons as any)[name];
            if (!IconCmp) return null;
            return (
              <button
                key={name}
                onClick={() => onChange(name)}
                className={`p-2 rounded-md transition-colors ${value === name ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                title={name}
              >
                <IconCmp className="w-5 h-5" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

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
  const [layoutJson, setLayoutJson] = useState<any>(null);
  const [localFormData, setLocalFormData] = useState<Record<string, string>>({});

  const [uploadingVars, setUploadingVars] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [initialScale, setInitialScale] = useState(1);
  const transformRef = useRef<any>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };



  useEffect(() => {
    const handleResize = () => {
      const h = window.innerHeight;
      const w = window.innerWidth;
      const s = Math.min((h - 80) / 1123, (w - 420 - 80) / 794);
      setInitialScale(s > 0 ? s : 1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          const layout = tpl.layout_json;
          setLayoutJson(layout);
          
          const dbData = pageData.data || {};
          const initialState: Record<string, string> = {};
          
          if (layout.fields) {
            layout.fields.forEach((field: any) => {
              const v = field.id;
              const dbVal = dbData[field.id] || dbData[field.name];
              if (dbVal) {
                initialState[v] = dbVal;
              } else {
                if (field.type === 'Icon') {
                  initialState[v] = 'Smile';
                } else if (field.type === 'Chart') {
                  initialState[v] = JSON.stringify({
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    series: [120, 200, 150, 80, 70, 110, 130]
                  });
                } else if (isImageVar(field.name)) {
                  initialState[v] = UNSPLASH_PLACEHOLDER;
                } else {
                  initialState[v] = toTitleCase(field.name);
                }
              }
            });
          }
          
          setLocalFormData(initialState);
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

  // Inject Google Fonts from metadata
  useEffect(() => {
    if (!layoutJson?.fields) return;
    const fonts = new Set<string>();
    layoutJson.fields.forEach((f: any) => {
      if (f.type === 'Text' && f.metadata?.fontFamily) {
        let family = f.metadata.fontFamily;
        if (family.includes(',')) family = family.split(',')[0];
        family = family.replace(/['"]/g, '').trim();
        if (family) fonts.add(family);
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
  }, [layoutJson]);

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

      const newData = { ...localFormData, [variable]: data.publicUrl };
      setLocalFormData(newData);
    } catch (err: any) {
      showToast(err.message || 'Unexpected upload error.', 'error');
    } finally {
      setUploadingVars(prev => ({ ...prev, [variable]: false }));
      event.target.value = ''; // reset input
    }
  };

  const handleDownloadPdf = async () => {
    if (!pageId || !layoutJson) return;

    const currentPage = {
      id: pageId,
      title: pageTitle,
      data: localFormData,
      templates: {
        layout_json: layoutJson
      }
    };

    try {
      showToast('Generating PDF on Server, please wait...', 'success');

      // Send single page as compiler pages array and ensure no React elements
      const cleanPayload = JSON.parse(JSON.stringify({ pages: [currentPage] }));

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanPayload),
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/pdf')) {
        let errMessage = 'Invalid file format received';
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch (e) {}
        throw new Error(errMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pageTitle || 'document'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      showToast('PDF downloaded successfully!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to generate PDF.', 'error');
    }
  };

  const handleSave = async () => {
    if (!pageId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pages')
        .update({ data: localFormData, updated_at: new Date().toISOString() })
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

  const fields = layoutJson?.fields || [];

  const handleDownloadTemplate = () => {
    const csvData: any[] = [];
    csvData.push(['Field Description', 'Your Text / Chart X-Axis', 'Chart Data 1', 'Chart Data 2']);
    
    const dataFields = fields.filter((f: any) => {
      const t = f.type?.toLowerCase() || '';
      return !['image', 'icon', 'svg'].includes(t);
    });

    dataFields.forEach((field: any) => {
      const friendlyName = toTitleCase(field.name);
      if (field.type === 'Chart') {
        csvData.push([friendlyName, 'Label 1', '100', '150']);
        csvData.push([friendlyName, 'Label 2', '200', '250']);
      } else {
        csvData.push([friendlyName, localFormData[field.id] || 'Your text here', '', '']);
      }
    });

    const csvString = Papa.unparse(csvData, { header: false });
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pageTitle || 'Template'}_CSV_Format.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const keyMap: Record<string, string> = {};
    fields.forEach((f: any) => {
      keyMap[toTitleCase(f.name)] = f.id;
    });
    
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length === 0) return;
        
        const dataRows = rows.slice(1);
        const updates: Record<string, any> = {};
        const chartGroups: Record<string, { labels: string[], series1: number[], series2: number[] }> = {};

        dataRows.forEach(row => {
          if (row.length < 2) return;
          const friendlyName = row[0];
          if (!friendlyName) return;
          
          const key = keyMap[friendlyName];
          if (!key) {
            console.warn(`[CSV Parser] Skipping unrecognized field description: "${friendlyName}"`);
            return;
          }

          const label = row[1];
          const rawData1 = row[2] || '';
          const rawData2 = row[3] || '';
          
          const sanitize = (val: string) => {
            if (!val || val.trim() === '') return 0;
            const stripped = val.replace(/[^\d.-]/g, '');
            const parsed = parseFloat(stripped);
            return isNaN(parsed) ? 0 : parsed;
          };

          const field = fields.find((f: any) => f.id === key);
          if (!field) return;

          if (field.type === 'Chart') {
            if (!chartGroups[key]) chartGroups[key] = { labels: [], series1: [], series2: [] };
            chartGroups[key].labels.push(label);
            chartGroups[key].series1.push(sanitize(rawData1));
            chartGroups[key].series2.push(sanitize(rawData2));
          } else {
            updates[key] = label;
          }
        });
        
        Object.keys(chartGroups).forEach(key => {
          const group = chartGroups[key];
          updates[key] = JSON.stringify({
            labels: group.labels,
            series: group.series1,
            series2: group.series2
          });
        });

        const newData = { ...localFormData, ...updates };
        setLocalFormData(newData);
        showToast('CSV Data imported successfully!', 'success');
      }
    });
    
    if (e.target) e.target.value = '';
  };

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden flex-row-reverse">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Right Canvas Workspace (Dedicated Consumer Rendering Engine) */}
      <div className="flex-1 w-full h-full bg-slate-50 relative flex flex-col justify-center items-center overflow-hidden border-l border-gray-200">
        
        {/* Editor Top Toolbar */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 pointer-events-none">
          <button
            onClick={() => navigate(`/folder/${folderId}`)}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:text-gray-900 shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 bg-slate-50 px-2">
            {pageTitle}
          </span>
        </div>

        <TransformWrapper
          ref={transformRef}
          initialScale={initialScale}
          minScale={0.1}
          maxScale={4}
          centerOnInit={true}
          alignmentAnimation={{ animationTime: 0 }}
          wheel={{ disabled: true }}
          pinch={{ disabled: true }}
          doubleClick={{ disabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute top-6 right-6 z-20 flex items-center gap-1 bg-white border border-gray-300 rounded-lg shadow-sm p-1 mt-12">
                <button 
                  onClick={() => zoomOut()} 
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => resetTransform()} 
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors"
                  title="Reset Zoom"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => zoomIn()} 
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
            {/* The Locked A4 Canvas Component */}
            <div 
              id="a4-canvas-container"
              className="bg-white shadow-2xl shrink-0" 
              style={{ 
                width: '794px', 
                height: '1123px', 
                backgroundImage: `url('${layoutJson?.background_url || ''}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {fields.map((field: any) => {
            const val = localFormData[field.id] || '';
            const metadata = field.metadata || {};

            return (
              <div 
                key={field.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFieldId(field.id);
                  document.getElementById(`sidebar-item-${field.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                onMouseEnter={() => setActiveFieldId(field.id)}
                onMouseLeave={() => setActiveFieldId(null)}
                style={{
                  position: 'absolute',
                  top: `${field.top}%`,
                  left: `${field.left}%`,
                  width: `${field.width}%`,
                  height: `${field.height}%`,
                  borderRadius: metadata.borderRadius ? `${metadata.borderRadius}px` : undefined,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: metadata.textAlign === 'left' ? 'flex-start' : metadata.textAlign === 'right' ? 'flex-end' : 'center',
                  justifyContent: metadata.textAlign === 'left' ? 'flex-start' : metadata.textAlign === 'right' ? 'flex-end' : 'center',
                  color: metadata.fontColor || 'inherit',
                  fontFamily: metadata.fontFamily || 'inherit',
                  fontSize: metadata.fontSize ? `${metadata.fontSize}px` : '16px',
                  lineHeight: metadata.lineHeight || '1.5',
                  fontWeight: metadata.fontWeight || 'normal',
                  fontStyle: metadata.fontStyle || 'normal',
                  textDecoration: metadata.textDecoration || 'none',
                  textAlign: metadata.textAlign || 'center',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  border: activeFieldId === field.id ? '2px solid #3b82f6' : 'none',
                  boxShadow: activeFieldId === field.id ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none',
                  zIndex: activeFieldId === field.id ? 50 : 10,
                  transition: 'all 0.2s ease',
                  backgroundColor: activeFieldId === field.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                }}
              >
                {field.type === 'Image' ? (
                  <div 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      backgroundImage: val ? `url('${val}')` : 'none', 
                      backgroundSize: 'cover', 
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }} 
                  />
                ) : field.type === 'Chart' ? (
                  <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                    <ReactECharts 
                      option={getChartOptions(metadata.chartType || 'bar', val)} 
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'svg' }}
                    />
                  </div>
                ) : field.type === 'Icon' ? (
                  (() => {
                    const IconCmp = (LucideIcons as any)[val || 'Smile'] || LucideIcons.Smile;
                    return <IconCmp className="w-full h-full" />;
                  })()
                ) : (
                  <span style={{ width: '100%' }}>{val}</span>
                )}
              </div>
            );
          })}
            </div>
          </TransformComponent>
          </>
          )}
        </TransformWrapper>
      </div>

      {/* Left Properties Panel (Data Entry Form) */}
      <div className="w-[420px] flex-shrink-0 bg-white flex flex-col h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.04)]">
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div className="space-y-4 mb-2">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
              <p className="text-sm text-gray-500">Edit template fields below</p>
            </div>
            
            {fields.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV Template
                </button>
                <div className="flex-1 relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200">
                    <UploadCloud className="w-3.5 h-3.5" />
                    Upload Data
                  </div>
                </div>
              </div>
            )}
          </div>

          {fields.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl py-16 gap-3">
            <span className="text-2xl">📄</span>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">No Fields Found</p>
            <p className="text-xs text-gray-400 text-center max-w-[18ch]">This template has no dynamic variables.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fields.map((field: any) => {
              const variable = field.id;
              return (
                <div 
                  key={field.id} 
                  id={`sidebar-item-${field.id}`}
                  className={`flex flex-col gap-2 p-3 -mx-3 rounded-lg transition-colors border ${activeFieldId === field.id ? 'border-blue-400 bg-blue-50/30' : 'border-transparent hover:bg-gray-50'}`}
                  onMouseEnter={() => setActiveFieldId(field.id)}
                  onMouseLeave={() => setActiveFieldId(null)}
                  onFocus={() => setActiveFieldId(field.id)}
                  onBlur={() => setActiveFieldId(null)}
                >
                  <label className="text-xs font-medium text-gray-700 flex justify-between">
                    <span>{toTitleCase(field.name)}</span>
                    {field.type === 'Text' && field.metadata?.maxChars && (
                      <span className="text-gray-400">
                        {(localFormData[variable] || '').length} / {field.metadata.maxChars}
                      </span>
                    )}
                  </label>

                  {field.type === 'Image' ? (
                    <div className="relative flex flex-col items-center justify-center w-full h-32 rounded-lg border border-dashed border-gray-300 bg-white hover:bg-gray-50 transition-colors overflow-hidden group">
                      <input 
                        type="file" 
                        accept=".jpg,.jpeg,.png,.svg" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        onChange={(e) => handleFileUpload(variable, e)}
                        disabled={uploadingVars[variable]}
                      />
                      
                      {localFormData[variable] && localFormData[variable] !== UNSPLASH_PLACEHOLDER && (
                        <img
                          src={localFormData[variable]}
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
                              {localFormData[variable] && localFormData[variable] !== UNSPLASH_PLACEHOLDER ? 'Replace Image' : 'Upload Image'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : field.type === 'Chart' ? (
                    <ChartDataEditor 
                      chartType={field.metadata?.chartType || 'bar'}
                      value={localFormData[variable] || ''}
                      onChange={(v) => setLocalFormData({ ...localFormData, [variable]: v })}
                    />
                  ) : field.type === 'Icon' ? (
                    <IconPicker 
                      value={localFormData[variable] || 'Smile'}
                      onChange={(v) => {
                        const newData = { ...localFormData, [variable]: v };
                        setLocalFormData(newData);
                      }}
                    />
                  ) : (
                    <textarea
                      value={localFormData[variable] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (field.metadata?.maxChars && val.length > field.metadata.maxChars) return;
                        setLocalFormData({ ...localFormData, [variable]: val });
                      }}
                      maxLength={field.metadata?.maxChars || undefined}
                      placeholder={`Enter ${toTitleCase(field.name).toLowerCase()}`}
                      className="bg-white border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all w-full resize-none min-h-[80px]"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Docked Footer (Action Buttons) */}
        <div className="p-6 border-t border-gray-100 bg-white/95 backdrop-blur shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col gap-3">
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

