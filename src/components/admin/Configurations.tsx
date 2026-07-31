import React, { useState } from 'react';
import { UserManagement } from './UserManagement';
import { RoleManagement } from './RoleManagement';
import { Users, Shield, Settings, Menu, X } from 'lucide-react';

export const Configurations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row w-[calc(100%+4rem)] h-full min-h-screen bg-background -m-8 relative">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-[50] bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Settings Navigation Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-[60] w-56 flex-shrink-0 h-full overflow-y-auto bg-secondary/30 border-r border-border/50 flex flex-col p-3
        transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" strokeWidth={1.5} />
            Settings
          </h2>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 text-muted-foreground hover:bg-secondary rounded-lg transition-all"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-1">Access & Security</p>
          
          <button
            onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-[13px] ${
              activeTab === 'users' 
                ? 'bg-secondary/50 text-foreground font-semibold' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground font-medium'
            }`}
          >
            <Users className="w-4 h-4" strokeWidth={1.5} />
            User Accounts
          </button>

          <button
            onClick={() => { setActiveTab('roles'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-[13px] ${
              activeTab === 'roles' 
                ? 'bg-secondary/50 text-foreground font-semibold' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground font-medium'
            }`}
          >
            <Shield className="w-4 h-4" strokeWidth={1.5} />
            Access Control
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full overflow-x-hidden relative flex flex-col">
        {/* Mobile Header for Settings Sidebar */}
        <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 h-14 flex items-center px-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-muted-foreground hover:bg-secondary rounded-xl transition-all mr-2"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">
            {activeTab === 'users' ? 'User Accounts' : 'Access Control'}
          </span>
        </div>

        <div className="flex-1 w-full min-w-0">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'roles' && <RoleManagement />}
        </div>
      </div>
    </div>
  );
};
