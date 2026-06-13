import React from 'react';
import { User, Shield, LogOut, Building2, Moon, Sun, ChevronDown, Check } from 'lucide-react';
import type { Company } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  company?: Company;
}

export function WorkspaceLayout({ children, company }: Props) {
  const { profile, signOut, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isSelectionPage = location.pathname === '/';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
      <header className={`h-16 md:h-20 px-2 lg:px-10 xl:px-16 flex items-center justify-between sticky top-0 z-[100] bg-background/80 backdrop-blur-xl ${isSelectionPage ? '' : 'faint-divider'}`}>
        <div className="flex items-center gap-4 md:gap-8">
          {isSelectionPage ? (
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
              <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.4em] whitespace-nowrap">
                Core // Workspace Selection
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-tight leading-none truncate max-w-[120px] md:max-w-none">
                  {company?.name || 'Spirit OS'}
                </span>
                <span className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] mt-1">
                  Active Workspace
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 pr-4 border-r border-border/50">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="hidden md:flex items-center gap-2 px-4 py-2 micro-surface border border-border/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-primary transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin Console
              </button>
            )}
          </div>

          <div className="relative group">
            <button className="flex items-center gap-3 p-1 rounded-2xl hover:bg-secondary transition-all">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                {profile?.email?.[0].toUpperCase()}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            {/* Account Dropdown */}
            <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-950 border border-border/10 rounded-3xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all z-[100] overflow-hidden">
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50">
                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-3">Identity Context</p>
                <p className="text-sm font-black truncate">{profile?.full_name || 'System Identity'}</p>
                <p className="text-[10px] font-bold text-muted-foreground/60 truncate mt-0.5">{profile?.email}</p>
              </div>
              
              <div className="p-2 space-y-1">
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="w-full md:hidden flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-secondary text-xs font-bold transition-all"
                  >
                    <Shield className="w-4 h-4 text-primary" />
                    Admin Console
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-destructive/5 text-xs font-bold text-destructive transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
