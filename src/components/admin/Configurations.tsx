import React, { useState } from 'react';
import { UserManagement } from './UserManagement';
import { RoleManagement } from './RoleManagement';
import { Users, Shield, Settings, Menu, X } from 'lucide-react';

export const Configurations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex w-full h-full overflow-hidden bg-background -m-8 relative">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-[50] bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Settings Navigation Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-[60] w-64 flex-shrink-0 h-full overflow-y-auto bg-secondary/30 border-r border-border/50 flex flex-col p-6
        transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-8 lg:mb-12">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Settings
          </h2>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-muted-foreground hover:bg-secondary rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2">Access & Security</p>
          
          <button
            onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
              activeTab === 'users' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            User Accounts
          </button>

          <button
            onClick={() => { setActiveTab('roles'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
              activeTab === 'roles' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Shield className="w-4 h-4" />
            Access Control
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full bg-gray-50 overflow-y-auto min-w-0 relative flex flex-col dark:bg-background">
        {/* Mobile Header for Settings Sidebar */}
        <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 h-16 flex items-center px-4">
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

        <div className="flex-1 w-full max-w-full">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'roles' && <RoleManagement />}
        </div>
      </div>
    </div>
  );
};
