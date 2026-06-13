import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Shield, Users, Building2, LayoutDashboard, Settings, LogOut, Moon, Sun, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export const AdminLayout: React.FC = () => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/companies', icon: Building2, label: 'Workspaces' },
    { to: '/admin/users', icon: Users, label: 'User Accounts' },
    { to: '/admin/roles', icon: Shield, label: 'Access Control' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-300">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-card/95 backdrop-blur-md border-r border-border flex flex-col 
        transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-bold block">Admin</span>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Console</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-muted-foreground hover:bg-secondary rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-6 space-y-2 mt-4 overflow-y-auto invisible-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold'
                    : 'text-muted-foreground hover:text-foreground font-medium hover:bg-muted'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
          
          <div className="pt-8 pb-4 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">System</div>
          <button className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-muted-foreground hover:text-foreground font-medium transition-all hover:bg-muted">
            <Settings className="w-5 h-5" />
            Configuration
          </button>

          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-muted-foreground hover:text-foreground font-medium transition-all hover:bg-muted"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </nav>

        <div className="p-6 space-y-4">
          <div className="bg-muted/50 rounded-3xl p-6 border border-border/50 backdrop-blur-sm">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Authenticated As</p>
            <p className="text-sm font-bold truncate">System Administrator</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-destructive hover:bg-destructive/10 font-bold transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 border-b border-border/50 flex items-center px-6 lg:hidden bg-background/80 backdrop-blur-xl shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-100/50 rounded-xl transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="ml-4">
            <span className="text-sm font-black uppercase tracking-widest text-foreground/70">Admin Console</span>
          </div>
        </header>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

