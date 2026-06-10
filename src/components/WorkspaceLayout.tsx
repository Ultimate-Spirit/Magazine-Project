import { User, Shield, LogOut, ChevronLeft, Building2 } from 'lucide-react';
import type { Company, ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
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
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      <header className="h-24 px-8 md:px-12 flex items-center justify-between sticky top-0 z-[100] bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-8">
          <button 
            onClick={onHome}
            className="group flex items-center gap-3"
            title="Change Workspace"
          >
            <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-primary-foreground">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain p-2" />
              ) : (
                <Building2 size={24} />
              )}
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-display font-bold leading-none tracking-tight">
                {company.name}
              </h1>
              <p className="text-[10px] font-body font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
                Workspace context
              </p>
            </div>
          </button>
          
          {currentView !== 'project_explorer' && currentView !== 'company_selection' && (
            <button 
              onClick={onNavigateBack}
              className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors px-4 py-2 bg-secondary rounded-full"
            >
              <ChevronLeft size={14} />
              <span>Back</span>
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link 
              to="/admin"
              className="h-12 px-6 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-primary-foreground bg-primary rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/10"
            >
              <Shield size={16} />
              <span className="hidden md:block">Admin</span>
            </Link>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all overflow-hidden"
            >
              <User size={20} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-4 w-64 bg-card border border-border rounded-3xl shadow-2xl py-4 z-[110] animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-3 border-b border-border/50 mb-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Authenticated</p>
                  <p className="text-sm font-bold truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <LogOut size={18} />
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

