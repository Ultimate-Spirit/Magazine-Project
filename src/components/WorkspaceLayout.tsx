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
      <header className="h-20 border-b bg-white px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button 
            onClick={onHome}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-gray-100 shrink-0"
            title="Change Company"
          >
            <Home size={18} />
          </button>
          
          <div className="h-6 w-[1px] bg-gray-100 mx-1 hidden sm:block shrink-0" />
          
          {currentView !== 'project_explorer' && currentView !== 'company_selection' && (
            <button 
              onClick={onNavigateBack}
              className="flex items-center text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors mr-2 shrink-0"
            >
              <ChevronLeft size={16} className="mr-0.5" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm md:text-base font-bold tracking-tight text-gray-900 truncate">
              {company.name}
            </span>
            <span className="text-[10px] font-bold text-blue-600 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100 uppercase tracking-widest hidden xs:inline shrink-0">Workspace</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {isAdmin && (
            <Link 
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all"
            >
              <Shield size={14} />
              <span className="hidden md:inline">Console</span>
            </Link>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all border border-gray-100"
            >
              <User size={20} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl py-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-5 py-2 border-b border-gray-50 mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Authenticated As</p>
                  <p className="text-xs font-bold text-gray-900 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
