import React from 'react';
import { Calendar } from 'lucide-react';
import TopKPIs from './TopKPIs';
import PlatformActivityChart from './PlatformActivityChart';
import ActivityFeed from './ActivityFeed';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-background font-sans invisible-scrollbar">
      <header className="h-14 px-3 lg:px-6 flex items-center justify-between sticky top-0 z-[10] bg-background/80 backdrop-blur-xl faint-divider shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight leading-none">Overview Portal</h1>
          <div className="flex items-center gap-2 mt-1 lg:mt-2">
            <Calendar className="w-3 h-3 text-muted-foreground/40" />
            <p className="text-[9px] lg:text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="p-2 lg:p-3 micro-surface rounded-xl lg:rounded-2xl border border-border/10">
          <p className="text-[8px] lg:text-[9px] font-black text-primary uppercase tracking-[0.3em]">System Health: Optimal</p>
        </div>
      </header>

      <main className="flex flex-col gap-4 p-4 lg:p-6 w-full max-w-full">
        {/* Row 1: Executive Overview */}
        <TopKPIs />

        {/* Row 2: Central Analytics & Granular Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          <PlatformActivityChart />
          <ActivityFeed />
        </div>

        <footer className="mt-8 pt-6 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-[11px] font-medium text-muted-foreground/80">
            <span className="hover:text-foreground transition-colors cursor-pointer">API Documentation</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Support</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Changelog</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">
            SPIRIT OS BUILD v1.2.4
          </div>
        </footer>
      </main>
    </div>
  );
};
