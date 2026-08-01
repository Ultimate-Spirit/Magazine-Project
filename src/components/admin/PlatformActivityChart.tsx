import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function PlatformActivityChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

      const [folders30dRes, logs30dRes] = await Promise.all([
        supabase.from('folders').select('created_at').gte('created_at', thirtyDaysAgoIso),
        supabase.from('activity_logs').select('action, created_at').gte('created_at', thirtyDaysAgoIso).eq('action', 'PDF_EXPORT')
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

  return (
    <div className="lg:col-span-2 bg-card/50 border border-border/40 rounded-xl pt-4 px-4 flex flex-col h-full overflow-hidden pb-0">
      <div className="flex flex-col mb-4">
        <h2 className="text-sm font-semibold text-foreground">30-Day Platform Activity</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Magazines Drafted vs. Downloaded</p>
      </div>
      <div className="flex-1 w-full mt-4 -ml-2 min-h-[300px]">
        {loading ? (
          <div className="w-full h-full bg-secondary/20 animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Loading chart...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full bg-secondary/10 border border-red-500/20 rounded-lg flex items-center justify-center">
            <span className="text-red-500 text-xs font-mono">Failed to load chart data</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickMargin={10} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickMargin={10} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" dataKey="magazinesCreated" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorDrafted)" name="Drafted" />
              <Area type="monotone" dataKey="magazinesDownloaded" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDownloaded)" name="Downloaded" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
