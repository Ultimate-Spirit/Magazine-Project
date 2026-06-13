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
  Square,
  Edit2,
  Trash2,
  Search
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import type { Role, UserProfile, RolePermissions } from '../../types';

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
  const [userSearchTerm, setUserSearchTerm] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Delete Role State
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [rolesRes, profilesRes] = await Promise.all([
      supabase.from('roles').select('*').order('created_at'),
      supabase.from('profiles').select('*').order('email')
    ]);

    if (!rolesRes.error) {
      setRoles(rolesRes.data as Role[]);
    } else {
      console.error('Roles fetch error:', rolesRes.error);
      showNotification('error', 'Database tables missing. Please run rbac_setup.sql in your SQL Editor.');
    }
    
    if (!profilesRes.error) setProfiles(profilesRes.data as UserProfile[]);
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

  const handleRevokeRole = async (userId: string) => {
    // Optimistic UI update
    const previousProfiles = [...profiles];
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role_id: undefined } : p));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role_id: null,
          role: null
        })
        .eq('id', userId);

      if (error) throw error;
      showNotification('success', 'User role revoked successfully');
    } catch (err: any) {
      setProfiles(previousProfiles);
      showNotification('error', `Revocation failed: ${err.message}`);
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
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role_id: selectedRole.id })
        .eq('id', assignUserId);

      if (profileError) throw profileError;

      showNotification('success', 'User assignment updated successfully');
      setIsAssignModalOpen(false);
      setAssignUserId('');
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setActionLoading(true);
    try {
      if (roleToDelete.is_system_admin) throw new Error('Cannot delete system administrator role.');
      
      const { error } = await supabase.from('roles').delete().eq('id', roleToDelete.id);
      if (error) throw error;
      
      showNotification('success', `Role "${roleToDelete.name}" deleted successfully.`);
      setRoleToDelete(null);
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background font-sans">
      <header className="h-20 lg:h-24 bg-card/30 backdrop-blur-md flex items-center justify-between px-4 lg:px-12 faint-divider shrink-0 z-10">
        <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight leading-none">Access Control</h1>
        
        <button 
          onClick={() => setIsRoleModalOpen(true)}
          className="flex items-center gap-2 px-4 lg:px-6 py-3 bg-primary text-primary-foreground font-black rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 uppercase tracking-widest text-[9px] lg:text-[10px]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Role</span>
          <span className="sm:hidden">New</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-2 lg:px-6 pb-12 pt-6 lg:pt-8 w-full max-w-full">
        {notification && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-8">
          {roles.map((role) => (
            <div key={role.id} className="bento-card micro-surface micro-surface-hover flex flex-col justify-between min-h-[380px] lg:min-h-[400px] border-border/20 hover:border-primary/30 group p-4 lg:p-10">
              <div>
                <div className="flex items-center justify-between mb-6 lg:mb-8">
                  <div className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl ${role.is_system_admin ? 'bg-primary/5 text-primary' : 'bg-secondary text-muted-foreground/40'}`}>
                    <Shield className="w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    {!role.is_system_admin && (
                      <>
                        <button 
                          onClick={() => openEditRoleModal(role)}
                          className="p-2.5 hover:bg-secondary rounded-xl text-muted-foreground/40 hover:text-primary transition-all"
                          title="Edit Permissions"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setRoleToDelete(role)}
                          className="p-2.5 hover:bg-destructive/10 rounded-xl text-muted-foreground/40 hover:text-destructive transition-all"
                          title="Delete Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {role.is_system_admin && (
                      <span className="text-[8px] lg:text-[10px] font-black text-primary uppercase tracking-[0.2em] micro-surface px-3 py-1.5 rounded-full border border-primary/10">Immutable</span>
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl lg:text-2xl font-black text-foreground mb-1 lg:mb-2 tracking-tight">{role.name}</h3>
                <p className="text-[10px] lg:text-sm text-muted-foreground/60 leading-relaxed mb-8 lg:mb-10">
                  {role.is_system_admin ? 'Full system authority with global override.' : 'Custom scoped access configuration.'}
                </p>

                <div className="space-y-3 lg:space-y-4 mb-8 lg:mb-10">
                  <div className="flex items-center gap-3 text-muted-foreground/30">
                    <Users className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em]">Assigned Members</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profiles.filter(p => p.role_id === role.id).length === 0 ? (
                      <span className="text-[9px] lg:text-[10px] text-muted-foreground/20 font-bold uppercase tracking-widest italic">No identities assigned</span>
                    ) : (
                      profiles.filter(p => p.role_id === role.id).map(p => (
                        <div key={p.id} className="group/badge px-3 py-1.5 micro-surface rounded-lg text-[9px] lg:text-[10px] font-bold text-foreground/80 flex items-center gap-2 border border-border/5" title={p.email}>
                          <span className="truncate max-w-[100px] lg:max-w-[120px]">{p.full_name || p.email.split('@')[0]}</span>
                          {p.email !== 'avessaify@gmail.com' && (
                            <button
                              onClick={() => handleRevokeRole(p.id)}
                              className="w-3.5 h-3.5 lg:w-4 lg:h-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover/badge:opacity-100 transition-all"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
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
                }}
                className="w-full flex items-center justify-center gap-3 py-3 lg:py-4 micro-surface text-foreground font-black rounded-xl lg:rounded-2xl hover:bg-secondary transition-all uppercase tracking-widest text-[9px] lg:text-[10px] border border-border/10"
              >
                <UserPlus className="w-4 h-4 text-muted-foreground/40" />
                Assign User
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Create/Edit Role Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 lg:p-6">
          <div className="bg-card rounded-[2.5rem] border border-border w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 lg:p-10 border-b border-border/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">
                  {editingRoleId ? 'Refine Identity' : 'New Custom Role'}
                </h2>
                <p className="text-muted-foreground/60 font-medium mt-1 text-sm lg:text-base">
                  {editingRoleId ? 'Adjust group access parameters' : 'Define specific identity permissions'}
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

            <form onSubmit={handleCreateOrUpdateRole} className="p-8 lg:p-10 space-y-8 lg:space-y-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-1">Role Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Regional Manager"
                  className="w-full px-6 py-4 micro-surface border border-border/10 rounded-2xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-black text-foreground text-sm tracking-tight"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-10">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    Folder Authority
                  </h4>
                  <div className="space-y-4">
                    {[
                      { key: 'can_create_folders', label: 'Can Create Folders' },
                      { key: 'can_edit_own_folders', label: 'Can Edit OWN Folders' },
                      { key: 'can_edit_all_folders', label: 'Can Edit ALL Folders' },
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
                          <Square className="w-5 h-5 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                        )}
                        <span className={`text-xs font-bold ${newRolePermissions[t.key as keyof RolePermissions] ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" />
                    Page Authority
                  </h4>
                  <div className="space-y-4">
                    {[
                      { key: 'can_create_publications', label: 'Can Create Pages' },
                      { key: 'can_edit_own_publications', label: 'Can Edit OWN Pages' },
                      { key: 'can_edit_all_publications', label: 'Can Edit ALL Pages' },
                      { key: 'can_delete_own_publications', label: 'Can Delete OWN Pages' },
                      { key: 'can_delete_all_publications', label: 'Can Delete ALL Pages' },
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
                          <Square className="w-5 h-5 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                        )}
                        <span className={`text-xs font-bold ${newRolePermissions[t.key as keyof RolePermissions] ? 'text-foreground' : 'text-muted-foreground/40'}`}>
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
                className="w-full py-5 bg-primary text-primary-foreground font-black rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-[10px] lg:text-[11px] uppercase tracking-[0.2em]"
              >
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (editingRoleId ? 'Update Group' : 'Initialize Role')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {isAssignModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 lg:p-6">
          <div className="bg-card rounded-[2.5rem] border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="p-10 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-foreground tracking-tight">Assign Identity</h2>
                <p className="text-muted-foreground/60 font-medium mt-1 text-sm">Mapping to "{selectedRole.name}"</p>
              </div>
              <button 
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssignUserId('');
                }}
                className="p-4 hover:bg-secondary rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-muted-foreground/30" />
              </button>
            </div>

            <form onSubmit={handleAssignUser} className="p-10 pb-12 space-y-8 flex flex-col max-h-[70vh]">
              <div className="space-y-2 flex-shrink-0">
                <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-1">Select User</label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      className="w-full pl-12 pr-6 py-4 micro-surface border border-border/10 rounded-2xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-foreground text-sm"
                      value={assignUserId ? (profiles.find(p => p.id === assignUserId)?.email || '') : userSearchTerm}
                      onChange={(e) => {
                        setAssignUserId('');
                        setUserSearchTerm(e.target.value);
                      }}
                      onClick={() => {
                        setAssignUserId('');
                        setUserSearchTerm('');
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Dropdown List */}
              {!assignUserId && (
                <div className="flex-1 min-h-0">
                  <div className="h-full max-h-[300px] overflow-y-auto micro-scrollbar bg-black/5 dark:bg-white/5 border border-border/5 rounded-2xl p-2 space-y-1">
                    {profiles
                      .filter(p => p.email.toLowerCase().includes(userSearchTerm.toLowerCase()) || (p.full_name?.toLowerCase() || '').includes(userSearchTerm.toLowerCase()))
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                             setAssignUserId(p.id);
                             setUserSearchTerm('');
                          }}
                          className="w-full flex flex-col items-start px-4 py-3 rounded-xl micro-surface-hover transition-colors text-left group"
                        >
                        <span className="font-black text-foreground text-sm group-hover:text-primary transition-colors tracking-tight">
                          {p.full_name || 'No Name'}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground/60">{p.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading || !assignUserId}
                className="w-full py-5 bg-primary text-primary-foreground font-black rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] flex-shrink-0 mt-8"
              >
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Assignment'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!roleToDelete}
        title="Delete Role"
        message={`Are you sure you want to permanently delete the "${roleToDelete?.name}" role? Users assigned to this role will lose their custom permissions.`}
        confirmLabel="Delete Role"
        onConfirm={handleConfirmDeleteRole}
        onCancel={() => setRoleToDelete(null)}
        isLoading={actionLoading}
        variant="danger"
      />
    </div>
  );
};
