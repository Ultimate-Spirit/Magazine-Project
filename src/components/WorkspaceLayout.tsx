import { Home, User, Shield, LogOut, ChevronLeft, Building2, Moon, Sun } from 'lucide-react';
import type { Company, ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  company: Company;
  currentView: ViewState;
  onNavigateBack: () => void;
  onHome: () => void;
  children: React.ReactNode;
}

export function WorkspaceLayout({ company, currentView, onNavigateBack, onHome, children }: Props) {
  const { isAdmin, signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
      <header className="h-20 border-b border-border bg-card/50 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center space-x-6">
          <button 
            onClick={onHome}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-border"
            title="Change Company"
          >
            <Home size={18} />
          </button>
          
          <div className="h-6 w-[1px] bg-border" />
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground border border-border overflow-hidden shrink-0">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain p-1.5" />
              ) : (
                <Building2 size={20} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight leading-none">
                  {company.name}
                </span>
                <span className="text-[9px] font-black text-muted-foreground px-2 py-0.5 rounded-md bg-muted border border-border uppercase tracking-widest">
                  Workspace
                </span>
              </div>
              {currentView !== 'project_explorer' && currentView !== 'company_selection' && (
                <button 
                  onClick={onNavigateBack}
                  className="flex items-center text-[10px] font-bold text-primary hover:opacity-80 transition-colors mt-1 uppercase tracking-wider"
                >
                  <ChevronLeft size={10} className="mr-0.5" />
                  Return
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all border border-border"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {isAdmin && (
            <Link 
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground bg-primary border border-primary/20 rounded-xl hover:opacity-90 transition-all shadow-sm"
            >
              <Shield size={14} />
              Admin Console
            </Link>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all border border-border"
            >
              <User size={18} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-card border border-border rounded-2xl shadow-2xl py-3 z-[110] animate-in slide-in-from-top-2 duration-200">
                <div className="px-5 py-2 border-b border-border mb-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Authenticated As</p>
                  <p className="text-xs font-bold truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}

