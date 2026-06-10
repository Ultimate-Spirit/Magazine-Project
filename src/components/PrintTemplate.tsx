import React from 'react';

interface Metric {
  label: string;
  value: string;
  percentage: number;
}

interface PrintTemplateProps {
  data: {
    headline: string;
    subheadline: string;
    summaryText: string;
    growthDriversText: string;
    outlookText: string;
    footerConfidentiality: string;
    footerDate: string;
    metrics: Metric[];
  };
}

export const PrintTemplate = React.forwardRef<HTMLDivElement, PrintTemplateProps>(({ data }, ref) => {
  return (
    <div 
      ref={ref}
      className="bg-background text-foreground"
      style={{ 
        width: '210mm', 
        minHeight: '297mm', 
        padding: '20mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Header Section */}
      <div className="border-b-4 border-foreground pb-12 mb-12">
        <h1 className="text-5xl font-black text-foreground leading-[1.2]">
          {data.headline || 'Untitled Report'}
        </h1>
        <p className="text-xl font-bold text-primary mt-4 uppercase tracking-widest leading-[1.2]">
          {data.subheadline || 'EXECUTIVE SUMMARY'}
        </p>
      </div>

      {/* Primary Content Grid */}
      <div className="grid grid-cols-2 gap-20 mb-12">
        <div className="space-y-6">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Executive Summary</h3>
          <div className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
            {data.summaryText}
          </div>
        </div>

        <div className="space-y-8">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Key Performance</h3>
          <div className="space-y-6">
            {data.metrics.map((metric, idx) => (
              <div key={idx} className="bg-secondary p-6 rounded-2xl border border-border">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">
                  {metric.label}
                </p>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-foreground">{metric.value}</span>
                  <span className={`text-sm font-bold ${metric.percentage >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                    {metric.percentage >= 0 ? '+' : ''}{metric.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strategic Content Grid */}
      <div className="grid grid-cols-2 gap-20 mb-auto">
        <div className="space-y-6">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Strategic Drivers</h3>
          <div className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
            {data.growthDriversText}
          </div>
        </div>
        <div className="space-y-6">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Future Outlook</h3>
          <div className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
            {data.outlookText}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="mt-20 pt-8 border-t border-border flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        <span>{data.footerConfidentiality}</span>
        <span>{data.footerDate}</span>
      </footer>
    </div>
  );
});

PrintTemplate.displayName = 'PrintTemplate';
