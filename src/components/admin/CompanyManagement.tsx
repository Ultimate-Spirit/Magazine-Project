import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Trash2, Building2, Loader2, Search, X, CheckCircle2, Users } from 'lucide-react';
import type { Company, UserProfile } from '../../types';

export const CompanyManagement: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [companiesRes, profilesRes] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      supabase.from('profiles').select('*')
    ]);

    if (!companiesRes.error) setCompanies(companiesRes.data as Company[]);
    if (!profilesRes.error) setProfiles(profilesRes.data as UserProfile[]);
    setLoading(false);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('companies')
        .insert([{ name: newCompanyName }]);

      if (error) throw error;

      showNotification('success', `Company "${newCompanyName}" created successfully`);
      fetchData();
      setIsCompanyModalOpen(false);
      setNewCompanyName('');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company? All associated data will be affected.')) return;
    
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) showNotification('error', error.message);
    else {
      showNotification('success', 'Company deleted');
      fetchData();
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-24 bg-white flex items-center justify-between px-12">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Workspace Directory</h1>
        
        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input 
              type="text" 
              placeholder="Search workspaces..."
              className="pl-11 pr-6 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-72 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsCompanyModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Plus className="w-4 h-4" />
            Create Company
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-12 pb-12">
        {notification && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCompanies.map((company) => (
              <div key={company.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <button 
                    onClick={() => handleDeleteCompany(company.id)}
                    className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{company.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                  <Users className="w-4 h-4" />
                  {profiles.filter(p => p.companyId === company.id).length} Active Members
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Company Creation Modal */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">New Workspace</h2>
                <p className="text-gray-400 font-medium mt-1">Register a new organization</p>
              </div>
              <button 
                onClick={() => setIsCompanyModalOpen(false)}
                className="p-4 hover:bg-gray-50 rounded-2xl transition-all group"
              >
                <X className="w-6 h-6 text-gray-300 group-hover:text-gray-900" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Enterprise Name"
                    className="w-full pl-14 pr-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 text-lg"
              >
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Create Workspace'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
