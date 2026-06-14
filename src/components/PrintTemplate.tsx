import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';

interface Metric {
  label: string;
  value: string;
  percentage: number;
}

interface PrintTemplateProps {
  data: {
    title?: string;
    headline?: string;
    subheadline?: string;
    summaryText?: string;
    growthDriversText?: string;
    outlookText?: string;
    footerConfidentiality?: string;
    footerDate?: string;
    metrics?: any; // Can be Metric[] or specific object
    layout_style?: string;
    departmentData?: any[];
    headcountData?: any[];
    blocks?: any[];
  };
}

export const PrintTemplate = React.forwardRef<HTMLDivElement, PrintTemplateProps>(({ data }, ref) => {
  const isAttendance = data.layout_style === 'attendance_dashboard';

  if (isAttendance) {
    const metrics = data?.metrics;
    const departmentData = Array.isArray(data?.departmentData) ? data.departmentData : [];
    const headcountData = Array.isArray(data?.headcountData) ? data.headcountData : [];

    return (
      <div 
        ref={ref} 
        className="bg-white text-slate-900 p-[20mm] flex flex-col space-y-12"
        style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box', position: 'relative' }}
      >
        <header className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-900/10" />
            <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
              Attendance & Leave Intelligence
            </h1>
            <div className="h-px flex-1 bg-slate-900/10" />
          </div>
          
          <div className="grid grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 border border-slate-100 rounded-3xl space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Compliance</p>
              <p className="text-4xl font-black text-slate-900">{metrics?.compliance || '0.0%'}</p>
            </div>
            <div className="p-8 bg-slate-50 border border-slate-100 rounded-3xl space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leave Utilization</p>
              <p className="text-4xl font-black text-slate-900">{metrics?.utilization || '0.0%'}</p>
            </div>
            <div className="p-8 bg-slate-900 text-white rounded-3xl space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Total New Joiners</p>
              <p className="text-4xl font-black">{metrics?.joiners || '0'}</p>
            </div>
          </div>
        </header>

        <section className="space-y-8">
          <div className="flex items-center gap-6">
            <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">1</span>
            <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Department-Wise Attendance %</h2>
            <div className="h-px flex-1 bg-slate-900/5" />
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={departmentData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} width={100} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry?.value || 0) < 85 ? '#ef4444' : '#0f172a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-6">
            <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">2</span>
            <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Headcount Movement Trend</h2>
            <div className="h-px flex-1 bg-slate-900/5" />
          </div>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={headcountData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis hide />
                <Line type="monotone" dataKey="joiners" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6' }} />
                <Line type="monotone" dataKey="leavers" stroke="#ef4444" strokeWidth={4} dot={{ r: 4, fill: '#ef4444' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <footer className="mt-auto pt-12 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          <span>Corporate Intelligence // Confidential</span>
          <span>{data.footerDate || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </footer>
      </div>
    );
  }

  // Legacy & Dynamic Block logic below...
  return (
    <div 
      ref={ref}
      className="bg-white text-slate-900"
      style={{ 
        width: '210mm', 
        minHeight: '297mm', 
        padding: '20mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        color: '#0f172a'
      }}
    >
      <div className="border-b-4 border-slate-900 pb-12 mb-12">
        <h1 className="text-5xl font-black text-slate-900 leading-[1.2]">
          {data.headline || data.title || 'Untitled Report'}
        </h1>
        <p className="text-xl font-bold text-blue-600 mt-4 uppercase tracking-widest leading-[1.2]">
          {data.subheadline || 'EXECUTIVE SUMMARY'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-20 mb-12">
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Executive Summary</h3>
          <div className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
            {data.summaryText}
          </div>
        </div>

        <div className="space-y-8">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Key Performance</h3>
          <div className="space-y-6">
            {Array.isArray(data?.metrics) ? data.metrics.map((metric: any, idx: number) => (
              <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  {metric?.label || 'Metric'}
                </p>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-slate-900">{metric?.value || '0.0'}</span>
                  <span className={`text-sm font-bold ${(metric?.percentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(metric?.percentage || 0) >= 0 ? '+' : ''}{metric?.percentage || 0}%
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-8 border border-dashed border-slate-200 rounded-3xl text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Visual Blocks Layout</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-20 mb-auto">
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Strategic Drivers</h3>
          <div className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
            {data.growthDriversText}
          </div>
        </div>
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Future Outlook</h3>
          <div className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
            {data.outlookText}
          </div>
        </div>
      </div>

      <footer className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
        <span>{data.footerConfidentiality}</span>
        <span>{data.footerDate}</span>
      </footer>
    </div>
  );
});

PrintTemplate.displayName = 'PrintTemplate';
