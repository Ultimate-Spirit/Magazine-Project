import React from 'react';

interface ExecutiveSummaryProps {
  data: {
    title: string;
    summaryText: string;
  };
}

export const ExecutiveSummaryTemplate: React.FC<ExecutiveSummaryProps> = ({ data }) => {
  return (
    <div className="w-full h-full bg-white p-24">
      <h1 className="text-4xl font-black text-slate-900 mb-8 border-b-4 border-blue-600 pb-4 inline-block">{data.title}</h1>
      <div className="prose prose-lg max-w-none text-slate-700 whitespace-pre-wrap">
        {data.summaryText}
      </div>
    </div>
  );
};
