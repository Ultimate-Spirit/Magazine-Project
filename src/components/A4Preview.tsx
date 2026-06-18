import React from 'react';

interface A4PreviewProps {
  htmlContent: string;
}

export const A4Preview: React.FC<A4PreviewProps> = ({ htmlContent }) => {
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; display: block; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

  return (
    <div className="relative shadow-[0_30px_80px_-20px_rgba(0,0,0,0.3)] ring-1 ring-gray-900/10 bg-white overflow-hidden flex-shrink-0 flex flex-col" style={{ width: '794px', height: '1123px' }}>
      <iframe style={{ display: 'block', width: '100%', height: '100%', border: 'none', margin: 0, padding: 0 }} srcDoc={srcDoc} title="A4 Live Preview" />
    </div>
  );
};
