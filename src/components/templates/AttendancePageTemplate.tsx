import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  LineChart, 
  Line,
  Cell,
  LabelList
} from 'recharts';

interface AttendancePageProps {
  payload: {
    hero?: {
      imageUrl?: string;
    };
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
  const heroImageUrl = payload?.hero?.imageUrl || 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80';
  const metrics = payload?.metrics;
  const departmentData = Array.isArray(payload?.departmentData) ? payload.departmentData : [];
  const headcountData = Array.isArray(payload?.headcountData) ? payload.headcountData : [];

  return (
    <div className="w-[794px] h-[1123px] min-h-[1123px] max-h-[1123px] bg-white relative flex flex-col overflow-hidden shadow-none mx-auto print:shadow-none font-sans">
      {/* HERO IMAGE CONTAINER */}
      <div className="relative w-full h-64 shrink-0 bg-slate-100">
        <img 
          src={heroImageUrl} 
          alt="Report Header Hero"
          className="w-full h-full object-cover"
        />
        {/* OVERLAPPING KPI RIBBON */}
        <div className="absolute -bottom-10 left-0 w-full px-12 z-10">
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
      <div className="flex-1 mt-16 px-12 pb-10 flex flex-col justify-between overflow-hidden">
        
        {/* SECTION 1: DEPARTMENT-WISE ATTENDANCE */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-900 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shrink-0">1</div>
            <h2 className="text-sm font-black uppercase tracking-wide text-blue-900">DEPARTMENT-WISE ATTENDANCE %</h2>
          </div>

          <div className="w-[698px] h-[280px] flex items-center justify-center">
            <BarChart
              layout="vertical"
              width={698}
              height={280}
              data={departmentData}
              margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
            >
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12, fontWeight: 600, fill: '#1e3a8a' }}
                width={110}
              />
              <Bar 
                dataKey="value" 
                fill="#a78bfa"
                radius={[0, 4, 4, 0]} 
                barSize={18}
              >
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  formatter={(val: any) => `${val}%`}
                  style={{ fontSize: '12px', fontWeight: 600, fill: '#1e3a8a' }} 
                />
              </Bar>
            </BarChart>
          </div>
        </div>

        {/* SECTION 2: HEADCOUNT MOVEMENT TREND */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-900 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shrink-0">2</div>
            <h2 className="text-sm font-black uppercase tracking-wide text-blue-900">HEADCOUNT MOVEMENT TREND</h2>
          </div>

          <div className="w-[698px] h-[280px] flex flex-col items-center justify-center">
            <LineChart 
              width={698} 
              height={240} 
              data={headcountData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fontWeight: 600, fill: '#1e3a8a' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fontWeight: 600, fill: '#1e3a8a' }}
              />
              <Line 
                type="monotone" 
                dataKey="joiners" 
                stroke="#4b5563" 
                strokeWidth={3} 
                dot={{ r: 5, fill: '#a78bfa', strokeWidth: 0 }} 
                activeDot={{ r: 7, fill: '#a78bfa', strokeWidth: 0 }}
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

            {/* CUSTOM LEGEND MATCHING PDF STYLE */}
            <div className="flex justify-center gap-12 pt-2 w-full border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#4b5563]" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New Joiners</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t-2 border-dashed border-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Leavers</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER METADATA */}
        <footer className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center text-blue-900/40 shrink-0">
          <p className="text-[8px] font-black uppercase tracking-[0.4em]">Corporate Intelligence Report // Confidential</p>
          <p className="text-[8px] font-black uppercase tracking-[0.4em]">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </footer>
      </div>
    </div>
  );
};
