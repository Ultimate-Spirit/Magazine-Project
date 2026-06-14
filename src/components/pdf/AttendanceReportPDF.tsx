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
  Font,
} from '@react-pdf/renderer';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const NAVY   = '#1e3a8a';
const PURPLE = '#a78bfa';
const GRAY   = '#9ca3af';
const LGRAY  = '#e5e7eb';
const WHITE  = '#ffffff';
const DARK   = '#374151';

// ─── STYLESHEET ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    backgroundColor: WHITE,
    fontFamily: 'Helvetica',
    position: 'relative',
  },

  // ── HERO ──────────────────────────────────────────────────────────────────
  hero: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  heroImg: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30,58,138,0.35)',
  },

  // ── KPI RIBBON ────────────────────────────────────────────────────────────
  kpiRibbon: {
    position: 'absolute',
    top: 162,          // hero 200 - overlap 38
    left: 36,
    right: 36,
    flexDirection: 'row',
    gap: 14,
    zIndex: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LGRAY,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    // shadow approximated via border
  },
  kpiLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textAlign: 'center',
  },

  // ── CONTENT BODY ──────────────────────────────────────────────────────────
  body: {
    marginTop: 80,          // kpi ribbon height (38 overlap + 42 card body)
    paddingHorizontal: 36,
    paddingBottom: 36,
    flexDirection: 'column',
    gap: 0,
  },

  // ── SECTION HEADER ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 20,
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: WHITE,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    lineHeight: 1,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },

  // ── CHART CONTAINERS ──────────────────────────────────────────────────────
  chartArea: {
    width: '100%',
  },

  // ── LEGEND ────────────────────────────────────────────────────────────────
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NAVY,
  },
  legendDash: {
    width: 18,
    height: 2,
    backgroundColor: LGRAY,
  },
  legendLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── FOOTER ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.3,
  },
});

// ─── HARDCODED DATA ───────────────────────────────────────────────────────────
const DEPT_DATA = [
  { name: 'Production',   value: 97 },
  { name: 'Operations',   value: 94 },
  { name: 'Quality',      value: 91 },
  { name: 'Maintenance',  value: 88 },
  { name: 'Logistics',    value: 85 },
];

const HEADCOUNT_DATA = [
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
    compliance: string;
    utilization: string;
    joiners: string;
  };
  departmentData?: Array<{ name: string; value: number }>;
  headcountData?: Array<{ month: string; joiners: number; leavers: number }>;
}

