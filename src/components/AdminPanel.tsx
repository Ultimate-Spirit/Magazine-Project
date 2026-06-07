import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Trash2, Mail, Shield, Loader2, Users, Building2, LayoutDashboard, Settings, Search, X, CheckCircle2, Menu, Image as ImageIcon, Upload } from 'lucide-react';
import type { Company, UserProfile } from '../types';

export const AdminPanel: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userCompanies, setUserCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'companies'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Form states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  
  // New User State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [newUserCompany, setNewUserCompany] = useState('');
  
  // New Company State
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyLogo, setNewCompanyLogo] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchData();
    // Collapse sidebar on small screens
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, companiesRes, userCompRes] = await Promise.all([
      supabase.from('profiles').select('*').order('email'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('user_companies').select('*')
    ]);

    if (!profilesRes.error) setProfiles(profilesRes.data as UserProfile[]);
    if (!companiesRes.error) setCompanies(companiesRes.data as Company[]);
    if (!userCompRes.error) setUserCompanies(userCompRes.data);
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
      // In a real app, this would be a backend call or use service role.
      // For this implementation, we assume we are updating an existing profile if it exists.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUserEmail)
        .single();

      if (profileError) throw new Error('User must have an existing account or be invited via Auth first.');

      // 1. Update role
      await supabase.from('profiles').update({ role: newUserRole }).eq('id', profile.id);

      // 2. Add to company if selected
      if (newUserCompany) {
        const { error: mappingError } = await supabase
          .from('user_companies')
          .insert([{ user_id: profile.id, company_id: newUserCompany }]);
        if (mappingError && mappingError.code !== '23505') throw mappingError; // Ignore unique constraint errors
      }

      showNotification('success', `User permissions updated for ${newUserEmail}`);
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
      let logoUrl = undefined;

      if (newCompanyLogo) {
        const fileExt = newCompanyLogo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(filePath, newCompanyLogo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('company-logos')
          .getPublicUrl(filePath);
        
        logoUrl = publicUrl;
      }

      const { error } = await supabase
        .from('companies')
        .insert([{ name: newCompanyName, logo_url: logoUrl }]);

      if (error) throw error;

      showNotification('success', `Company "${newCompanyName}" created successfully`);
      fetchData();
      setIsCompanyModalOpen(false);
      setNewCompanyName('');
      setNewCompanyLogo(null);
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    
    // We don't delete the profile usually, just remove company mappings or roles
    const { error } = await supabase.from('user_companies').delete().eq('user_id', id);
    if (error) showNotification('error', error.message);
    else {
      showNotification('success', 'User access revoked');
      fetchData();
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Are you sure? This will remove all member associations.')) return;
    
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
    <div className="min-h-screen bg-white flex overflow-hidden">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-72' : 'w-0 lg:w-20'} bg-gray-50 border-r border-gray-100 flex flex-col transition-all duration-300 relative z-40 overflow-hidden`}>
        <div className="p-8 flex items-center gap-4 whitespace-nowrap">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-100 shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && (
            <div>
              <span className="text-xl font-bold text-gray-900 block">Admin</span>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Console</span>
            </div>
          )}
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-400 hover:text-gray-900 font-medium'}`}
          >
            <Users className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>User Accounts</span>}
          </button>
          <button 
            onClick={() => setActiveTab('companies')}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${activeTab === 'companies' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-400 hover:text-gray-900 font-medium'}`}
          >
            <Building2 className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Workspaces</span>}
          </button>
          
          {isSidebarOpen && <div className="pt-8 pb-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">System</div>}
          <button className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-gray-400 hover:text-gray-900 font-medium transition-all">
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Analytics</span>}
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-gray-400 hover:text-gray-900 font-medium transition-all">
            <Settings className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Configuration</span>}
          </button>
        </nav>

        {isSidebarOpen && (
          <div className="p-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Access</p>
              <p className="text-sm font-bold text-gray-900 truncate">System Admin</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-24 bg-white flex items-center justify-between px-6 lg:px-12 border-b border-gray-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-50 rounded-xl transition-colors lg:hidden"
            >
              <Menu className="w-6 h-6 text-gray-400" />
            </button>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight whitespace-nowrap">
              {activeTab === 'users' ? 'Users' : 'Workspaces'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input 
                type="text" 
                placeholder="Search..."
                className="pl-11 pr-6 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-48 lg:w-72 text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => activeTab === 'users' ? setIsUserModalOpen(true) : setIsCompanyModalOpen(true)}
              className="flex items-center gap-2 px-4 lg:px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{activeTab === 'users' ? 'Add Access' : 'New Workspace'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 lg:px-12 py-8">
          {notification && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="font-bold text-sm">{notification.message}</p>
            </div>
          )}

          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
          ) : activeTab === 'users' ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
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
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                            {profile.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">{profile.fullName || 'Member'}</p>
                            <p className="text-xs text-gray-400 font-medium truncate">{profile.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${profile.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                          {profile.role}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-2">
                          {userCompanies
                            .filter(uc => uc.user_id === profile.id)
                            .map(uc => {
                              const company = companies.find(c => c.id === uc.company_id);
                              return company ? (
                                <span key={company.id} className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-md border border-gray-100 flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {company.name}
                                </span>
                              ) : null;
                            })}
                          {userCompanies.filter(uc => uc.user_id === profile.id).length === 0 && (
                            <span className="text-gray-300 italic text-xs font-medium">No Assignment</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleDeleteUser(profile.id)}
                          className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
              {companies.map((company) => (
                <div key={company.id} className="bg-white p-6 lg:p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 overflow-hidden border border-gray-50">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-8 h-8" />
                      )}
                    </div>
                    <button 
                      onClick={() => handleDeleteCompany(company.id)}
                      className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl lg:opacity-0 lg:group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{company.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                    <Users className="w-4 h-4" />
                    {userCompanies.filter(uc => uc.company_id === company.id).length} Active Members
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* User Creation Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 lg:p-10 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Assign Permissions</h2>
                <p className="text-gray-400 font-medium mt-1">Configure workspace access for existing users</p>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-3 hover:bg-gray-50 rounded-2xl transition-all group"
              >
                <X className="w-6 h-6 text-gray-300 group-hover:text-gray-900" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-8 lg:p-10 space-y-6 lg:space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Identity (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="email"
                    placeholder="member@organization.com"
                    className="w-full pl-14 pr-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Update Access'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Company Creation Modal */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 lg:p-10 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">New Workspace</h2>
                <p className="text-gray-400 font-medium mt-1">Register a new organization</p>
              </div>
              <button 
                onClick={() => setIsCompanyModalOpen(false)}
                className="p-3 hover:bg-gray-50 rounded-2xl transition-all group"
              >
                <X className="w-6 h-6 text-gray-300 group-hover:text-gray-900" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-8 lg:p-10 space-y-6 lg:space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Visual Identity</label>
                <div 
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-all overflow-hidden relative group"
                >
                  {newCompanyLogo ? (
                    <img src={URL.createObjectURL(newCompanyLogo)} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-400">Upload Brand Logo</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={logoInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => setNewCompanyLogo(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Organization Name"
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
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Initialize Workspace'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
