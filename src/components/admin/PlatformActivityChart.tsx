import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function PlatformActivityChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30D');

  useEffect(() => {
    async function fetchData() {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const startOfYearIso = startOfYear.toISOString();

      const [foldersRes, logsRes] = await Promise.all([
        supabase.from('folders').select('created_at').gte('created_at', startOfYearIso),
        supabase.from('activity_logs').select('created_at, action_type').gte('created_at', startOfYearIso).eq('action_type', 'PDF_EXPORT')
      ]);

      let cData: any[] = [];
      try {
        const dateMap = new Map();
        
        // Calculate days between start of year and now
        const diffTime = Math.abs(now.getTime() - startOfYear.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        for (let i = diffDays; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const ymd = d.toISOString().split('T')[0];
          
          const dayObj = {
            date: dateStr,
            magazinesCreated: 0,
            magazinesDownloaded: 0
          };
          cData.push(dayObj);
          dateMap.set(ymd, dayObj);
        }

        if (!foldersRes.error && foldersRes.data) {
          foldersRes.data.forEach((p: any) => {
            const ymd = p.created_at.split('T')[0];
            if (dateMap.has(ymd)) {
              dateMap.get(ymd).magazinesCreated += 1;
            }
          });
        }

        if (!logsRes.error && logsRes.data) {
          logsRes.data.forEach((l: any) => {
            const ymd = l.created_at.split('T')[0];
            if (dateMap.has(ymd)) {
              dateMap.get(ymd).magazinesDownloaded += 1;
            }
          });
        }
      } catch (err) {
        console.error('Error generating chartData:', err);
      }
      
      setChartData(cData);
      setLoading(false);
    }
    fetchData();
  }, []);

  const displayData = timeRange === '7D' ? chartData.slice(-7) : timeRange === '30D' ? chartData.slice(-30) : chartData;

  return (
    <div className="lg:col-span-2 bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4 z-10">
        <h2 className="text-sm font-semibold text-foreground">Magazine Production</h2>
        
        {/* Sleek Pill-shaped Toggle Group */}
        <div className="flex items-center bg-black/10 dark:bg-black/40 rounded-full p-1 border border-border/30">
          {['7D', '30D', 'YTD'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 w-full h-full relative -ml-4 mt-2">
        {loading ? (
          <div className="w-full h-full bg-secondary/20 animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Loading chart...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDrafted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDownloaded" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, dataMax => (dataMax === 0 ? 1 : dataMax)]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  borderRadius: '8px', 
                  border: '1px solid hsl(var(--border))', 
                  padding: '12px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)' 
                }} 
              />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" dataKey="magazinesCreated" name="Drafted" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorDrafted)" />
              <Area type="monotone" dataKey="magazinesDownloaded" name="Downloaded" stroke="hsl(var(--muted-foreground))" strokeWidth={2} fillOpacity={1} fill="url(#colorDownloaded)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
