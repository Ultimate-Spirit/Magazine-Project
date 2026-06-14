import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full micro-surface p-8 lg:p-12 rounded-[2.5rem] border border-destructive/20 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-destructive/10 rounded-[2rem] flex items-center justify-center mx-auto border border-destructive/20 text-destructive shadow-2xl shadow-destructive/20">
              <AlertCircle className="w-10 h-10" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-black tracking-tight text-foreground">Fatal Runtime Error</h2>
              <p className="text-muted-foreground font-medium">A critical exception occurred in the rendering engine.</p>
            </div>

            <div className="p-4 bg-secondary/50 rounded-2xl border border-border/10 text-left overflow-hidden">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Trace Message</p>
              <p className="text-xs font-mono text-destructive break-all line-clamp-4">
                {this.state.error?.message || 'Unknown structural failure'}
              </p>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full py-5 bg-primary text-primary-foreground font-black rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest shadow-xl shadow-primary/20"
            >
              <RefreshCcw className="w-5 h-5" />
              Reset Application
            </button>
          </div>
        </div>
      );
    }

    return this.children;
  }
}
