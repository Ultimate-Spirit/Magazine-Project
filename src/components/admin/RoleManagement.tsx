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
    // Optimistic UI update: Remove user from local profiles state immediately
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
      // Rollback on error
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
      // 1. Update user's role_id in profiles
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
                      <>
                        <button 
                          onClick={() => openEditRoleModal(role)}
                          className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-all"
                          title="Edit Permissions"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setRoleToDelete(role)}
                          className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                          title="Delete Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
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
                        <div key={p.id} className="group/badge px-3 py-1 bg-secondary rounded-lg text-xs font-medium text-foreground/70 flex items-center gap-2" title={p.email}>
                          <span className="truncate max-w-[100px]">{p.full_name || p.email.split('@')[0]}</span>
                          {p.email !== 'avessaify@gmail.com' && (
                            <button
                              onClick={() => handleRevokeRole(p.id)}
                              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover/badge:opacity-100 transition-all"
                              title="Revoke Role"
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
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (editingRoleId ? 'Save Changes' : 'Create Role')}
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
                }}
                className="p-4 hover:bg-secondary rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-muted-foreground/30" />
              </button>
            </div>

            <form onSubmit={handleAssignUser} className="p-10 space-y-10">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Select User</label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      className="w-full pl-12 pr-6 py-4 bg-secondary border border-transparent rounded-2xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-foreground"
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
                  {/* Dropdown List */}
                  {!assignUserId && (
                    <div className="absolute top-full left-0 w-full mt-2 max-h-64 overflow-y-auto bg-card border border-border/50 rounded-2xl shadow-xl z-50 p-2 space-y-1 scrollbar-thin scrollbar-thumb-border">
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
                            className="w-full flex flex-col items-start px-4 py-3 rounded-xl hover:bg-secondary/50 transition-colors text-left group"
                          >
                          <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                            {p.full_name || 'No Name'}
                          </span>
                          <span className="text-xs text-muted-foreground">{p.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
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