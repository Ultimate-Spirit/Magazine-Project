import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Mail, Loader2, Search, X, CheckCircle2, User, Lock, Edit2, ShieldAlert, Shield, Building2, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import type { Company, UserProfile, Role } from '../../types';

export const UserManagement: React.FC = () => {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userCompanies, setUserCompanies] = useState<{user_id: string, company_id: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Creation Form states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  
  // Edit Form states (Slide-out)
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoleId, setEditRoleId] = useState<string>('');
  const [editCompanyIds, setEditCompanyIds] = useState<string[]>([]);

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, companiesRes, rolesRes, userCompRes] = await Promise.all([
      supabase.from('profiles').select('*').order('email'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('roles').select('*').order('created_at'),
      supabase.from('user_companies').select('*')
    ]);

    if (!profilesRes.error) setProfiles(profilesRes.data as UserProfile[]);
    if (!companiesRes.error) setCompanies(companiesRes.data as Company[]);
    if (!rolesRes.error) setRoles(rolesRes.data as Role[]);
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
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUserEmail)
        .single();

      if (existingUser) {
        showNotification('error', `A user with email ${newUserEmail} already exists.`);
      } else {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-user', {
          body: { 
            email: newUserEmail, 
            password: newUserPassword,
            full_name: newUserName
          }
        });

        if (edgeError) throw new Error(edgeError.message || 'Failed to create user account.');
        if (edgeData?.error) throw new Error(edgeData.error);
        
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

  const openEditPanel = (p: UserProfile) => {
    setUserToEdit(p);
    setEditIsActive(p.is_active !== false); // Default to true if undefined
    setEditName(p.full_name || '');
    setEditEmail(p.email || '');
    setEditRoleId(p.role_id || '');
    setEditCompanyIds(userCompanies.filter(uc => uc.user_id === p.id).map(uc => uc.company_id));
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setActionLoading(true);

    try {
      if (editEmail !== userToEdit.email) {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('update-user', {
          body: {
            target_user_id: userToEdit.id,
            email: editEmail
          }
        });

        if (edgeError) throw new Error(edgeError.message || 'Failed to update email.');
        if (edgeData?.error) throw new Error(edgeData.error);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName,
          email: editEmail,
          is_active: editIsActive,
          role_id: editRoleId || null,
          role: editRoleId ? undefined : null // Revoke legacy role if unassigned
        })
        .eq('id', userToEdit.id);

      if (error) throw error;

      await supabase.from('user_companies').delete().eq('user_id', userToEdit.id);
      
      if (editCompanyIds.length > 0) {
        const { error: junctionError } = await supabase
          .from('user_companies')
          .insert(editCompanyIds.map(cid => ({
            user_id: userToEdit.id,
            company_id: cid
          })));
        if (junctionError) throw junctionError;
      }

      await logActivity('updated', 'user', editEmail, companies[0]?.id || '', profile?.id || '');

      showNotification('success', `Updated profile for ${editEmail}`);
      setUserToEdit(null);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCompany = (id: string) => {
    setEditCompanyIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const filteredProfiles = profiles.filter(p =>
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <header className="h-24 bg-card flex items-center justify-between px-12 border-b border-border">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">User Management</h1>
        
        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
            <input 
              type="text" 
              placeholder="Search users..."
              className="pl-11 pr-6 py-3 bg-secondary border-transparent rounded-xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all w-72 text-sm font-medium text-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsUserModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-12 pb-12 pt-12">
        {notification && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-[2rem] border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/80 border-b border-border">
                  <th className="px-8 py-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Identity</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProfiles.map((p) => (
                  <tr key={p.id} className="group hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => openEditPanel(p)}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${p.is_active === false ? 'bg-secondary text-muted-foreground' : 'bg-secondary text-primary'}`}>
                          {p.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-bold ${p.is_active === false ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{p.full_name || 'No Name'}</p>
                          <p className="text-sm text-muted-foreground font-medium">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {p.is_active === false ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive">
                          <ShieldAlert className="w-3 h-3" />
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEditPanel(p); }}
                        className="p-3 text-muted-foreground hover:text-primary hover:bg-secondary rounded-xl transition-all"
                      >
                        <Edit2 className="w-5 h-5" />
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-card rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-border">
            <div className="p-10 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-foreground tracking-tight">Create Professional Account</h2>
                <p className="text-muted-foreground font-medium mt-1">Manually provision internal workspace access</p>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-4 hover:bg-secondary rounded-2xl transition-all group"
              >
                <X className="w-6 h-6 text-muted-foreground/30 group-hover:text-foreground" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-10 space-y-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30" />
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      className="w-full pl-14 pr-6 py-4 bg-secondary border-transparent rounded-2xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-foreground"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Identity (Email)</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30" />
                    <input
                      type="email"
                      placeholder="colleague@organization.com"
                      className="w-full pl-14 pr-6 py-4 bg-secondary border-transparent rounded-2xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-foreground"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Initial Password</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30" />
                    <input
                      type="text"
                      placeholder="Secure temporary password"
                      className="w-full pl-14 pr-6 py-4 bg-secondary border-transparent rounded-2xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-foreground"
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
                className="w-full py-5 bg-primary text-primary-foreground font-bold rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xl shadow-primary/10 flex items-center justify-center gap-3 text-lg"
              >
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Create User Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Slide-out Profile Panel */}
      {userToEdit && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex justify-end">
          <div className="w-full max-w-md bg-card border-l border-border h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Identity Profile</h2>
                <p className="text-muted-foreground font-medium mt-1 text-sm">{userToEdit.email}</p>
              </div>
              <button 
                onClick={() => setUserToEdit(null)}
                className="p-3 hover:bg-secondary rounded-xl transition-all group"
              >
                <X className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <form id="edit-user-form" onSubmit={handleUpdateUser} className="p-8 space-y-10">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="text"
                        className="w-full pl-11 pr-4 py-3 bg-secondary border border-transparent rounded-xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-foreground text-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="email"
                        className="w-full pl-11 pr-4 py-3 bg-secondary border border-transparent rounded-xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-foreground text-sm"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Global Role Assignment */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Global Role
                  </h4>
                  <div className="relative">
                    <select 
                      className="w-full pl-4 pr-10 py-3 bg-secondary border border-transparent rounded-xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-foreground text-sm appearance-none"
                      value={editRoleId}
                      onChange={(e) => setEditRoleId(e.target.value)}
                      disabled={userToEdit?.email === 'avessaify@gmail.com'}
                    >
                      <option value="">No Global Role Assigned</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name} {r.is_system_admin ? '(Immutable)' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Workspace Access */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    Workspace Access
                  </h4>
                  <div className="space-y-2">
                    {companies.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCompany(c.id)}
                        className="flex items-center gap-3 w-full text-left p-3 bg-secondary/50 rounded-xl hover:bg-secondary transition-all group border border-transparent hover:border-border/50"
                      >
                        {editCompanyIds.includes(c.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/50" />
                        )}
                        <span className={`text-sm font-bold ${editCompanyIds.includes(c.id) ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                          {c.name}
                        </span>
                      </button>
                    ))}
                    {companies.length === 0 && (
                      <p className="text-sm text-muted-foreground/50 italic py-4">No active workspaces available.</p>
                    )}
                  </div>
                </div>

                {/* Account Status */}
                <div className="p-5 bg-secondary/50 rounded-2xl border border-border/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Account Status</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {editIsActive ? 'Active and authorized.' : 'Blocked from accessing.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(!editIsActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      editIsActive ? 'bg-primary' : 'bg-secondary-foreground/20'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
                        editIsActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </form>
            </div>

            <div className="p-8 border-t border-border bg-card shrink-0">
              <button
                type="submit"
                form="edit-user-form"
                disabled={actionLoading}
                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Configurations'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
