import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';

interface AttendancePageProps {
  payload: {
    metrics?: {
      compliance: string;
      utilization: string;
      joiners: string;
    };
    departmentData?: Array<{ name: string; value: number }>;
    headcountData?: Array<{ month: string; joiners: number; leavers: number }>;
  };
}

export const AttendancePageTemplate: React.FC<AttendancePageProps> = ({ payload }) => {
  const metrics = payload?.metrics;
  const departmentData = Array.isArray(payload?.departmentData) ? payload.departmentData : [];
  const headcountData = Array.isArray(payload?.headcountData) ? payload.headcountData : [];

  return (
    <div className="w-[794px] min-h-[1123px] bg-white relative flex flex-col overflow-hidden shadow-none mx-auto print:shadow-none font-sans">
      {/* HERO IMAGE CONTAINER */}
      <div className="relative w-full h-72 shrink-0">
        <img 
          src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80" 
          alt="Office Background"
          className="w-full h-full object-cover"
        />
        {/* OVERLAPPING KPI RIBBON */}
        <div className="absolute -bottom-12 left-0 w-full px-12">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col items-center text-center">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest mb-1">Attendance Compliance</span>
              <span className="text-4xl font-extrabold text-blue-900">{metrics?.compliance || '0.0%'}</span>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col items-center text-center">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest mb-1">Leave Utilization</span>
              <span className="text-4xl font-extrabold text-blue-900">{metrics?.utilization || '0.0%'}</span>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col items-center text-center">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest mb-1">Total New Joiners</span>
              <span className="text-4xl font-extrabold text-blue-900">{metrics?.joiners || '0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 mt-20 px-12 pb-12 flex flex-col space-y-16">
        
        {/* SECTION 1: DEPARTMENT-WISE ATTENDANCE */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="bg-blue-900 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shrink-0">1</div>
            <h2 className="text-sm font-black uppercase tracking-wide text-blue-900">Department-Wise Attendance %</h2>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={departmentData}
                margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#374151' }}
                  width={100}
                />
                <Bar 
                  dataKey="value" 
                  radius={[0, 4, 4, 0]} 
                  barSize={18}
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#a78bfa" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 2: HEADCOUNT MOVEMENT TREND */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="bg-blue-900 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shrink-0">2</div>
            <h2 className="text-sm font-black uppercase tracking-wide text-blue-900">Headcount Movement Trend</h2>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={headcountData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <XAxis 
                  dataKey="month" 
                  hide
                />
                <YAxis hide />
                <Line 
                  type="monotone" 
                  dataKey="joiners" 
                  stroke="#4b5563" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#a78bfa', strokeWidth: 0 }} 
                  activeDot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="leavers" 
                  stroke="#9ca3af" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* CUSTOM LEGEND MATCHING PDF STYLE */}
          <div className="flex justify-center gap-12 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#a78bfa]" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New Joiners</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Leavers</span>
            </div>
          </div>
        </div>

        {/* FOOTER METADATA */}
        <footer className="mt-auto pt-10 border-t border-slate-100 flex justify-between items-center text-blue-900/40">
          <p className="text-[8px] font-black uppercase tracking-[0.4em]">Corporate Intelligence Intelligence Report // Confidential</p>
          <p className="text-[8px] font-black uppercase tracking-[0.4em]">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </footer>
      </div>
    </div>
  );
};
