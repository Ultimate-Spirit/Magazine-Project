export type ViewState = 'company_selection' | 'project_explorer' | 'folder_view' | 'page_builder';

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  companyId?: string;
  fullName?: string;
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface Folder {
  id: string;
  companyId: string;
  name: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  folderId: string;
  title: string;
  thumbnailUrl?: string;
  data: any;
  updatedAt: string;
}
