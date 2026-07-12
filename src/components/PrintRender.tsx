import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import * as LucideIcons from 'lucide-react';

const getChartOptions = (chartType: string, chartDataStr?: string) => {
  let labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let series = [120, 200, 150, 80, 70, 110, 130];
  try {
    if (chartDataStr) {
      const parsed = JSON.parse(chartDataStr);
      if (parsed.labels) labels = parsed.labels;
      if (parsed.series) series = parsed.series;
    }
  } catch (e) {}

  const grid = { top: 10, bottom: 20, left: 10, right: 10, containLabel: true };

  const baseOptions = {
    tooltip: { trigger: 'axis' },
    grid,
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [{ data: series, type: 'bar' }]
  };

  switch (chartType) {
    case 'pie':
      return {
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: '75%', center: ['50%', '50%'], data: labels.map((l, i) => ({ name: l, value: series[i] || 0 })) }]
      };
    case 'line':
      return { ...baseOptions, series: [{ data: series, type: 'line', smooth: true }] };
    case 'bar':
    default:
      return baseOptions;
  }
};

const urlToBase64 = async (url: string): Promise<string> => {
  if (!url || url.startsWith('data:')) return url;
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Failed to convert image to base64:', url, err);
    return url;
  }
};

export function PrintRender() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // We intercept this fetch call in the Puppeteer API to inject the data securely
        const response = await fetch('/print-data.json');
        if (response.ok) {
          const pagesData = await response.json();
          
          // Pre-process background images to base64 to ensure Puppeteer captures them
          const processed = JSON.parse(JSON.stringify(pagesData));
          for (const page of processed) {
            const layoutJson = page.templates?.layout_json;
            if (layoutJson?.background_url) {
              layoutJson.background_url = await urlToBase64(layoutJson.background_url);
            }
            if (layoutJson?.fields) {
              for (const field of layoutJson.fields) {
                if (field.type === 'Image') {
                  const val = page.data?.[field.id];
                  if (val && typeof val === 'string' && !val.startsWith('data:')) {
                    page.data[field.id] = await urlToBase64(val);
                  }
                }
              }
            }
          }
          setPages(processed);
        } else {
          console.error('Failed to fetch print data');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div>Loading print render...</div>;

  return (
    <div className="bg-white text-black font-sans min-h-screen">
      <div id="pdf-staging-root">
        {pages.map((page, idx) => {
          const layoutJson = page.templates?.layout_json || { fields: [] };
          const formData = page.data || {};
          return (
            <div 
              key={idx} 
              className="a4-staging-page"
              style={{ 
                width: '794px', 
                height: '1123px', 
                position: 'relative', 
                overflow: 'hidden', 
                backgroundColor: 'white',
                marginBottom: '20px'
              }}
            >
              {layoutJson?.background_url && (
                <img 
                  src={layoutJson.background_url} 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} 
                  alt="bg" 
                />
              )}
              <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                {(layoutJson.fields || []).map((field: any) => {
                  const val = formData[field.id] || '';
                  const metadata = field.metadata || {};
                  return (
                    <div 
                      key={field.id}
                      style={{
                        position: 'absolute',
                        top: `${field.top}%`,
                        left: `${field.left}%`,
                        width: `${field.width}%`,
                        height: `${field.height}%`,
                        borderRadius: metadata.borderRadius ? `${metadata.borderRadius}px` : undefined,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: metadata.textAlign === 'left' ? 'flex-start' : metadata.textAlign === 'right' ? 'flex-end' : 'center',
                        justifyContent: metadata.textAlign === 'left' ? 'flex-start' : metadata.textAlign === 'right' ? 'flex-end' : 'center',
                        color: metadata.fontColor || 'inherit',
                        fontFamily: metadata.fontFamily || 'inherit',
                        fontSize: metadata.fontSize ? `${metadata.fontSize}px` : '16px',
                        lineHeight: metadata.lineHeight || '1.5',
                        fontWeight: metadata.fontWeight || 'normal',
                        fontStyle: metadata.fontStyle || 'normal',
                        textDecoration: metadata.textDecoration || 'none',
                        textAlign: metadata.textAlign || 'center',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {field.type === 'Image' ? (
                        val ? <img src={val} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="img" /> : <div style={{ width: '100%', height: '100%' }} />
                      ) : field.type === 'Chart' ? (
                        <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                          <ReactECharts 
                            option={getChartOptions(metadata.chartType || 'bar', val)} 
                            style={{ height: '100%', width: '100%' }}
                            opts={{ renderer: 'svg' }}
                          />
                        </div>
                      ) : field.type === 'Icon' ? (
                        (() => {
                          const IconCmp = (LucideIcons as any)[val || 'Smile'] || LucideIcons.Smile;
                          return <IconCmp style={{ width: '100%', height: '100%' }} />;
                        })()
                      ) : (
                        <span style={{ width: '100%' }}>{val}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
