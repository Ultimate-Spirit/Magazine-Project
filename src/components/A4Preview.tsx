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
    body { margin: 0; padding: 0; overflow: hidden; width: 794px; height: 1123px; background-color: white; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

  return (
    <div style={{ width: '794px', height: '1123px' }} className="relative bg-white overflow-hidden flex-shrink-0">
      <iframe style={{ width: '100%', height: '100%', border: 'none' }} srcDoc={srcDoc} title="A4 Live Preview" />
    </div>
  );
};
