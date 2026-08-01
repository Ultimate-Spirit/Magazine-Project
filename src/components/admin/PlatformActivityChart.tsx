import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function PlatformActivityChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30D');

  useEffect(() => {
    async function fetchData() {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

      const [folders30dRes, logs30dRes] = await Promise.all([
        supabase.from('folders').select('created_at').gte('created_at', thirtyDaysAgoIso),
        supabase.from('activity_logs').select('action_type, created_at').gte('created_at', thirtyDaysAgoIso).eq('action_type', 'PDF_EXPORT')
      ]);

      let cData: any[] = [];
      try {
        const dateMap = new Map();

        for (let i = 29; i >= 0; i--) {
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

        if (!folders30dRes.error && folders30dRes.data) {
          folders30dRes.data.forEach((p: any) => {
            const ymd = p.created_at.split('T')[0];
            if (dateMap.has(ymd)) {
              dateMap.get(ymd).magazinesCreated += 1;
            }
          });
        }

        if (!logs30dRes.error && logs30dRes.data) {
          logs30dRes.data.forEach((l: any) => {
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

  const displayData = timeRange === '7D' ? chartData.slice(-7) : chartData;

  return (
    <div className="lg:col-span-2 bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4 z-10">
        <h2 className="text-sm font-semibold text-foreground">Magazine Production</h2>
        
        {/* Sleek Pill-shaped Toggle Group */}
        <div className="flex items-center bg-black/10 dark:bg-black/40 rounded-full p-1 border border-border/30">
          {['7D', '30D'].map((range) => (
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
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDownloaded" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
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
              <Area type="monotone" dataKey="magazinesCreated" fill="url(#colorDrafted)" name="Drafted" stroke="#3b82f6" strokeWidth={2} />
              <Area type="monotone" dataKey="magazinesDownloaded" fill="url(#colorDownloaded)" name="Downloaded" stroke="#10b981" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
