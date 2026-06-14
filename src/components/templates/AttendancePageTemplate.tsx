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

interface AttendancePageProps {
  payload: {
    metrics?: {
      compliance: string;
      leave_utilization: string;
      new_joiners: string;
    };
    departmentData?: Array<{ name: string; value: number }>;
    headcountData?: Array<{ month: string; joiners: number; leavers: number }>;
  };
}

export const AttendancePageTemplate: React.FC<AttendancePageProps> = ({ payload }) => {
  const { metrics, departmentData, headcountData } = payload;

  return (
    <div className="flex-1 flex flex-col bg-white text-slate-900 p-12 space-y-12">
      {/* ATTENDANCE OVERVIEW BANNER */}
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
            <p className="text-4xl font-black text-slate-900">{metrics?.leave_utilization || '0.0%'}</p>
          </div>
          <div className="p-8 bg-slate-900 text-white rounded-3xl space-y-2 shadow-xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total New Joiners</p>
            <p className="text-4xl font-black">{metrics?.new_joiners || '0'}</p>
          </div>
        </div>
      </header>

      {/* SECTION 1: DEPARTMENT-WISE ATTENDANCE */}
      <section className="space-y-8">
        <div className="flex items-center gap-6">
          <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">1</span>
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Department-Wise Attendance %</h2>
          <div className="h-px flex-1 bg-slate-900/5" />
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={departmentData || []}
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                width={100}
              />
              <Bar 
                dataKey="value" 
                radius={[0, 4, 4, 0]} 
                barSize={20}
              >
                {(departmentData || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value < 85 ? '#ef4444' : '#0f172a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* SECTION 2: HEADCOUNT MOVEMENT TREND */}
      <section className="space-y-8">
        <div className="flex items-center gap-6">
          <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">2</span>
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Headcount Movement Trend</h2>
          <div className="h-px flex-1 bg-slate-900/5" />
        </div>

        <div className="h-[250px] w-full px-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={headcountData || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis hide />
              <Line 
                type="monotone" 
                dataKey="joiners" 
                stroke="#3b82f6" 
                strokeWidth={4} 
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} 
                activeDot={false}
              />
              <Line 
                type="monotone" 
                dataKey="leavers" 
                stroke="#ef4444" 
                strokeWidth={4} 
                dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} 
                activeDot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex justify-center gap-12 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Joiners</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leavers</span>
          </div>
        </div>
      </section>

      {/* FOOTER METADATA */}
      <footer className="mt-auto pt-12 border-t border-slate-100 flex justify-between items-center">
        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Corporate Intelligence // Confidential</p>
        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </footer>
    </div>
  );
};
