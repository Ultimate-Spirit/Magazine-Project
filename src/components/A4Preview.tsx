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
    <iframe 
      ref={iframeRef} 
      className="w-full h-full border-none outline-none bg-white block" 
      title="A4 Live Preview" 
    />
  );
};
