export type ViewState = 'company_selection' | 'project_explorer' | 'folder_view' | 'page_builder';

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface RolePermissions {
  can_create_folders: boolean;
  can_edit_own_folders: boolean;
  can_edit_all_folders: boolean;
  can_delete_own_folders: boolean;
  can_delete_all_folders: boolean;
  can_create_publications: boolean;
  can_edit_own_publications: boolean;
  can_edit_all_publications: boolean;
  can_delete_own_publications: boolean;
  can_delete_all_publications: boolean;
}

export interface Role {
  id: string;
  name: string;
  is_system_admin: boolean;
  permissions: RolePermissions;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  role_id?: string;
  roles?: Role;
  company_id?: string;
  full_name?: string;
  is_active?: boolean;
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface Folder {
  id: string;
  company_id: string;
  name: string;
  created_by?: string;
  updated_at: string;
}

export interface Page {
  id: string;
  folder_id: string;
  title: string;
  thumbnailUrl?: string;
  data: any;
  created_by?: string;
  updated_at: string;
}
