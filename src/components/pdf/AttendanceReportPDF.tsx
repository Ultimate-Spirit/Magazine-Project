// ─── BUFFER POLYFILL GUARD ────────────────────────────────────────────────────
// @react-pdf/renderer requires Buffer in the browser. Vite's nodePolyfills plugin
// handles it globally, but we add a belt-and-suspenders guard here too.
import { Buffer } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Rect,
  Line,
  StyleSheet,
} from '@react-pdf/renderer';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const NAVY   = '#1e3a8a';
const PURPLE = '#a78bfa';
const GRAY   = '#9ca3af';
const LGRAY  = '#e5e7eb';
const WHITE  = '#ffffff';
const DARK   = '#374151';

// ─── SAFE NUMBER HELPERS ──────────────────────────────────────────────────────
// Every coordinate that flows into an SVG attribute MUST pass through one of
// these helpers. They guarantee a finite, non-NaN number so @react-pdf/renderer
// never receives undefined, Infinity, or NaN.
const safeNum  = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
// Safe division — returns fallback when divisor is 0 or NaN.
const safeDiv  = (a: number, b: number, fallback = 0): number =>
  b === 0 || !Number.isFinite(b) ? fallback : a / b;
// Clamp a value to [min, max] after ensuring it is finite.
const clamp    = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, safeNum(v, min)));

// ─── STYLESHEET ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    backgroundColor: WHITE,
    fontFamily: 'Helvetica',
    position: 'relative',
  },

  // ── HERO ──────────────────────────────────────────────────────────────────
  hero: { width: '100%', height: 200, position: 'relative' },
  heroImg: { width: '100%', height: 200, objectFit: 'cover' },
  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(30,58,138,0.35)',
  },

  // ── KPI RIBBON ────────────────────────────────────────────────────────────
  kpiRibbon: {
    position: 'absolute', top: 162, left: 36, right: 36,
    flexDirection: 'row', gap: 14, zIndex: 10,
  },
  kpiCard: {
    flex: 1, backgroundColor: WHITE,
    borderRadius: 10, borderWidth: 1, borderColor: LGRAY,
    paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: NAVY,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 6, textAlign: 'center',
  },
  kpiValue: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'center' },

  // ── CONTENT BODY ──────────────────────────────────────────────────────────
  body: { marginTop: 80, paddingHorizontal: 36, paddingBottom: 36, flexDirection: 'column' },

  // ── SECTION HEADER ────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 20 },
  badge: { width: 18, height: 18, borderRadius: 9, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: WHITE, fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'center', lineHeight: 1 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', letterSpacing: 1.4 },

  // ── CHART CONTAINERS ──────────────────────────────────────────────────────
  chartArea: { width: '100%' },

  // ── LEGEND ────────────────────────────────────────────────────────────────
  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: 28,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: NAVY },
  legendDash: { width: 18, height: 2, backgroundColor: LGRAY },
  legendLabel: {
    fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: GRAY,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  // ── FOOTER ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute', bottom: 28, left: 36, right: 36,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8,
  },
  footerText: {
    fontSize: 6, fontFamily: 'Helvetica-Bold', color: NAVY,
    textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.3,
  },
});

// ─── SAFE FALLBACK DATASETS ───────────────────────────────────────────────────
// These are always finite numbers — they serve as the hard fallback when the
// payload is empty, undefined, or contains non-numeric values.
const DEPT_DATA: Array<{ name: string; value: number }> = [
  { name: 'Production',  value: 97 },
  { name: 'Operations',  value: 94 },
  { name: 'Quality',     value: 91 },
  { name: 'Maintenance', value: 88 },
  { name: 'Logistics',   value: 85 },
];

const HEADCOUNT_DATA: Array<{ month: string; joiners: number; leavers: number }> = [
  { month: 'Jan', joiners: 8,  leavers: 3 },
  { month: 'Feb', joiners: 12, leavers: 5 },
  { month: 'Mar', joiners: 6,  leavers: 2 },
  { month: 'Apr', joiners: 15, leavers: 4 },
  { month: 'May', joiners: 10, leavers: 6 },
  { month: 'Jun', joiners: 7,  leavers: 3 },
];

// ─── PROPS ────────────────────────────────────────────────────────────────────
interface AttendanceReportPDFProps {
  heroImageUrl?: string;
  metrics?: {
    compliance?: string | number;
    utilization?: string | number;
    joiners?: string | number;
  };
  departmentData?: Array<{ name?: string; value?: number | string }>;
  headcountData?: Array<{ month?: string; joiners?: number | string; leavers?: number | string }>;
}

