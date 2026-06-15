import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkspaceLayout } from './WorkspaceLayout';
import { AttendanceTemplate } from './templates/AttendanceTemplate';
import { Download } from 'lucide-react';

export const MagazineEditor: React.FC = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();

  const [reportData, setReportData] = useState({
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
  });

  const handleExportPDF = () => {
    console.log(document.getElementById('report-canvas')?.outerHTML);
  };

  const handleDepartmentChange = (index: number, field: string, value: string | number) => {
    const newData = [...reportData.departmentData];
    newData[index] = { ...newData[index], [field]: value };
    setReportData({ ...reportData, departmentData: newData });
  };

  const handleHeadcountChange = (index: number, field: string, value: string | number) => {
    const newData = [...reportData.headcountData];
    newData[index] = { ...newData[index], [field]: value };
    setReportData({ ...reportData, headcountData: newData });
  };

  return (
    <WorkspaceLayout company={{ id: 'none', name: 'Magazine Builder' } as any}>
      <div className="flex h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] bg-background w-full">
        
        {/* Left Column (The Canvas) */}
        <div className="flex-1 bg-slate-200 overflow-auto flex items-start justify-center p-12">
          {/* Visual Scaling Wrapper (optional, but good for fitting) */}
          <div className="transform scale-[0.7] xl:scale-90 origin-top">
            <AttendanceTemplate data={reportData} />
          </div>
        </div>

        {/* Right Column (The Sidebar) */}
        <div className="w-96 bg-slate-50 border-l border-slate-200 p-6 flex flex-col overflow-y-auto shrink-0">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
            <h2 className="text-lg font-black text-slate-900">Report Editor</h2>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all text-sm"
            >
              <Download className="w-4 h-4" />
              Export to PDF
            </button>
          </div>

          <div className="space-y-6">
            {/* General Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">General</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Hero Image URL</label>
                <input 
                  type="text" 
                  value={reportData.heroImageUrl}
                  onChange={(e) => setReportData({ ...reportData, heroImageUrl: e.target.value })}
                  className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                />
              </div>
            </div>

            {/* KPI Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key Metrics</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Compliance Score</label>
                <input 
                  type="text" 
                  value={reportData.complianceScore}
                  onChange={(e) => setReportData({ ...reportData, complianceScore: e.target.value })}
                  className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Leave Utilization</label>
                <input 
                  type="text" 
                  value={reportData.leaveUtilization}
                  onChange={(e) => setReportData({ ...reportData, leaveUtilization: e.target.value })}
                  className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Total New Joiners</label>
                <input 
                  type="text" 
                  value={reportData.totalJoiners}
                  onChange={(e) => setReportData({ ...reportData, totalJoiners: e.target.value })}
                  className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border"
                />
              </div>
            </div>

            {/* Department Data */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department Data</h3>
              {reportData.departmentData.map((dept, index) => (
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

            {/* Headcount Data */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Headcount Data</h3>
              {reportData.headcountData.map((hc, index) => (
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
        </div>
      </div>
    </WorkspaceLayout>
  );
};
