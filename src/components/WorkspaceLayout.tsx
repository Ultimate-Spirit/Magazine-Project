import { ChevronLeft, Home, User, Shield, LogOut } from 'lucide-react';
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
    <div className="min-h-screen bg-[#FBFBFB] flex flex-col">
      <header className="h-16 border-b bg-white px-8 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onHome}
            className="w-8 h-8 flex items-center justify-center rounded bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Change Company"
          >
            <Home size={16} />
          </button>
          
          <div className="h-4 w-[1px] bg-border mx-2" />
          
          {currentView !== 'project_explorer' && currentView !== 'company_selection' && (
            <button 
              onClick={onNavigateBack}
              className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors mr-4"
            >
              <ChevronLeft size={16} className="mr-1" />
              Back
            </button>
          )}

          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {company.name}
            </span>
            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary border">Workspace</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <Link 
              to="/admin"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-all"
            >
              <Shield size={14} />
              Admin
            </Link>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all border"
            >
              <User size={16} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <p className="text-xs font-medium text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
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
