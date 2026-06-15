import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  LabelList,
} from 'recharts';

export const AttendanceTemplate = ({ data }: { data: any }) => {
  const AXIS_TICK = { fontSize: 10, fontWeight: 500, fill: '#9ca3af' };

  return (
    <div id="report-canvas" className="w-[794px] min-h-[1123px] relative bg-white shadow-xl flex flex-col overflow-hidden font-sans">
      {/* ── HERO IMAGE ─────────────────────────────────────────────────────── */}
      <div className="relative w-full h-64 shrink-0 bg-slate-200">
        <img
          src={data.heroImageUrl}
          alt="Report Header Hero"
          className="w-full h-full object-cover block"
        />

        {/* ── KPI RIBBON ──────────────────────── */}
        <div className="absolute -bottom-10 left-0 w-full px-12 z-10 box-border">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center text-center shadow-sm">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest mb-1.5 leading-tight">
                Attendance Compliance
              </span>
              <span className="text-4xl font-extrabold text-blue-900 leading-none">
                {data.complianceScore}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center text-center shadow-sm">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest mb-1.5 leading-tight">
                Leave Utilization
              </span>
              <span className="text-4xl font-extrabold text-blue-900 leading-none">
                {data.leaveUtilization}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center text-center shadow-sm">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest mb-1.5 leading-tight">
                Total New Joiners
              </span>
              <span className="text-4xl font-extrabold text-blue-900 leading-none">
                {data.totalJoiners}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT AREA ────────────────────────────────────────────────────── */}
      <div className="flex-1 mt-16 px-12 pb-8 flex flex-col justify-between overflow-hidden">
        {/* ── SECTION 1: DEPARTMENT-WISE ATTENDANCE % ───────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center text-[11px] font-black shrink-0">
              1
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-900 m-0">
              Department-Wise Attendance %
            </h2>
          </div>

          <div className="flex justify-center">
            <BarChart
              width={668}
              height={220}
              layout="vertical"
              data={data.departmentData}
              margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                width={120}
              />
              <Bar
                dataKey="value"
                fill="#1e3a8a"
                radius={[0, 3, 3, 0]}
                barSize={14}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(val: any) => `${val}%`}
                  style={{ fontSize: '10px', fontWeight: 600, fill: '#6b7280' }}
                />
              </Bar>
            </BarChart>
          </div>
        </div>

        {/* ── SECTION 2: HEADCOUNT MOVEMENT TREND ───────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center text-[11px] font-black shrink-0">
              2
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-900 m-0">
              Headcount Movement Trend
            </h2>
          </div>

          <div className="flex flex-col items-center">
            <LineChart
              width={668}
              height={210}
              data={data.headcountData}
              margin={{ top: 12, right: 30, left: 0, bottom: 4 }}
            >
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                width={32}
              />
              <Line
                type="monotone"
                dataKey="joiners"
                stroke="#1e3a8a"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }}
                activeDot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="leavers"
                stroke="#d1d5db"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </LineChart>

            <div className="flex justify-center gap-10 pt-2 w-full border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-[2px] bg-blue-900 rounded-[1px]" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  New Joiners
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-0 border-t-2 border-dashed border-slate-300" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Leavers
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-100 pt-4 flex justify-between items-center shrink-0">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-blue-900 opacity-30 m-0">
            Corporate Intelligence Report // Confidential
          </p>
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-blue-900 opacity-30 m-0">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </footer>
      </div>
    </div>
  );
};
