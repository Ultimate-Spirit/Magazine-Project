import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkspaceLayout } from './WorkspaceLayout';
import { Download } from 'lucide-react';

export const parseTemplateVariables = (htmlString: string): string[] => {
  const regex = /\{\{([^}]+)\}\}/g;
  const vars = new Set<string>();
  let match;
  while ((match = regex.exec(htmlString)) !== null) {
    vars.add(match[1].trim());
  }
  return Array.from(vars);
};

export const MagazineEditor: React.FC = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();

  const [rawHtml, setRawHtml] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const vars = parseTemplateVariables(rawHtml);
    setTemplateVariables(vars);

    setFormData(prev => {
      const newFormData = { ...prev };
      vars.forEach(v => {
        if (newFormData[v] === undefined) {
          newFormData[v] = '';
        }
      });
      return newFormData;
    });
  }, [rawHtml]);

  const handleInputChange = (variable: string, value: string) => {
    setFormData(prev => ({ ...prev, [variable]: value }));
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const targetHtml = document.getElementById('report-canvas')?.innerHTML || '';

      const fullHTML = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><style>@page { size: A4; margin: 0; } body { margin: 0; -webkit-print-color-adjust: exact; }</style></head><body>${targetHtml}</body></html>`;

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: fullHTML }),
      });

      if (!response.ok) {
        let errMsg = `Server error ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errMsg += `: ${errData.error}`;
        } catch(e) {}
        throw new Error(errMsg);
      }

      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'magazine_export.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[handleExportPDF] Error:', err);
      alert(`PDF export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const processedHtml = useMemo(() => {
    if (!rawHtml) return '';
    let html = rawHtml;
    templateVariables.forEach(variable => {
      const value = formData[variable] || '';
      const regex = new RegExp(`\\{\\{\\s*${variable.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*\\}\\}`, 'g');
      html = html.replace(regex, value);
    });
    return html;
  }, [rawHtml, templateVariables, formData]);

  return (
    <WorkspaceLayout company={{ id: 'none', name: 'Magazine Builder' } as any}>
      <div className="flex h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] bg-background w-full">
        
        {/* Left Column (The Canvas) */}
        <div className="flex-1 bg-slate-200 overflow-auto flex flex-col items-center p-12">
          {/* Visual Scaling Wrapper */}
          <div className="transform scale-[0.7] xl:scale-90 origin-top flex flex-col items-center">
            <div 
              id="report-canvas"
              className="relative w-[794px] min-h-[1123px] bg-white shadow-xl mb-8 break-after-page print:mb-0 print:shadow-none transition-all"
              dangerouslySetInnerHTML={{ __html: processedHtml }}
            />
          </div>
        </div>

        {/* Right Column (The Sidebar) */}
        <div className="w-96 bg-slate-50 border-l border-slate-200 p-6 flex flex-col overflow-y-auto shrink-0">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-black text-slate-900">BYOC Editor</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">Bring Your Own Code</p>
            </div>
            <button 
              onClick={handleExportPDF}
              disabled={exporting || !rawHtml}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all text-sm disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : (
                <>
                  <Download className="w-4 h-4" />
                  Export to PDF
                </>
              )}
            </button>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Raw HTML Template</h3>
              <textarea
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                placeholder="Paste your HTML here with {{variables}}"
                className="w-full h-64 text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border font-mono"
              />
            </div>

            {templateVariables.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Template Variables</h3>
                <div className="space-y-4">
                  {templateVariables.map((variable) => (
                    <div key={variable}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">{variable}</label>
                      <input 
                        type="text" 
                        value={formData[variable] || ''}
                        onChange={(e) => handleInputChange(variable, e.target.value)}
                        className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
