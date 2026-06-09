export type ViewState = 'company_selection' | 'project_explorer' | 'folder_view' | 'page_builder';

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
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
  updated_at: string;
}

export interface Page {
  id: string;
  folder_id: string;
  title: string;
  thumbnailUrl?: string;
  data: any;
  updated_at: string;
}
