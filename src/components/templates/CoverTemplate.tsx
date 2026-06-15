import React from 'react';

interface CoverTemplateProps {
  data: {
    title: string;
    subtitle: string;
    author: string;
    date: string;
  };
}

export const CoverTemplate: React.FC<CoverTemplateProps> = ({ data }) => {
  return (
    <div className="w-full h-full bg-slate-900 text-white flex flex-col justify-center items-center p-24 text-center">
      <div className="flex-1 flex flex-col justify-center items-center">
        <h1 className="text-6xl font-black mb-6 leading-tight tracking-tighter">{data.title}</h1>
        <h2 className="text-3xl font-light text-slate-300 mb-12">{data.subtitle}</h2>
        <div className="w-24 h-1 bg-blue-500 mb-12"></div>
        <p className="text-xl font-medium">{data.author}</p>
        <p className="text-lg text-slate-400 mt-2">{data.date}</p>
      </div>
    </div>
  );
};