// ─── BAR CHART SVG ───────────────────────────────────────────────────────────
// All coordinate math is wrapped in safeNum/safeDiv/clamp so that undefined,
// NaN, or Infinity values can NEVER reach the SVG element attributes.
const BarChartSVG: React.FC<{ data: Array<{ name: string; value: number }> }> = ({ data }) => {
  // Fixed canvas dimensions — never collapse
  const SVG_W   = 490;
  const SVG_H   = 160;
  const LABEL_W = 95;
  const BAR_MAX = SVG_W - LABEL_W - 52; // rightmost space for value label
  const MAX_VAL = 100;

  // Guard: if data is empty, render a blank placeholder SVG of the same size
  if (!data || data.length === 0) {
    return (
      <Svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
        <Rect x={0} y={0} width={SVG_W} height={SVG_H} fill={WHITE} />
      </Svg>
    );
  }

  const rowH = safeDiv(SVG_H, data.length, 32);    // height per row, min 32
  const barH = clamp(rowH * 0.45, 6, 22);           // bar height 6–22 px

  return (
    <Svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
      {data.map((d, i) => {
        // Sanitise every value that will become a coordinate
        const val   = clamp(safeNum(d.value, 0), 0, 100);
        const barW  = clamp(safeDiv(val, MAX_VAL) * BAR_MAX, 0, BAR_MAX);
        const y     = safeNum(i * rowH + (rowH - barH) / 2, i * 32);
        const barX  = LABEL_W;
        const textY = clamp(y + barH / 2 + 3.5, 0, SVG_H);

        return (
          <React.Fragment key={`bar-${i}-${d.name ?? i}`}>
            {/* Label */}
            <Text
              x={0}
              y={textY}
              style={{ fontSize: 7.5, fontFamily: 'Helvetica', fill: DARK }}
            >
              {String(d.name ?? '')}
            </Text>

            {/* Track */}
            <Rect x={barX} y={y} width={BAR_MAX} height={barH} rx={3} fill={LGRAY} />

            {/* Filled bar — width is always ≥ 0 */}
            <Rect x={barX} y={y} width={Math.max(barW, 0)} height={barH} rx={3} fill={NAVY} />

            {/* Value label — only render if barW is a safe position */}
            <Text
              x={clamp(barX + barW + 5, barX, SVG_W - 10)}
              y={textY}
              style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', fill: GRAY }}
            >
              {`${val}%`}
            </Text>
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

// ─── LINE CHART SVG ───────────────────────────────────────────────────────────
const LineChartSVG: React.FC<{ data: Array<{ month: string; joiners: number; leavers: number }> }> = ({ data }) => {
  const SVG_W  = 490;
  const SVG_H  = 130;
  const PAD_X  = 30;
  const PAD_Y  = 14;
  const PLOT_W = SVG_W - PAD_X * 2;
  const PLOT_H = SVG_H - PAD_Y * 2 - 20;

  // Placeholder when data is empty
  if (!data || data.length === 0) {
    return (
      <Svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
        <Rect x={0} y={0} width={SVG_W} height={SVG_H} fill={WHITE} />
      </Svg>
    );
  }

  // Sanitise all values upfront so no NaN can enter the axis math
  const cleanData = data.map(d => ({
    month:   String(d.month   ?? ''),
    joiners: clamp(safeNum(d.joiners, 0), 0, 10000),
    leavers: clamp(safeNum(d.leavers, 0), 0, 10000),
  }));

  const allVals = cleanData.flatMap(d => [d.joiners, d.leavers]);
  const rawMax  = Math.max(...allVals);
  const maxVal  = Number.isFinite(rawMax) && rawMax > 0 ? rawMax + 2 : 20;
  const minVal  = 0;
  const range   = maxVal - minVal;

  // xPos: divide by (n-1) but guard n===1 (single point — place it in the centre)
  const xPos = (i: number): number => {
    if (cleanData.length === 1) return safeNum(PAD_X + PLOT_W / 2, PAD_X);
    return safeNum(PAD_X + safeDiv(i, cleanData.length - 1) * PLOT_W, PAD_X);
  };

  const yPos = (v: number): number =>
    safeNum(PAD_Y + PLOT_H - safeDiv(clamp(v, minVal, maxVal) - minVal, range) * PLOT_H, PAD_Y + PLOT_H);

  const baselineY = safeNum(PAD_Y + PLOT_H, SVG_H - 20);

  return (
    <Svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
      {/* Baseline */}
      <Line
        x1={PAD_X} y1={baselineY}
        x2={SVG_W - PAD_X} y2={baselineY}
        stroke={LGRAY} strokeWidth={1}
      />

      {/* Leavers dashed segments */}
      {cleanData.slice(0, -1).map((_, i) => (
        <Line
          key={`leavers-${i}`}
          x1={xPos(i)}     y1={yPos(cleanData[i].leavers)}
          x2={xPos(i + 1)} y2={yPos(cleanData[i + 1].leavers)}
          stroke={LGRAY} strokeWidth={1.5} strokeDasharray="3,3"
        />
      ))}

      {/* Joiners solid segments */}
      {cleanData.slice(0, -1).map((_, i) => (
        <Line
          key={`joiners-${i}`}
          x1={xPos(i)}     y1={yPos(cleanData[i].joiners)}
          x2={xPos(i + 1)} y2={yPos(cleanData[i + 1].joiners)}
          stroke={NAVY} strokeWidth={2}
        />
      ))}

      {/* Joiners dots */}
      {cleanData.map((d, i) => {
        const cx = xPos(i);
        const cy = yPos(d.joiners);
        return (
          <Rect
            key={`dot-${i}`}
            x={clamp(cx - 3.5, 0, SVG_W)}
            y={clamp(cy - 3.5, 0, SVG_H)}
            width={7} height={7} rx={3.5}
            fill={PURPLE}
          />
        );
      })}

      {/* Month labels */}
      {cleanData.map((d, i) => (
        <Text
          key={`month-${i}`}
          x={xPos(i)}
          y={SVG_H - 3}
          style={{ fontSize: 7, fontFamily: 'Helvetica', fill: GRAY, textAnchor: 'middle' }}
        >
          {d.month}
        </Text>
      ))}
    </Svg>
  );
};

// ─── MAIN PDF DOCUMENT ────────────────────────────────────────────────────────
export const AttendanceReportPDF: React.FC<AttendanceReportPDFProps> = ({
  heroImageUrl,
  metrics,
  departmentData,
  headcountData,
}) => {
  // Sanitise hero URL — fall back to a known working Unsplash image
  const heroSrc = (typeof heroImageUrl === 'string' && heroImageUrl.trim().length > 0)
    ? heroImageUrl
    : 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80';

  // KPI values — coerce to string, never undefined
  const compliance  = String(metrics?.compliance  ?? '97.2%');
  const utilization = String(metrics?.utilization ?? '4.4%');
  const joinersVal  = String(metrics?.joiners     ?? '42');

  // Sanitise department data — coerce value to safe number
  const deptData: Array<{ name: string; value: number }> =
    Array.isArray(departmentData) && departmentData.length > 0
      ? departmentData.map(d => ({
          name:  String(d.name  ?? 'Dept'),
          value: clamp(safeNum(d.value, 0), 0, 100),
        }))
      : DEPT_DATA;

  // Sanitise headcount data — coerce joiners/leavers to safe numbers
  const hcData: Array<{ month: string; joiners: number; leavers: number }> =
    Array.isArray(headcountData) && headcountData.length > 0
      ? headcountData.map(d => ({
          month:   String(d.month   ?? ''),
          joiners: clamp(safeNum(d.joiners, 0), 0, 10000),
          leavers: clamp(safeNum(d.leavers, 0), 0, 10000),
        }))
      : HEADCOUNT_DATA;

  return (
    <Document title="Attendance & Leave Intelligence" author="Corporate Intelligence">
      <Page size="A4" style={styles.page}>

        {/* ── HERO IMAGE ─────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Image src={heroSrc} style={styles.heroImg} />
          <View style={styles.heroOverlay} />
        </View>

        {/* ── KPI RIBBON — overlapping bottom of hero ─────────────────────── */}
        <View style={styles.kpiRibbon}>
          {[
            { label: 'Attendance Compliance', value: compliance  },
            { label: 'Leave Utilization',     value: utilization },
            { label: 'Total New Joiners',     value: joinersVal  },
          ].map(({ label, value }) => (
            <View key={label} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{label}</Text>
              <Text style={styles.kpiValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Section 1 — Bar Chart */}
          <View style={styles.sectionHeader}>
            <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
            <Text style={styles.sectionTitle}>Department-Wise Attendance %</Text>
          </View>
          <View style={styles.chartArea}>
            <BarChartSVG data={deptData} />
          </View>

          {/* Section 2 — Line Chart */}
          <View style={styles.sectionHeader}>
            <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
            <Text style={styles.sectionTitle}>Headcount Movement Trend</Text>
          </View>
          <View style={styles.chartArea}>
            <LineChartSVG data={hcData} />
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={styles.legendDot} />
              <Text style={styles.legendLabel}>New Joiners</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDash} />
              <Text style={styles.legendLabel}>Leavers</Text>
            </View>
          </View>

        </View>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Corporate Intelligence Report // Confidential</Text>
          <Text style={styles.footerText}>June 2026</Text>
        </View>

      </Page>
    </Document>
  );
};
