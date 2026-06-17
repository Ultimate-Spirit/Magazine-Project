import React, { useState, useEffect, useRef } from 'react';

interface A4PreviewProps {
  htmlContent: string;
}

export const A4Preview: React.FC<A4PreviewProps> = ({ htmlContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setScale(width / 794);
      }
    });
    
    observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, []);

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
    <div 
      ref={containerRef} 
      className="w-full relative overflow-hidden border border-gray-300 shadow-md bg-gray-200 rounded-md" 
      style={{ height: `${1123 * scale}px` }}
    >
      <iframe 
        style={{ 
          width: '794px', 
          height: '1123px', 
          transform: `scale(${scale})`, 
          transformOrigin: 'top left', 
          border: 'none', 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          backgroundColor: 'white' 
        }} 
        srcDoc={srcDoc}
        title="A4 Live Preview"
      />
    </div>
  );
};
