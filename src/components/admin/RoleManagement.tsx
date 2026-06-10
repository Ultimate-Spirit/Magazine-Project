import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, 
  Shield, 
  Users, 
  Loader2, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  UserPlus, 
  CheckSquare, 
  Square 
} from 'lucide-react';
import type { Role, UserProfile, Company, RolePermissions } from '../../types';

const INITIAL_PERMISSIONS: RolePermissions = {
  can_create_folders: false,
  can_edit_own_folders: false,
  can_edit_all_folders: false,
  can_delete_own_folders: false,
  can_delete_all_folders: false,
  can_create_publications: false,
  can_edit_own_publications: false,
  can_edit_all_publications: false,
  can_delete_own_publications: false,
  can_delete_all_publications: false,
};

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userCompanies, setUserCompanies] = useState<{user_id: string, company_id: string}[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Create/Edit Role State
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<RolePermissions>(INITIAL_PERMISSIONS);
  
  // Assign User State
  const [assignUserId, setAssignUserId] = useState('');
  const [assignCompanyIds, setAssignCompanyIds] = useState<string[]>([]);

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [rolesRes, profilesRes, companiesRes, userCompRes] = await Promise.all([
      supabase.from('roles').select('*').order('created_at'),
      supabase.from('profiles').select('*').order('email'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('user_companies').select('*')
    ]);

    if (!rolesRes.error) {
      setRoles(rolesRes.data as Role[]);
    } else {
      console.error('Roles fetch error:', rolesRes.error);
      showNotification('error', 'Database tables missing. Please run rbac_setup.sql in your SQL Editor.');
    }
    
    if (!profilesRes.error) setProfiles(profilesRes.data as UserProfile[]);
    if (!companiesRes.error) setCompanies(companiesRes.data as Company[]);
    if (!userCompRes.error) setUserCompanies(userCompRes.data);
    setLoading(false);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateOrUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (editingRoleId) {
        // Update existing role
        const { error } = await supabase
          .from('roles')
          .update({ 
            name: newRoleName, 
            permissions: newRolePermissions 
          })
          .eq('id', editingRoleId);

        if (error) throw error;
        showNotification('success', `Role "${newRoleName}" updated successfully`);
      } else {
        // Create new role
        const { error } = await supabase
          .from('roles')
          .insert([{ 
            name: newRoleName, 
            permissions: newRolePermissions,
            is_system_admin: false 
          }]);

        if (error) throw error;
        showNotification('success', `Role "${newRoleName}" created successfully`);
      }
      
      setNewRoleName('');
      setNewRolePermissions(INITIAL_PERMISSIONS);
      setEditingRoleId(null);
      setIsRoleModalOpen(false);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditRoleModal = (role: Role) => {
    if (role.is_system_admin) return;
    setEditingRoleId(role.id);
    setNewRoleName(role.name);
    setNewRolePermissions(role.permissions);
    setIsRoleModalOpen(true);
  };

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !assignUserId) return;
    setActionLoading(true);

    try {
      // 1. Update user's role_id in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role_id: selectedRole.id })
        .eq('id', assignUserId);

      if (profileError) throw profileError;

      // 2. Wipe existing company mappings for this user and insert new ones
      await supabase.from('user_companies').delete().eq('user_id', assignUserId);
      
      if (assignCompanyIds.length > 0) {
        const { error: junctionError } = await supabase
          .from('user_companies')
          .insert(assignCompanyIds.map(cid => ({
            user_id: assignUserId,
            company_id: cid
          })));
        
        if (junctionError) throw junctionError;
      }

      showNotification('success', 'User assignment updated successfully');
      setIsAssignModalOpen(false);
      setAssignUserId('');
      setAssignCompanyIds([]);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const togglePermission = (key: keyof RolePermissions) => {
    setNewRolePermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleCompany = (id: string) => {
    setAssignCompanyIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <header className="h-24 bg-card flex items-center justify-between px-12 border-b border-border">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Access Control</h1>
        
        <button 
          onClick={() => setIsRoleModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Role
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-12 pb-12 pt-12">
        {notification && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {roles.map((role) => (
            <div key={role.id} className="bg-card border border-border rounded-[2.5rem] p-10 flex flex-col justify-between transition-all group">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-4 rounded-2xl ${role.is_system_admin ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    {!role.is_system_admin && (
                      <button 
                        onClick={() => openEditRoleModal(role)}
                        className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-all"
                        title="Edit Permissions"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {role.is_system_admin && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full border border-primary/10">Immutable</span>
                    )}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-foreground mb-2">{role.name}</h3>
                <p className="text-sm text-muted-foreground mb-8">
                  {role.is_system_admin ? 'Full system authority with global override.' : 'Custom scoped access configuration.'}
                </p>

                <div className="space-y-3 mb-10">
                  <div className="flex items-center gap-3 text-muted-foreground/40">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Assigned Members</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profiles.filter(p => p.role_id === role.id).length === 0 ? (
                      <span className="text-xs text-muted-foreground/30 italic">No users assigned</span>
                    ) : (
                      profiles.filter(p => p.role_id === role.id).map(p => (
                        <div key={p.id} className="px-3 py-1 bg-secondary rounded-lg text-xs font-medium text-foreground/70" title={p.email}>
                          {p.full_name || p.email.split('@')[0]}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setSelectedRole(role);
                  setIsAssignModalOpen(true);
                  // Pre-fill user selection if needed, or just let them pick
                }}
                className="w-full flex items-center justify-center gap-2 py-4 bg-secondary text-foreground font-bold rounded-2xl hover:bg-muted transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Assign User
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Create/Edit Role Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-card rounded-[2.5rem] border border-border w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-foreground tracking-tight">
                  {editingRoleId ? 'Refine Role Identity' : 'Create Custom Role'}
                </h2>
                <p className="text-muted-foreground font-medium mt-1">
                  {editingRoleId ? 'Adjust specific access parameters for this group' : 'Define specific permissions for this identity'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setEditingRoleId(null);
                  setNewRoleName('');
                  setNewRolePermissions(INITIAL_PERMISSIONS);
                }}
                className="p-4 hover:bg-secondary rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-muted-foreground/30" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateRole} className="p-10 space-y-10">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Role Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Regional Manager"
                  className="w-full px-6 py-4 bg-secondary border-transparent rounded-2xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-foreground"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    Folder Authority
                  </h4>
                  <div className="space-y-4">
                    {[
                      { key: 'can_create_folders', label: 'Can Create Folders' },
                      { key: 'can_edit_own_folders', label: 'Can Edit or Rename OWN Folders' },
                      { key: 'can_edit_all_folders', label: 'Can Edit or Rename ALL Folders' },
                      { key: 'can_delete_own_folders', label: 'Can Delete OWN Folders' },
                      { key: 'can_delete_all_folders', label: 'Can Delete ALL Folders' },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => togglePermission(t.key as any)}
                        className="flex items-center gap-3 w-full text-left group"
                      >
                        {newRolePermissions[t.key as keyof RolePermissions] ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground/30 group-hover:text-muted-foreground/50" />
                        )}
                        <span className={`text-sm font-bold ${newRolePermissions[t.key as keyof RolePermissions] ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" />
                    Publication Authority
                  </h4>
                  <div className="space-y-4">
                    {[
                      { key: 'can_create_publications', label: 'Can Create Publications' },
                      { key: 'can_edit_own_publications', label: 'Can Edit OWN Publications' },
                      { key: 'can_edit_all_publications', label: 'Can Edit ALL Publications' },
                      { key: 'can_delete_own_publications', label: 'Can Delete OWN Publications' },
                      { key: 'can_delete_all_publications', label: 'Can Delete ALL Publications' },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => togglePermission(t.key as any)}
                        className="flex items-center gap-3 w-full text-left group"
                      >
                        {newRolePermissions[t.key as keyof RolePermissions] ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground/30 group-hover:text-muted-foreground/50" />
                        )}
                        <span className={`text-sm font-bold ${newRolePermissions[t.key as keyof RolePermissions] ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-5 bg-primary text-primary-foreground font-bold rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-lg"
              >
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (editingRoleId ? 'Commit Updates' : 'Instantiate Role')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {isAssignModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-card rounded-[2.5rem] border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-foreground tracking-tight">Assign Identity</h2>
                <p className="text-muted-foreground font-medium mt-1">Mapping to "{selectedRole.name}"</p>
              </div>
              <button 
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssignUserId('');
                  setAssignCompanyIds([]);
                }}
                className="p-4 hover:bg-secondary rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-muted-foreground/30" />
              </button>
            </div>

            <form onSubmit={handleAssignUser} className="p-10 space-y-10">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Select User</label>
                <select 
                  className="w-full px-6 py-4 bg-secondary border-transparent rounded-2xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-foreground appearance-none"
                  value={assignUserId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    setAssignUserId(uid);
                    // Pre-fill existing company assignments for this user
                    setAssignCompanyIds(userCompanies.filter(uc => uc.user_id === uid).map(uc => uc.company_id));
                  }}
                  required
                >
                  <option value="">Choose a member...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.email} ({p.full_name || 'No Name'})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Workspace Authorization</label>
                <div className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border">
                  {companies.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCompany(c.id)}
                      className="flex items-center gap-3 w-full text-left p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-all group"
                    >
                      {assignCompanyIds.includes(c.id) ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground/30" />
                      )}
                      <span className={`text-sm font-bold ${assignCompanyIds.includes(c.id) ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading || !assignUserId}
                className="w-full py-5 bg-primary text-primary-foreground font-bold rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-lg"
              >
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Assignment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
