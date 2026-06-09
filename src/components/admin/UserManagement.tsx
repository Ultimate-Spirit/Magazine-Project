import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Trash2, Mail, Loader2, Search, X, CheckCircle2, Building2, User, Lock } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import type { Company, UserProfile } from '../../types';

export const UserManagement: React.FC = () => {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
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
      // First check if user already exists in profiles
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUserEmail)
        .single();

      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: newUserName
          })
          .eq('id', existingUser.id);

        if (updateError) throw updateError;
        showNotification('success', `Updated existing user ${newUserEmail}`);
      } else {
        // Trigger Edge Function to directly create a confirmed user
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-user', {
          body: { 
            email: newUserEmail, 
            password: newUserPassword,
            full_name: newUserName
          }
        });

        if (edgeError) {
          throw new Error(edgeError.message || 'Failed to create user account.');
        }
        if (edgeData?.error) {
          throw new Error(edgeData.error);
        }
        
        showNotification('success', edgeData?.message || `Account created for ${newUserEmail}`);
      }

      await logActivity('invited', 'user', newUserEmail, companies[0]?.id || '', profile?.id || '');

      fetchData();
      setIsUserModalOpen(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userToDelete.id);
      if (error) throw error;

      await logActivity('deleted', 'user', userToDelete.email, userToDelete.company_id || companies[0]?.id || '', profile?.id || '');

      showNotification('success', 'User deleted');
      setUserToDelete(null);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-24 bg-white flex items-center justify-between px-12 border-b border-gray-50">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
        
        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input 
              type="text" 
              placeholder="Search users..."
              className="pl-11 pr-6 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-72 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsUserModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-12 pb-12 pt-12">
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
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
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
                          <p className="font-bold text-gray-900">{profile.full_name || 'No Name'}</p>
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
                        {companies.find(c => c.id === profile.company_id)?.name || <span className="text-gray-300 italic">No Mapping</span>}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setUserToDelete(profile)}
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
        )}
      </main>

      {/* User Creation Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-10 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Create Professional Account</h2>
                <p className="text-gray-400 font-medium mt-1">Manually provision internal workspace access</p>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-4 hover:bg-gray-50 rounded-2xl transition-all group"
              >
                <X className="w-6 h-6 text-gray-300 group-hover:text-gray-900" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-10 space-y-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      required
                    />
                  </div>
                </div>

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

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Initial Password</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input
                      type="text"
                      placeholder="Secure temporary password"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 text-lg"
              >
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Create User Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Revoke Access"
        message={`Are you sure you want to remove access for ${userToDelete?.email}? This will immediately terminate their ability to access any workspace tools.`}
        confirmLabel="Revoke Access"
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
        isLoading={actionLoading}
        variant="danger"
      />
    </div>
  );
};

