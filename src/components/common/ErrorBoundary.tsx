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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-black p-6 overflow-auto">
          <div className="max-w-2xl w-full bg-red-50 dark:bg-red-950/20 p-8 lg:p-12 rounded-[2.5rem] border border-red-200 dark:border-red-900/50 text-left space-y-8 animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-red-900 dark:text-red-100 uppercase">System Integrity Failure</h2>
                <p className="text-red-700 dark:text-red-400 font-medium text-sm mt-1">The rendering engine encountered a fatal exception.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-6 bg-white dark:bg-black/40 rounded-2xl border border-red-100 dark:border-red-900/30 overflow-auto max-h-[300px] shadow-inner">
                <p className="text-[10px] font-black text-red-400 dark:text-red-500 uppercase tracking-widest mb-3">Diagnostic Trace</p>
                <pre className="text-xs font-mono text-red-600 dark:text-red-300 whitespace-pre-wrap break-all leading-relaxed">
                  {this.state.error?.stack || this.state.error?.message || 'Unknown structural failure'}
                </pre>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="flex-1 py-4 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest shadow-lg shadow-red-600/20"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Reload Application
                </button>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="flex-1 py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-black font-black rounded-xl hover:opacity-90 transition-all text-xs uppercase tracking-widest"
                >
                  Return to Safety
                </button>
              </div>
            </div>

            <p className="text-center text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">
              Spirit OS // Stability Layer Active
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
