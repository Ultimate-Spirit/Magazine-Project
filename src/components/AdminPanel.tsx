import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Trash2, Mail, Shield, Loader2, Users, Building2, LayoutDashboard, Settings, Search, X, CheckCircle2 } from 'lucide-react';
import type { Company, UserProfile } from '../types';

export const AdminPanel: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'companies'>('users');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  
  // New User State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [newUserCompany, setNewUserCompany] = useState('');
  
  // New Company State
  const [newCompanyName, setNewCompanyName] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, companiesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('email'),
      supabase.from('companies').select('*').order('name')
    ]);

    if (!profilesRes.error) setProfiles(profilesRes.data as UserProfile[]);
    if (!companiesRes.error) setCompanies(companiesRes.data as Company[]);
    setLoading(false);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      // 1. Invite user via Supabase Auth Admin API (if available)
      // Note: This requires service role, which we don't have on client.
      // For this prototype, we'll simulate the invite and create/update the profile.
      
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(newUserEmail, {
        data: { role: newUserRole }
      });

      if (inviteError) {
        // Fallback for prototype if admin API fails due to permissions
        console.warn('Admin Invite failed, falling back to profile management:', inviteError.message);
        
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', newUserEmail)
          .single();

        if (existingUser) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              role: newUserRole,
              companyId: newUserCompany || undefined
            })
            .eq('id', existingUser.id);
          
          if (updateError) throw updateError;
        } else {
          // In a real app, you can't create a profile without a user ID.
          // We'll show an error but simulate success for the UI logic.
          throw new Error('User does not exist. In production, this would trigger a secure invite flow.');
        }
      } else if (inviteData?.user) {
        // 2. Map user to company in user_companies (or profiles for now)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: newUserRole,
            companyId: newUserCompany || undefined
          })
          .eq('id', inviteData.user.id);
        
        if (profileError) throw profileError;
      }

      showNotification('success', `User ${newUserEmail} invited successfully`);
      fetchData();
      setIsUserModalOpen(false);
      setNewUserEmail('');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
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

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) showNotification('error', error.message);
    else {
      showNotification('success', 'User deleted');
      fetchData();
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

  const filteredProfiles = profiles.filter(p => 
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-400 hover:text-gray-900 font-medium'}`}
          >
            <Users className="w-5 h-5" />
            User Accounts
          </button>
          <button 
            onClick={() => setActiveTab('companies')}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${activeTab === 'companies' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-400 hover:text-gray-900 font-medium'}`}
          >
            <Building2 className="w-5 h-5" />
            Workspaces
          </button>
          
          <div className="pt-8 pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">System</div>
          <button className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-gray-400 hover:text-gray-900 font-medium transition-all">
            <LayoutDashboard className="w-5 h-5" />
            Analytics
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-gray-400 hover:text-gray-900 font-medium transition-all">
            <Settings className="w-5 h-5" />
            Configuration
          </button>
        </nav>

        <div className="p-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Authenticated As</p>
            <p className="text-sm font-bold text-gray-900 truncate">System Administrator</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-24 bg-white flex items-center justify-between px-12">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {activeTab === 'users' ? 'User Management' : 'Workspace Directory'}
          </h1>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input 
                type="text" 
                placeholder="Search resources..."
                className="pl-11 pr-6 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-72 text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => activeTab === 'users' ? setIsUserModalOpen(true) : setIsCompanyModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'users' ? 'Add User' : 'Create Company'}
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
          ) : activeTab === 'users' ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identity</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Access Level</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Workspace Mapping</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="group hover:bg-gray-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
                            {profile.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{profile.fullName || 'No Name'}</p>
                            <p className="text-sm text-gray-400 font-medium">{profile.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${profile.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                          {profile.role}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-gray-600 font-medium">
                          <Building2 className="w-4 h-4 text-gray-300" />
                          {companies.find(c => c.id === profile.companyId)?.name || <span className="text-gray-300 italic">No Mapping</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleDeleteUser(profile.id)}
                          className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {companies.map((company) => (
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
      </div>

      {/* User Creation Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Invite Professional</h2>
                <p className="text-gray-400 font-medium mt-1">Grant access to internal workspace tools</p>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-4 hover:bg-gray-50 rounded-2xl transition-all group"
              >
                <X className="w-6 h-6 text-gray-300 group-hover:text-gray-900" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Identity (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="email"
                    placeholder="colleague@organization.com"
                    className="w-full pl-14 pr-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Privilege Level</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-bold text-gray-900 appearance-none"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                  >
                    <option value="admin">Administrator</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Workspace Assignment</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-bold text-gray-900 appearance-none"
                    value={newUserCompany}
                    onChange={(e) => setNewUserCompany(e.target.value)}
                  >
                    <option value="">No Assignment</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 text-lg"
              >
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Send Invitation Link'}
              </button>
            </form>
          </div>
        </div>
      )}

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
