import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Users, Building2, ArrowUpRight, Loader2, Calendar } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    userCount: 0,
    companyCount: 0,
    activeSessions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, companiesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('companies').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        userCount: profilesRes.count || 0,
        companyCount: companiesRes.count || 0,
        activeSessions: Math.floor(Math.random() * 5) + 1 // Simulated for now
      });
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Users', value: stats.userCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', link: '/admin/users' },
    { label: 'Workspaces', value: stats.companyCount, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50', link: '/admin/companies' },
  ];

  return (
    <div className="flex-1 p-12 overflow-y-auto">
      <header className="mb-12">
        <div className="flex items-center gap-3 text-sm font-bold text-blue-600 uppercase tracking-widest mb-4">
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">System Overview</h1>
        <p className="text-gray-400 font-medium mt-2 text-lg">Manage your organization and monitor platform health.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {cards.map((card) => (
          <div 
            key={card.label} 
            onClick={() => navigate(card.link)}
            className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={`p-4 ${card.bg} ${card.color} rounded-2xl`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div className="p-2 bg-gray-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-4xl font-black text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-gray-50 p-10 rounded-[2.5rem] border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => navigate('/admin/users')}
              className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-200 hover:border-blue-500 transition-all group"
            >
              <span className="font-bold text-gray-700">Manage team members</span>
              <Users className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </button>
            <button 
              onClick={() => navigate('/admin/companies')}
              className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-200 hover:border-blue-500 transition-all group"
            >
              <span className="font-bold text-gray-700">Manage workspaces</span>
              <Building2 className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </button>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Status</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-bold text-gray-700">Database Connection</span>
              </div>
              <span className="text-xs font-bold text-green-600 uppercase">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-bold text-gray-700">Authentication Service</span>
              </div>
              <span className="text-xs font-bold text-green-600 uppercase">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-bold text-gray-700">Storage API</span>
              </div>
              <span className="text-xs font-bold text-green-600 uppercase">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
