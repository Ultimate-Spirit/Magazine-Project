import { Home, User, Shield, LogOut, ChevronLeft, Building2 } from 'lucide-react';
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
      <header className="h-20 border-b border-gray-100 bg-white px-8 flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center space-x-6">
          <button 
            onClick={onHome}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-gray-100"
            title="Change Company"
          >
            <Home size={18} />
          </button>
          
          <div className="h-6 w-[1px] bg-gray-100" />
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100 overflow-hidden shrink-0">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain p-1.5" />
              ) : (
                <Building2 size={20} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-gray-900 leading-none">
                  {company.name}
                </span>
                <span className="text-[9px] font-black text-gray-400 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 uppercase tracking-widest">
                  Workspace
                </span>
              </div>
              {currentView !== 'project_explorer' && currentView !== 'company_selection' && (
                <button 
                  onClick={onNavigateBack}
                  className="flex items-center text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors mt-1 uppercase tracking-wider"
                >
                  <ChevronLeft size={10} className="mr-0.5" />
                  Return
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <Link 
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm shadow-blue-100"
            >
              <Shield size={14} />
              Admin Console
            </Link>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-white transition-all border border-gray-100"
            >
              <User size={18} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl py-3 z-[110] animate-in slide-in-from-top-2 duration-200">
                <div className="px-5 py-2 border-b border-gray-50 mb-2">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Authenticated As</p>
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
      
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
