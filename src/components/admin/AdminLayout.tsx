import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Shield, Users, Building2, LayoutDashboard, Settings, LogOut, Moon, Sun, Menu, X, LayoutTemplate, Layers, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export const AdminLayout: React.FC = () => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Strict Body Scroll Lock
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/companies', icon: Building2, label: 'Workspaces' },
    { to: '/admin/bundles', icon: Layers, label: 'Content Bundles' },
    { to: '/admin/covers', icon: LayoutTemplate, label: 'Cover Pages' },
    { to: '/admin/last-pages', icon: LayoutTemplate, label: 'Last Pages' },
    { to: '/admin/activity', icon: Activity, label: 'Activity Log' },
  ];

  return (
    <div className="flex w-full h-full overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-[90] bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-[100] w-56 flex-shrink-0 h-full overflow-y-auto bg-background border-r border-border flex flex-col 
        transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 px-3 flex items-center justify-between shrink-0 border-b border-border/50 lg:border-none lg:h-auto lg:p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-sm shadow-primary/20">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-sm font-semibold block tracking-tighter">Admin</span>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em]">Console</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 text-muted-foreground hover:bg-secondary rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto invisible-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-[13px] ${
                  isActive
                    ? 'bg-secondary/50 text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground font-medium hover:bg-muted'
                }`
              }
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
          
          <div className="pt-4 pb-2 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">System</div>
          <NavLink
            to="/admin/configurations"
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-[13px] ${
                isActive
                  ? 'bg-secondary/50 text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground font-medium hover:bg-muted'
              }`
            }
          >
            <Settings className="w-4 h-4" strokeWidth={1.5} />
            Configuration
          </NavLink>

          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground font-medium transition-all hover:bg-muted text-[13px]"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" strokeWidth={1.5} /> : <Sun className="w-4 h-4" strokeWidth={1.5} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </nav>

        <div className="p-3 space-y-3">
          <div className="bg-muted/50 rounded-xl p-3 border border-border/50 backdrop-blur-sm">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Authenticated As</p>
            <p className="text-xs font-semibold truncate italic">System Administrator</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 font-semibold transition-all text-[13px]"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full h-full bg-background overflow-y-auto min-w-0 p-4 flex flex-col relative pt-16 lg:pt-4">
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 h-16 border-b border-border flex items-center px-6 lg:hidden bg-background z-[40] shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-100/50 rounded-xl transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="ml-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50">Admin Console</span>
          </div>
        </header>
        
        <div className="flex-1 w-full max-w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );

};

