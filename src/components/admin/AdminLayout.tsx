import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Shield, Users, Building2, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AdminLayout: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/users', icon: Users, label: 'User Accounts' },
    { to: '/admin/companies', icon: Building2, label: 'Workspaces' },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <div className="w-72 bg-gray-50 border-r border-gray-100 flex flex-col">
        <div className="p-8 flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-100">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900 block">Admin</span>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Console</span>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm font-bold'
                    : 'text-gray-400 hover:text-gray-900 font-medium hover:bg-gray-100/50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
          
          <div className="pt-8 pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">System</div>
          <button className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-gray-400 hover:text-gray-900 font-medium transition-all hover:bg-gray-100/50">
            <Settings className="w-5 h-5" />
            Configuration
          </button>
        </nav>

        <div className="p-6 space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Authenticated As</p>
            <p className="text-sm font-bold text-gray-900 truncate">System Administrator</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50 font-bold transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
