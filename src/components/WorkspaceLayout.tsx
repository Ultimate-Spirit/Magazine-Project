import { User, Shield, LogOut, ChevronLeft, Building2, Moon, Sun, ChevronDown, Check } from 'lucide-react';
import type { Company, ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface Props {
  company: Company;
  currentView: ViewState;
  onNavigateBack: () => void;
  onHome: () => void;
  children: React.ReactNode;
}

export function WorkspaceLayout({ company, currentView, onNavigateBack, children }: Props) {
  const { isAdmin, signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [authorizedCompanies, setAuthorizedCompanies] = useState<Company[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAuthorizedWorkspaces = async () => {
      if (!user) return;
      try {
        if (isAdmin) {
          const { data } = await supabase.from('companies').select('*').order('name');
          if (data) setAuthorizedCompanies(data);
        } else {
          const { data } = await supabase
            .from('user_companies')
            .select('companies(*)')
            .eq('user_id', user.id);
          if (data) {
            setAuthorizedCompanies(data.map((item: any) => item.companies).filter(Boolean));
          }
        }
      } catch (err) {
        console.error('Error fetching workspaces:', err);
      }
    };
    fetchAuthorizedWorkspaces();
  }, [user, isAdmin]);

  const switchWorkspace = (cid: string) => {
    setShowWorkspaceMenu(false);
    navigate(`/company/${cid}/folders`);
    window.location.reload(); // Force reload to refresh context
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground font-sans">
      <header className="h-16 md:h-20 px-4 md:px-8 flex items-center justify-between sticky top-0 z-[100] bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="relative">
            <button 
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="group flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-2xl hover:bg-secondary transition-all border border-transparent hover:border-border"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center transition-all group-hover:scale-95">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain p-1.5" />
                ) : (
                  <Building2 size={20} />
                )}
              </div>
              <div className="hidden sm:flex flex-col items-start text-left">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm md:text-base font-bold leading-none tracking-tight">
                    {company.name}
                  </h1>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-300 ${showWorkspaceMenu ? 'rotate-180' : ''}`} />
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
                  Switch Workspace
                </p>
              </div>
            </button>

            {showWorkspaceMenu && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-2xl py-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-border/50 mb-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Authorized Workspaces</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {authorizedCompanies.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => switchWorkspace(c.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary transition-colors text-left"
                    >
                      <span className={`text-sm font-medium ${c.id === company.id ? 'text-primary' : 'text-foreground'}`}>
                        {c.name}
                      </span>
                      {c.id === company.id && <Check size={14} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={toggleTheme}
            className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all border border-border/50"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {isAdmin && (
            <Link 
              to="/admin"
              className="h-10 px-4 md:h-12 md:px-6 flex items-center gap-2 md:gap-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground bg-primary rounded-xl md:rounded-2xl hover:opacity-90 transition-all border border-primary/20"
            >
              <Shield size={14} />
              <span className="hidden md:block">Admin</span>
            </Link>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all border border-border/50 overflow-hidden"
            >
              <User size={18} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-2xl py-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-border/50 mb-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Authenticated</p>
                  <p className="text-xs font-bold truncate text-foreground/80">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col w-full max-w-[100vw] overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
