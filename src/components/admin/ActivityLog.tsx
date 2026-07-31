import React, { useState, useEffect } from 'react';
import { Search, Filter, Activity, Clock, User, Info, Loader2 } from 'lucide-react';

interface LogEntry {
  id: string;
  user_id: string;
  // New Schema
  user_name?: string;
  user_email?: string;
  action?: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT';
  // Legacy Schema
  action_type?: string;
  entity_type?: string;
  entity_name?: string;
  
  details: string;
  created_at: string;
}

export const ActivityLog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{title: string, desc: string, type: 'error'|'success'} | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) {
        throw new Error('Failed to fetch activity logs from server.');
      }
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message);
      showToast('Fetch Error', err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const showToast = (title: string, desc: string, type: 'error'|'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleGenerateTestLog = async () => {
    try {
      const res = await fetch('/api/test-log', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create test log');
      showToast('Success', 'Test log generated successfully!', 'success');
      await fetchLogs(); // Immediately trigger a re-fetch and wait for it
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const getSafeUserName = (log: LogEntry) => log.user_name || log.user_id || 'System User';
  const getSafeUserEmail = (log: LogEntry) => log.user_email || 'Unknown Email';
  const getSafeAction = (log: LogEntry) => {
    const act = (log.action || log.action_type || 'UNKNOWN').toUpperCase();
    return act;
  };
  const getSafeDetails = (log: LogEntry) => {
    let text = log.details || '';
    if (log.entity_type && log.entity_name) {
      text = `${log.entity_type}: ${log.entity_name} ${text ? `(${text})` : ''}`;
    }
    return text || 'No details provided';
  };

  const filteredLogs = logs.filter((log) => {
    const userName = getSafeUserName(log).toLowerCase();
    const userEmail = getSafeUserEmail(log).toLowerCase();
    const matchesSearch =
      userName.includes(searchTerm.toLowerCase()) ||
      userEmail.includes(searchTerm.toLowerCase());
      
    const action = getSafeAction(log);
    const matchesAction = actionFilter === 'All' || action === actionFilter || (actionFilter === 'CREATE' && action === 'CREATED') || (actionFilter === 'UPDATE' && action === 'UPDATED') || (actionFilter === 'DELETE' && action === 'DELETED');
    
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
      case 'CREATED':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">CREATE</span>;
      case 'DELETE':
      case 'DELETED':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">DELETE</span>;
      case 'EXPORT':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">EXPORT</span>;
      case 'UPDATE':
      case 'UPDATED':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">UPDATE</span>;
      default:
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400">{action}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col gap-6 overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md pb-2 border-b border-border/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight leading-none">System Activity</h1>
              <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-widest">Track all state-changing actions</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs font-medium bg-background border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all w-full md:w-64"
              />
            </div>

            {/* Action Filter */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-8 pl-8 pr-6 text-xs font-medium bg-background border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
              >
                <option value="All">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="EXPORT">Export</option>
              </select>
            </div>
            
            {/* Generate Test Log Button */}
            <button
              onClick={handleGenerateTestLog}
              className="h-8 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all whitespace-nowrap border border-border/50"
            >
              Generate Test Log
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-lg border max-w-sm animate-in slide-in-from-bottom-5 ${
          toastMessage.type === 'error' 
            ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200' 
            : 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-900 text-green-900 dark:text-green-200'
        }`}>
          <h4 className="font-bold text-sm mb-1">{toastMessage.title}</h4>
          <p className="text-xs opacity-90">{toastMessage.desc}</p>
        </div>
      )}

      {/* Data Table UI */}
      <div className="flex-1 overflow-auto bg-background dark:bg-slate-950 border border-border/50 rounded-lg">
        <table className="w-full table-fixed text-left text-xs whitespace-nowrap">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="w-[15%] py-2 px-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Timestamp
                </div>
              </th>
              <th className="w-[25%] py-2 px-3">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> User
                </div>
              </th>
              <th className="w-[15%] py-2 px-3">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Action
                </div>
              </th>
              <th className="w-[45%] py-2 px-3">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Details
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span>Loading logs...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-red-500 font-medium">
                  {error}
                </td>
              </tr>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-xs">
                  <td className="py-2 px-3 truncate text-muted-foreground">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="py-2 px-3 truncate">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                        {getSafeUserEmail(log)[0] || 'U'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground truncate">{getSafeUserName(log)}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{getSafeUserEmail(log)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 truncate">
                    {getActionBadge(getSafeAction(log))}
                  </td>
                  <td className="py-2 px-3 truncate text-muted-foreground hover:whitespace-normal group">
                    <span className="line-clamp-1 group-hover:line-clamp-none transition-all">{getSafeDetails(log)}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-muted rounded-full">
                      <Info className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="font-medium text-sm">No activity logs found. Try generating a Test Log.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
