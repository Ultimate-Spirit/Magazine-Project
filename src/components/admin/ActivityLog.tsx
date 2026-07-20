import React, { useState, useEffect } from 'react';
import { Search, Filter, Activity, Clock, User, Info, Loader2 } from 'lucide-react';

interface LogEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT';
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
      fetchLogs();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'All' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: LogEntry['action']) => {
    switch (action) {
      case 'CREATE':
        return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">CREATE</span>;
      case 'DELETE':
        return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">DELETE</span>;
      case 'EXPORT':
        return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">EXPORT</span>;
      case 'UPDATE':
        return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">UPDATE</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400">{action}</span>;
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
      <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-background/95 backdrop-blur-md pb-4 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black">System Activity</h1>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Track all state-changing actions</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-full md:w-64"
              />
            </div>

            {/* Action Filter */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-900 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
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
              className="px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all whitespace-nowrap"
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
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 border border-border rounded-2xl shadow-sm">
        <table className="w-full table-fixed text-left text-sm whitespace-nowrap">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="w-[15%] py-4 px-6 font-semibold">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Timestamp
                </div>
              </th>
              <th className="w-[25%] py-4 px-6 font-semibold">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" /> User
                </div>
              </th>
              <th className="w-[15%] py-4 px-6 font-semibold">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Action
                </div>
              </th>
              <th className="w-[45%] py-4 px-6 font-semibold">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" /> Details
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
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-6 truncate text-muted-foreground">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="py-3 px-6 truncate">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground truncate">{log.user_name}</span>
                      <span className="text-xs text-muted-foreground truncate">{log.user_email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-6 truncate">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="py-3 px-6 truncate text-muted-foreground hover:whitespace-normal group">
                    <span className="line-clamp-1 group-hover:line-clamp-none transition-all">{log.details}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  No activity logs found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
