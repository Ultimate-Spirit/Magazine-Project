import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkspaceLayout } from './WorkspaceLayout';
import { AttendanceTemplate } from './templates/AttendanceTemplate';
import { CoverTemplate } from './templates/CoverTemplate';
import { ExecutiveSummaryTemplate } from './templates/ExecutiveSummaryTemplate';
import { Download, CheckSquare, Square } from 'lucide-react';

const AVAILABLE_TEMPLATES = [
  { id: 'cover', name: 'Cover Page' },
  { id: 'executiveSummary', name: 'Executive Summary' },
  { id: 'attendance', name: 'Attendance Report' }
];

export const MagazineEditor: React.FC = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();

  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(['cover', 'executiveSummary', 'attendance']);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('cover');

  const [templateData, setTemplateData] = useState({
    cover: {
      title: 'Corporate Intelligence Report',
      subtitle: 'Q3 2026',
      author: 'Strategy Dept',
      date: 'October 2026'
    },
    executiveSummary: {
      title: 'Executive Summary',
      summaryText: 'This quarter saw significant improvements in compliance metrics and leave utilization mapping. We successfully onboarded new joiners across all departments while maintaining operational integrity. Focus for Q4 will remain on strategic resource allocation.'
    },
    attendance: {
      heroImageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80',
      complianceScore: '94%',
      leaveUtilization: '12%',
      totalJoiners: '45',
      departmentData: [
        { name: 'Engineering', value: 96 },
        { name: 'Sales', value: 92 },
        { name: 'Marketing', value: 95 },
        { name: 'HR', value: 98 },
        { name: 'Operations', value: 91 },
      ],
      headcountData: [
        { month: 'Jan', joiners: 10, leavers: 4 },
        { month: 'Feb', joiners: 15, leavers: 6 },
        { month: 'Mar', joiners: 8, leavers: 5 },
        { month: 'Apr', joiners: 20, leavers: 8 },
        { month: 'May', joiners: 12, leavers: 3 },
      ]
    }
  });

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const targetHtml = document.getElementById('report-canvas')?.outerHTML || '';

      const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4; margin: 0; }
    body { margin: 0; -webkit-print-color-adjust: exact; }
  </style>
