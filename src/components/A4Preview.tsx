import React, { useRef, useEffect } from 'react';

interface A4PreviewProps {
  htmlContent: string;
}

export const A4Preview: React.FC<A4PreviewProps> = ({ htmlContent }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; display: block; }
    html, body { background-color: #ffffff !important; background: none !important; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
      doc.open();
      doc.write(fullHtml);
      doc.close();
    }
  }, [htmlContent]);

  return (
    <div style={{ transform: 'scale(calc(min(1, (100vh - 64px) / 1123)))', transformOrigin: 'top center' }} className="flex-shrink-0">
      <iframe 
        ref={iframeRef} 
        style={{ width: '794px', height: '1123px', border: 'none', background: 'transparent' }}
        className="block" 
        title="A4 Live Preview" 
      />
    </div>
  );
};
