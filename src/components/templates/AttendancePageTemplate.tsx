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

// ─── PRINT-SAFE TICK STYLE ────────────────────────────────────────────────────
const AXIS_TICK = { fontSize: 10, fontWeight: 500, fill: '#9ca3af' };

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
  const heroImageUrl =
    payload?.hero?.imageUrl ||
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80';
  const metrics = payload?.metrics;
  const departmentData = Array.isArray(payload?.departmentData) ? payload.departmentData : [];
  const headcountData = Array.isArray(payload?.headcountData) ? payload.headcountData : [];

  return (
    <div
      className="bg-white font-sans"
      style={{
        width: '794px',
        height: '1123px',
        minHeight: '1123px',
        maxHeight: '1123px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── HERO IMAGE ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', height: '256px', flexShrink: 0, background: '#e2e8f0' }}>
        <img
          src={heroImageUrl}
          alt="Report Header Hero"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* ── KPI RIBBON — overlaps hero bottom edge ──────────────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: '-40px',
            left: 0,
            width: '100%',
            padding: '0 48px',
            zIndex: 10,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
            {[
              { label: 'Attendance Compliance', value: metrics?.compliance || '—' },
              { label: 'Leave Utilization',     value: metrics?.utilization || '—' },
              { label: 'Total New Joiners',     value: metrics?.joiners    || '—' },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#1e3a8a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '6px',
                    lineHeight: 1.2,
                  }}
                >
                  {label}
                </span>
                <span style={{ fontSize: '36px', fontWeight: 800, color: '#1e3a8a', lineHeight: 1 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT AREA ────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          marginTop: '64px',
          padding: '0 48px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* ── SECTION 1: DEPARTMENT-WISE ATTENDANCE % ───────────────────── */}
        <div>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#1e3a8a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              1
            </div>
            <h2
              style={{
                fontSize: '11px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#1e3a8a',
                margin: 0,
              }}
            >
              Department-Wise Attendance %
            </h2>
          </div>

          {/* Bar chart — hardcoded dimensions, no ResponsiveContainer, no animations */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <BarChart
              width={668}
              height={220}
              layout="vertical"
              data={departmentData}
              margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
            >
              {/* No CartesianGrid — fully stripped */}
              <XAxis
                type="number"
                hide
              />
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
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#1e3a8a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              2
            </div>
            <h2
              style={{
                fontSize: '11px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#1e3a8a',
                margin: 0,
              }}
            >
              Headcount Movement Trend
            </h2>
          </div>

          {/* Line chart — hardcoded dimensions, no ResponsiveContainer, no animations */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LineChart
              width={668}
              height={210}
              data={headcountData}
              margin={{ top: 12, right: 30, left: 0, bottom: 4 }}
            >
              {/* No CartesianGrid — fully stripped */}
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
              {/* Joiners — dark gray line, purple dots */}
              <Line
                type="monotone"
                dataKey="joiners"
                stroke="#1e3a8a"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }}
                activeDot={false}
                isAnimationActive={false}
              />
              {/* Leavers — muted dashed line */}
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

            {/* Custom print legend */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '40px',
                paddingTop: '8px',
                width: '100%',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '2px', background: '#1e3a8a', borderRadius: '1px' }} />
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  New Joiners
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '0', borderTop: '2px dashed #d1d5db' }} />
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Leavers
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer
          style={{
            borderTop: '1px solid #f1f5f9',
            paddingTop: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: '#1e3a8a', opacity: 0.3, margin: 0 }}>
            Corporate Intelligence Report // Confidential
          </p>
          <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: '#1e3a8a', opacity: 0.3, margin: 0 }}>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </footer>
      </div>
    </div>
  );
};
