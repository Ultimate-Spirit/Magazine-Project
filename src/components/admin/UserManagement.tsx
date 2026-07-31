import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, 
  Mail, 
  Loader2, 
  Search, 
  X, 
  CheckCircle2, 
  User, 
  Lock, 
  Edit2, 
  ShieldAlert, 
  Shield, 
  Building2, 
  Search as SearchIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import type { Company, UserProfile, Role } from '../../types';

export const UserManagement: React.FC = () => {
  const { profile: currentAdmin } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userCompanies, setUserCompanies] = useState<{user_id: string, company_id: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [workspaceSearchTerm, setWorkspaceSearchTerm] = useState('');

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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Parallel primary fetch for immediate UI population
      const [profilesRes, companiesRes, rolesRes, userCompRes] = await Promise.all([
        supabase.from('profiles').select('*, roles(*)').order('email'),
        supabase.from('companies').select('*').order('name'),
        supabase.from('roles').select('*').order('created_at'),
        supabase.from('user_companies').select('*')
      ]);

      if (!profilesRes.error && profilesRes.data) {
        setProfiles(profilesRes.data as UserProfile[]);
      } else if (profilesRes.error) {
        console.warn('Roles join failed, attempting raw profile fetch...');
        const rawProfiles = await supabase.from('profiles').select('*').order('email');
        if (!rawProfiles.error && rawProfiles.data) {
          setProfiles(rawProfiles.data as UserProfile[]);
        }
      }

      if (!companiesRes.error) setCompanies(companiesRes.data as Company[]);
      if (!rolesRes.error) setRoles(rolesRes.data as Role[]);
      if (!userCompRes.error) setUserCompanies(userCompRes.data);

      // Non-blocking background sync for secure metadata (Joined dates)
      if (session) {
        fetch('/_/backend/list-users-unified', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setProfiles(data as UserProfile[]);
          }
        })
        .catch(err => console.warn('Background sync deferred:', err));
      }

    } catch (err) {
      console.error('Fetch Hierarchy Error:', err);
    } finally {
      setLoading(false);
    }
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
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/_/backend/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ 
            email: newUserEmail, 
            password: newUserPassword,
            full_name: newUserName,
            role: 'viewer' // Default unassigned global role
          })
        });

        const edgeData = await response.json();

        if (!response.ok) throw new Error(edgeData.detail || 'Failed to create user account.');
        
        // Ensure the profile is populated in case the database trigger lags or fails.
        // We attempt to call our robust RPC if the edge function returned the new user's ID.
        const createdUserId = edgeData?.user?.id || edgeData?.id;
        if (createdUserId) {
          await supabase.rpc('force_create_profile', {
            target_user_id: createdUserId,
            target_email: newUserEmail,
            target_full_name: newUserName
          });
        }
        
        showNotification('success', edgeData?.message || `Account created for ${newUserEmail}`);
      }

      await logActivity('invited', 'user', newUserEmail, null, currentAdmin?.id || '');

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
    setEditIsActive(p.is_active !== false);
    setEditName(p.full_name || '');
    setEditEmail(p.email || '');
    setEditRoleId(p.role_id || '');
    const assigned = userCompanies.filter(uc => uc.user_id === p.id).map(uc => uc.company_id);
    setEditCompanyIds(assigned);
    setWorkspaceSearchTerm('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setActionLoading(true);

    try {
      // 1. If email changed, call the backend to update auth.users
      if (editEmail !== userToEdit.email) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/_/backend/update-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            target_user_id: userToEdit.id,
            email: editEmail
          })
        });

        const edgeData = await response.json();

        if (!response.ok) throw new Error(edgeData.detail || 'Failed to update email.');
      }

      // Check if selected role is system admin
      const selectedRoleObj = roles.find(r => r.id === editRoleId);
      const isSysAdmin = selectedRoleObj?.is_system_admin === true;

      // Execute UPDATE query against profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName,
          is_active: editIsActive,
          role_id: editRoleId || null,
          role: editRoleId ? undefined : null // Legacy support
        })
        .eq('id', userToEdit.id);

      if (error) throw error;

      // If they are made a system admin, auto-assign all companies
      if (isSysAdmin) {
        const allCompanyIds = companies.map(c => c.id);
        const existingLinks = userCompanies.filter(uc => uc.user_id === userToEdit.id).map(uc => uc.company_id);
        const toAdd = allCompanyIds.filter(id => !existingLinks.includes(id));
        
        if (toAdd.length > 0) {
          const inserts = toAdd.map(cid => ({ user_id: userToEdit.id, company_id: cid }));
          const { error: insertErr } = await supabase.from('user_companies').insert(inserts);
          if (insertErr) throw insertErr;
        }
      }

      await logActivity('updated', 'user', editEmail, companies[0]?.id || '', currentAdmin?.id || '');

      showNotification('success', `Updated profile for ${editEmail}`);
      setUserToEdit(null);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddWorkspace = async (companyId: string) => {
    if (!userToEdit) return;
    try {
      const { error } = await supabase
        .from('user_companies')
        .insert({ user_id: userToEdit.id, company_id: companyId });
      
      if (error) throw error;
      
      // Optimistic Update
      setEditCompanyIds(prev => [...prev, companyId]);
      setUserCompanies(prev => [...prev, { user_id: userToEdit.id, company_id: companyId }]);
      showNotification('success', 'Workspace access granted');
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleRemoveWorkspace = async (companyId: string) => {
    if (!userToEdit) return;
    try {
      const { error } = await supabase
        .from('user_companies')
        .delete()
        .eq('user_id', userToEdit.id)
        .eq('company_id', companyId);
      
      if (error) throw error;
      
      // Optimistic Update
      setEditCompanyIds(prev => prev.filter(id => id !== companyId));
      setUserCompanies(prev => prev.filter(uc => !(uc.user_id === userToEdit.id && uc.company_id === companyId)));
      showNotification('success', 'Workspace access revoked');
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRoleObj = roles.find(r => r.id === editRoleId);
  const isCurrentlySysAdmin = selectedRoleObj?.is_system_admin === true;
  
  // If system admin, they get all companies visually locked
  const activeCompanyIds = isCurrentlySysAdmin ? companies.map(c => c.id) : editCompanyIds;

  const assignedCompanies = companies.filter(c => activeCompanyIds.includes(c.id));
  const unassignedCompanies = companies.filter(c => 
    !activeCompanyIds.includes(c.id) && 
    c.name.toLowerCase().includes(workspaceSearchTerm.toLowerCase())
  );


  const getAssignedCompaniesForUser = (userId: string) => {
    const mapping = userCompanies.filter(uc => uc.user_id === userId);
    return mapping.map(m => companies.find(c => c.id === m.company_id)).filter(Boolean) as Company[];
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      <header className="h-14 bg-card/30 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 faint-divider shrink-0 z-10">
        <h1 className="text-lg font-semibold text-foreground tracking-tight leading-none">User Accounts</h1>
        
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input 
              type="text" 
              placeholder="Search..."
              className="h-8 pl-9 pr-3 micro-surface border border-border/50 rounded-lg focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all w-48 lg:w-64 text-xs font-medium text-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsUserModalOpen(true)}
            className="flex items-center gap-2 h-8 px-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all border border-border/50 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-2 lg:px-6 py-4 w-full max-w-full">
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
          <div className="bg-card rounded-[2rem] border border-border overflow-hidden w-full">
            <div className="w-full overflow-x-auto block invisible-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[800px] lg:min-w-0">
                <thead>
                  <tr className="faint-divider">
                    <th className="w-[30%] px-3 py-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">Identity</th>
                    <th className="w-[20%] px-3 py-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">Global Role</th>
                    <th className="w-[25%] px-3 py-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">Workspace Access</th>
                    <th className="w-[15%] px-3 py-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">Account Status</th>
                    <th className="w-[10%] px-3 py-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {filteredProfiles.map((p) => {
                    const assigned = getAssignedCompaniesForUser(p.id);
                    return (
                      <tr key={p.id} className="group micro-surface-hover cursor-pointer transition-colors duration-300 text-xs" onClick={() => openEditPanel(p)}>
                        <td className="px-3 py-2 overflow-hidden whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${p.is_active === false ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                              {(p.email?.[0] || 'U').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className={`font-medium text-xs truncate ${p.is_active === false ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{p.full_name || 'No Name'}</p>
                              <p className="text-[10px] text-muted-foreground/60 tracking-wide truncate">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[10px] font-medium tracking-wide ${p.roles?.is_system_admin ? 'bg-primary/5 text-primary border-primary/20' : 'micro-surface border-border/10 text-muted-foreground'}`}>
                            <Shield className="w-3 h-3" />
                            {p.roles?.name || 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="flex -space-x-2 overflow-hidden shrink-0">
                              {assigned.slice(0, 3).map((c, i) => (
                                <div key={c.id} className="inline-block h-6 w-6 rounded-full border border-card micro-surface overflow-hidden" style={{ zIndex: 10 - i }}>
                                  {c.logoUrl ? (
                                    <div className="bg-white/90 p-1 rounded-md h-full w-full">
                                      <img src={c.logoUrl} alt="" className="h-full w-full object-contain" />
                                    </div>
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                                      {(c.name?.substring(0, 2) || 'CO').toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {assigned.length > 3 && (
                                <div className="flex items-center justify-center h-6 w-6 rounded-full border border-card micro-surface text-[8px] font-medium text-muted-foreground z-0">
                                  +{assigned.length - 3}
                                </div>
                              )}
                            </div>
                            <div className="text-left shrink-0">
                              <span className="text-[10px] font-medium text-foreground block">
                                {assigned.length} {assigned.length === 1 ? 'WS' : 'WS'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {p.is_active === false ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium tracking-wide bg-destructive/5 text-destructive border-destructive/10">
                              <ShieldAlert className="w-3 h-3" />
                              Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium tracking-wide bg-emerald-500/5 text-emerald-500 border-emerald-500/10">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEditPanel(p); }}
                            className="p-1.5 text-muted-foreground/40 hover:text-primary micro-surface-hover rounded transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* User Creation Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 lg:p-6">
          <div className="bg-card rounded-xl shadow-none w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-border/50">
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight">Provision Identity</h2>
                <p className="text-muted-foreground mt-1 text-xs">Grant internal platform access</p>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-all group"
              >
                <X className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      className="w-full h-8 pl-9 pr-3 micro-surface border border-border/50 rounded-lg focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium text-foreground"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-1">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <input
                      type="email"
                      placeholder="colleague@organization.com"
                      className="w-full h-8 pl-9 pr-3 micro-surface border border-border/50 rounded-lg focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium text-foreground"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <input
                      type="text"
                      placeholder="Secure temporary password"
                      className="w-full h-8 pl-9 pr-3 micro-surface border border-border/50 rounded-lg focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium text-foreground"
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
                className="w-full h-9 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all border border-border/50 flex items-center justify-center gap-2 text-xs"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Provisioning'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Slide-out Profile Panel */}
      {userToEdit && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md z-50 flex justify-end">
          <div className="w-full max-w-md bg-card border-l border-border/50 h-full shadow-none flex flex-col animate-in slide-in-from-right duration-500">
            <div className="p-5 border-b border-border/50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight leading-none">Identity Profile</h2>
                <p className="text-muted-foreground mt-1 text-xs">{userToEdit.email}</p>
              </div>
              <button 
                onClick={() => setUserToEdit(null)}
                className="p-2 micro-surface rounded-lg hover:text-foreground transition-all group border border-border/50"
              >
                <X className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto invisible-scrollbar">
              <form id="edit-user-form" onSubmit={handleUpdateUser} className="p-5 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <User className="w-3 h-3" />
                    Identity
                  </h4>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-1">Full Name</label>
                    <input
                      type="text"
                      className="w-full h-8 px-3 micro-surface border border-border/50 rounded-lg focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium text-foreground"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Global Role Assignment */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Authority Level
                  </h4>
                  <div className="relative">
                    <select 
                      className="w-full h-8 pl-3 pr-8 micro-surface border border-border/50 rounded-lg focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium text-foreground appearance-none"
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

                {/* Workspace Access - Hybrid UI */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    Workspace Access
                  </h4>
                  
                  {/* Active Chips */}
                  <div className="flex flex-wrap gap-2">
                    {assignedCompanies.map(c => (
                      <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary border border-primary/10 rounded-full group/chip animate-in zoom-in-95 duration-200">
                        <span className="text-[10px] font-black uppercase tracking-tight">{c.name}</span>
                        {!isCurrentlySysAdmin && (
                          <button 
                            type="button"
                            onClick={() => handleRemoveWorkspace(c.id)}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                    {assignedCompanies.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest italic">No workspaces authorized.</p>
                    )}
                  </div>

                  {/* Selector */}
                  {!isCurrentlySysAdmin && (
                    <div className="space-y-4 pt-2">
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
                        <input 
                          type="text"
                          placeholder="Search unassigned..."
                          className="w-full h-8 pl-9 pr-3 micro-surface border border-border/50 rounded-lg text-xs font-medium outline-none focus:bg-card focus:border-primary/30 transition-all placeholder:text-muted-foreground/30"
                          value={workspaceSearchTerm}
                          onChange={(e) => setWorkspaceSearchTerm(e.target.value)}
                        />
                      </div>

                      <div className="h-40 overflow-y-auto border border-border/5 rounded-xl bg-black/5 dark:bg-white/5 invisible-scrollbar">
                        <div className="p-2 space-y-1">
                          {unassignedCompanies.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleAddWorkspace(c.id)}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg micro-surface-hover transition-colors group text-left"
                            >
                              <span className="text-[11px] font-black text-foreground/70 group-hover:text-primary tracking-tight">{c.name}</span>
                              <Plus size={12} className="text-muted-foreground/30 group-hover:text-primary" />
                            </button>
                          ))}
                          {unassignedCompanies.length === 0 && (
                            <p className="text-[9px] font-black text-muted-foreground/20 text-center py-12 uppercase tracking-widest">All available environments assigned.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Account Status */}
                <div className="p-4 micro-surface rounded-xl border border-border/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-xs">Account Status</h3>
                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                      {editIsActive ? 'Active and authorized.' : 'Blocked from accessing.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(!editIsActive)}
                    disabled={userToEdit?.email === 'avessaify@gmail.com'}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                      editIsActive ? 'bg-primary' : 'bg-secondary-foreground/20'
                    } ${userToEdit?.email === 'avessaify@gmail.com' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card transition-transform ${
                        editIsActive ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-border/50 bg-card shrink-0">
              <button
                type="submit"
                form="edit-user-form"
                disabled={actionLoading}
                className="w-full h-9 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs border border-border/50"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Configurations'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