</head>
<body>
${targetHtml}
</body>
</html>`;

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
      a.download = 'SDPL_Corporate_Intelligence.pdf';
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

  const toggleTemplate = (id: string) => {
    if (selectedTemplates.includes(id)) {
      setSelectedTemplates(prev => prev.filter(t => t !== id));
      if (activeTemplateId === id) {
        const remaining = selectedTemplates.filter(t => t !== id);
        setActiveTemplateId(remaining.length > 0 ? remaining[0] : '');
      }
    } else {
      setSelectedTemplates(prev => {
        const next = [...prev, id];
        return AVAILABLE_TEMPLATES.filter(t => next.includes(t.id)).map(t => t.id);
      });
      setActiveTemplateId(id);
    }
  };

  const handleDepartmentChange = (index: number, field: string, value: string | number) => {
    const newData = [...templateData.attendance.departmentData];
    newData[index] = { ...newData[index], [field]: value };
    setTemplateData(prev => ({
      ...prev,
      attendance: { ...prev.attendance, departmentData: newData }
    }));
  };

  const handleHeadcountChange = (index: number, field: string, value: string | number) => {
    const newData = [...templateData.attendance.headcountData];
    newData[index] = { ...newData[index], [field]: value };
    setTemplateData(prev => ({
      ...prev,
      attendance: { ...prev.attendance, headcountData: newData }
    }));
  };

  return (
    <WorkspaceLayout company={{ id: 'none', name: 'Magazine Builder' } as any}>
      <div className="flex h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] bg-background w-full">
        
        {/* Left Column (The Canvas) */}
        <div className="flex-1 bg-slate-200 overflow-auto flex flex-col items-center p-12">
          {/* Visual Scaling Wrapper */}
          <div className="transform scale-[0.7] xl:scale-90 origin-top flex flex-col items-center">
            <div id="report-canvas">
              {selectedTemplates.map((id) => {
                const isActive = activeTemplateId === id;
                return (
                  <div 
                    key={id} 
                    onClick={() => setActiveTemplateId(id)}
                    className={`relative w-[794px] min-h-[1123px] bg-white shadow-xl mb-8 break-after-page print:mb-0 print:shadow-none transition-all cursor-pointer ${isActive ? 'ring-4 ring-blue-500' : 'hover:ring-2 hover:ring-slate-400'}`}
                  >
                    {id === 'cover' && <CoverTemplate data={templateData.cover} />}
                    {id === 'executiveSummary' && <ExecutiveSummaryTemplate data={templateData.executiveSummary} />}
                    {id === 'attendance' && <AttendanceTemplate data={templateData.attendance} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (The Sidebar) */}
        <div className="w-96 bg-slate-50 border-l border-slate-200 p-6 flex flex-col overflow-y-auto shrink-0">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-black text-slate-900">Report Editor</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">Checklist Flow</p>
            </div>
            <button 
              onClick={handleExportPDF}
              disabled={exporting || selectedTemplates.length === 0}
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
            
            {/* Checklist Section */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Included Templates</h3>
              <div className="space-y-2">
                {AVAILABLE_TEMPLATES.map(template => {
                  const isChecked = selectedTemplates.includes(template.id);
                  const isActive = activeTemplateId === template.id;
                  
                  return (
                    <div 
                      key={template.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                      onClick={() => setActiveTemplateId(template.id)}
                    >
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleTemplate(template.id); }}
                          className="text-slate-400 hover:text-blue-600 focus:outline-none"
                        >
                          {isChecked ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                        </button>
                        <span className={`text-sm font-semibold ${isChecked ? 'text-slate-900' : 'text-slate-400'}`}>
                          {template.name}
                        </span>
                      </div>
                      {isActive && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Dynamic Data Forms based on activeTemplateId */}
            {activeTemplateId === 'cover' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cover Page Data</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                  <input 
                    type="text" 
                    value={templateData.cover.title}
                    onChange={(e) => setTemplateData(prev => ({...prev, cover: {...prev.cover, title: e.target.value}}))}
                    className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Subtitle</label>
                  <input 
                    type="text" 
                    value={templateData.cover.subtitle}
                    onChange={(e) => setTemplateData(prev => ({...prev, cover: {...prev.cover, subtitle: e.target.value}}))}
                    className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Author</label>
                  <input 
                    type="text" 
                    value={templateData.cover.author}
                    onChange={(e) => setTemplateData(prev => ({...prev, cover: {...prev.cover, author: e.target.value}}))}
                    className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input 
                    type="text" 
                    value={templateData.cover.date}
                    onChange={(e) => setTemplateData(prev => ({...prev, cover: {...prev.cover, date: e.target.value}}))}
                    className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                  />
                </div>
              </div>
            )}

            {activeTemplateId === 'executiveSummary' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Executive Summary Data</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                  <input 
                    type="text" 
                    value={templateData.executiveSummary.title}
                    onChange={(e) => setTemplateData(prev => ({...prev, executiveSummary: {...prev.executiveSummary, title: e.target.value}}))}
                    className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Summary Text</label>
                  <textarea 
                    rows={8}
                    value={templateData.executiveSummary.summaryText}
                    onChange={(e) => setTemplateData(prev => ({...prev, executiveSummary: {...prev.executiveSummary, summaryText: e.target.value}}))}
                    className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                  />
                </div>
              </div>
            )}

            {activeTemplateId === 'attendance' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">General</h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hero Image URL</label>
                    <input 
                      type="text" 
                      value={templateData.attendance.heroImageUrl}
                      onChange={(e) => setTemplateData(prev => ({...prev, attendance: {...prev.attendance, heroImageUrl: e.target.value}}))}
                      className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key Metrics</h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Compliance Score</label>
                    <input 
                      type="text" 
                      value={templateData.attendance.complianceScore}
                      onChange={(e) => setTemplateData(prev => ({...prev, attendance: {...prev.attendance, complianceScore: e.target.value}}))}
                      className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Leave Utilization</label>
                    <input 
                      type="text" 
                      value={templateData.attendance.leaveUtilization}
                      onChange={(e) => setTemplateData(prev => ({...prev, attendance: {...prev.attendance, leaveUtilization: e.target.value}}))}
                      className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Total New Joiners</label>
                    <input 
                      type="text" 
                      value={templateData.attendance.totalJoiners}
                      onChange={(e) => setTemplateData(prev => ({...prev, attendance: {...prev.attendance, totalJoiners: e.target.value}}))}
                      className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department Data</h3>
                  {templateData.attendance.departmentData.map((dept, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        type="text" 
                        value={dept.name}
                        onChange={(e) => handleDepartmentChange(index, 'name', e.target.value)}
                        className="w-1/2 text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                      />
                      <input 
                        type="number" 
                        value={dept.value}
                        onChange={(e) => handleDepartmentChange(index, 'value', Number(e.target.value))}
                        className="w-1/2 text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Headcount Data</h3>
                  {templateData.attendance.headcountData.map((hc, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        type="text" 
                        value={hc.month}
                        onChange={(e) => handleHeadcountChange(index, 'month', e.target.value)}
                        className="w-1/3 text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-2 border"
                      />
                      <input 
                        type="number" 
                        value={hc.joiners}
                        onChange={(e) => handleHeadcountChange(index, 'joiners', Number(e.target.value))}
                        className="w-1/3 text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-2 border text-blue-600"
                        title="Joiners"
                      />
                      <input 
                        type="number" 
                        value={hc.leavers}
                        onChange={(e) => handleHeadcountChange(index, 'leavers', Number(e.target.value))}
                        className="w-1/3 text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-2 border text-slate-400"
                        title="Leavers"
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