// ─── NATIVE HORIZONTAL BAR CHART (SVG primitives only) ───────────────────────
const BarChartSVG: React.FC<{ data: Array<{ name: string; value: number }> }> = ({ data }) => {
  const svgWidth  = 522;
  const svgHeight = 160;
  const labelW    = 90;
  const barMaxW   = svgWidth - labelW - 60; // space for value label
  const rowH      = svgHeight / data.length;
  const barH      = rowH * 0.45;
  const maxVal    = 100;

  return (
    <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
      {data.map((d, i) => {
        const barW  = (d.value / maxVal) * barMaxW;
        const y     = i * rowH + (rowH - barH) / 2;
        const barX  = labelW;

        return (
          <React.Fragment key={d.name}>
            {/* Department label */}
            <Text
              x={0}
              y={y + barH / 2 + 3.5}
              style={{
                fontSize: 8,
                fontFamily: 'Helvetica',
                fill: DARK,
              }}
            >
              {d.name}
            </Text>

            {/* Bar track (background) */}
            <Rect
              x={barX}
              y={y}
              width={barMaxW}
              height={barH}
              rx={3}
              fill={LGRAY}
            />

            {/* Filled bar */}
            <Rect
              x={barX}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill={NAVY}
            />

            {/* Value label */}
            <Text
              x={barX + barW + 6}
              y={y + barH / 2 + 3.5}
              style={{
                fontSize: 7.5,
                fontFamily: 'Helvetica-Bold',
                fill: GRAY,
              }}
            >
              {`${d.value}%`}
            </Text>
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

// ─── NATIVE LINE CHART (SVG primitives only) ─────────────────────────────────
const LineChartSVG: React.FC<{ data: Array<{ month: string; joiners: number; leavers: number }> }> = ({ data }) => {
  const svgW  = 522;
  const svgH  = 130;
  const padX  = 28;
  const padY  = 12;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2 - 18; // bottom for month labels

  const allVals = data.flatMap(d => [d.joiners, d.leavers]);
  const maxVal  = Math.max(...allVals) + 2;
  const minVal  = 0;

  const xPos = (i: number) => padX + (i / (data.length - 1)) * plotW;
  const yPos = (v: number) => padY + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

  const toPolyline = (key: 'joiners' | 'leavers') =>
    data.map((d, i) => `${xPos(i)},${yPos(d[key])}`).join(' ');

  return (
    <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      {/* Baseline */}
      <Line
        x1={padX} y1={padY + plotH}
        x2={svgW - padX} y2={padY + plotH}
        stroke={LGRAY}
        strokeWidth={1}
      />

      {/* Leavers line (dashed — approximated with short segments) */}
      {data.slice(0, -1).map((_, i) => (
        <Line
          key={`leavers-seg-${i}`}
          x1={xPos(i)}       y1={yPos(data[i].leavers)}
          x2={xPos(i + 1)}   y2={yPos(data[i + 1].leavers)}
          stroke={LGRAY}
          strokeWidth={1.5}
          strokeDasharray="3,3"
        />
      ))}

      {/* Joiners line (solid) */}
      {data.slice(0, -1).map((_, i) => (
        <Line
          key={`joiners-seg-${i}`}
          x1={xPos(i)}     y1={yPos(data[i].joiners)}
          x2={xPos(i + 1)} y2={yPos(data[i + 1].joiners)}
          stroke={NAVY}
          strokeWidth={2}
        />
      ))}

      {/* Joiners dots */}
      {data.map((d, i) => (
        <Rect
          key={`dot-${i}`}
          x={xPos(i) - 3.5}
          y={yPos(d.joiners) - 3.5}
          width={7}
          height={7}
          rx={3.5}
          fill={PURPLE}
        />
      ))}

      {/* Month labels */}
      {data.map((d, i) => (
        <Text
          key={`month-${i}`}
          x={xPos(i)}
          y={svgH - 2}
          style={{
            fontSize: 7,
            fontFamily: 'Helvetica',
            fill: GRAY,
            textAnchor: 'middle',
          }}
        >
          {d.month}
        </Text>
      ))}
    </Svg>
  );
};

// ─── MAIN PDF DOCUMENT ────────────────────────────────────────────────────────
export const AttendanceReportPDF: React.FC<AttendanceReportPDFProps> = ({
  heroImageUrl = 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80',
  metrics,
  departmentData = DEPT_DATA,
  headcountData  = HEADCOUNT_DATA,
}) => {
  const compliance  = metrics?.compliance  ?? '97.2%';
  const utilization = metrics?.utilization ?? '4.4%';
  const joiners     = metrics?.joiners     ?? '42';

  return (
    <Document title="Attendance & Leave Intelligence" author="Corporate Intelligence">
      <Page size="A4" style={styles.page}>

        {/* ── HERO IMAGE ─────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Image src={heroImageUrl} style={styles.heroImg} />
          <View style={styles.heroOverlay} />
        </View>

        {/* ── KPI RIBBON — overlapping bottom of hero ────────────────────── */}
        <View style={styles.kpiRibbon}>
          {[
            { label: 'Attendance Compliance', value: compliance },
            { label: 'Leave Utilization',     value: utilization },
            { label: 'Total New Joiners',     value: joiners },
          ].map(({ label, value }) => (
            <View key={label} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{label}</Text>
              <Text style={styles.kpiValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Section 1 */}
          <View style={styles.sectionHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Department-Wise Attendance %</Text>
          </View>

          <View style={styles.chartArea}>
            <BarChartSVG data={departmentData.length ? departmentData : DEPT_DATA} />
          </View>

          {/* Section 2 */}
          <View style={styles.sectionHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Headcount Movement Trend</Text>
          </View>

          <View style={styles.chartArea}>
            <LineChartSVG data={headcountData.length ? headcountData : HEADCOUNT_DATA} />
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
