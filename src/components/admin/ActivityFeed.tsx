import React from 'react';
import { supabase } from '../../lib/supabaseClient';

export default async function ActivityFeed() {
  const { data: activities, error } = await supabase
    .from('activity_logs')
    .select('id, action_type, entity_type, entity_name, created_at, profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return (
      <div className="lg:col-span-1 bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col min-h-[300px] overflow-hidden">
        <h2 className="text-sm font-semibold text-foreground mb-4 shrink-0">Activity Feed</h2>
        <div className="py-10 text-center">
          <span className="text-red-500 text-xs font-mono">{error.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-1 bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col min-h-[300px] overflow-hidden">
      <h2 className="text-sm font-semibold text-foreground mb-4 shrink-0">Activity Feed</h2>
      <div className="flex-1 overflow-y-auto invisible-scrollbar">
        <div className="space-y-3">
          {!activities || activities.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground/50 text-xs">No recent activity.</div>
          ) : (
            activities.map((log: any) => (
              <div key={log.id} className="flex flex-col gap-0.5 border-b border-border/20 last:border-0 pb-2 last:pb-0">
                <div className="flex justify-between items-center gap-2">
                  <p className="text-[11px] text-foreground font-medium truncate">
                    {log.profiles?.full_name || log.profiles?.email?.split('@')[0] || 'System'}
                  </p>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  <span className="lowercase">{log.action_type}</span> {log.entity_type} <span className="font-medium text-foreground/80">{log.entity_name}</span>
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
