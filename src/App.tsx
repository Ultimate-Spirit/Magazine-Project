import { useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { Loader2, Shield } from 'lucide-react';
import { CompanySelection } from './components/CompanySelection';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { ProjectExplorer } from './components/ProjectExplorer';
import { FolderView } from './components/FolderView';
import { PageBuilder } from './components/PageBuilder';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserManagement } from './components/admin/UserManagement';
import { CompanyManagement } from './components/admin/CompanyManagement';
import { UpdatePassword } from './components/UpdatePassword';
import { ProtectedRoute } from './components/ProtectedRoute';
import type { ViewState, Company, Folder, Page } from './types';

function MainApp() {
  const [view, setView] = useState<ViewState>('company_selection');
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const { isAdmin } = useAuth();

  // Mocks for local state
  const [folders, setFolders] = useState<Folder[]>([
    { id: '1', companyId: 'c1', name: 'Q1 Reports', updatedAt: new Date().toISOString() }
  ]);
  const [pages, setPages] = useState<Page[]>([]);

  const handleCompanySelect = (company: Company) => {
    setActiveCompany(company);
    setView('project_explorer');
  };

  const handleNavigateBack = () => {
    if (view === 'page_builder') {
      setView('folder_view');
    } else if (view === 'folder_view') {
      setView('project_explorer');
    } else if (view === 'project_explorer') {
      setActiveCompany(null);
      setView('company_selection');
    }
  };

  // If admin, they should go to /admin by default, but if they are here, let them work.
  // Actually, specification says "Authenticated users with the admin role must be routed to the /admin dashboard."
  // So we handle that in the App component's root route.

  return (
    <div className="relative min-h-screen">
      <WorkspaceLayout 
        company={activeCompany || { id: 'none', name: 'Select Company' }}
        currentView={view}
        onNavigateBack={handleNavigateBack}
        onHome={() => {
          setActiveCompany(null);
          setView('company_selection');
        }}
      >
        {view === 'company_selection' && <CompanySelection onSelect={handleCompanySelect} />}
        
        {view === 'project_explorer' && activeCompany && (
          <ProjectExplorer 
            folders={folders.filter(f => f.companyId === activeCompany.id)}
            onCreateFolder={(name) => {
              const newFolder: Folder = {
                id: Date.now().toString(),
                companyId: activeCompany.id,
                name,
                updatedAt: new Date().toISOString()
              };
              setFolders([...folders, newFolder]);
            }}
            onOpenFolder={(folder) => {
              setActiveFolder(folder);
              setView('folder_view');
            }}
          />
        )}
        
        {view === 'folder_view' && activeFolder && (
          <FolderView 
            folder={activeFolder}
            pages={pages.filter(p => p.folderId === activeFolder.id)}
            onCreatePage={() => {
              setActivePage(null);
              setView('page_builder');
            }}
            onOpenPage={(page) => {
              setActivePage(page);
              setView('page_builder');
            }}
          />
        )}

        {view === 'page_builder' && activeFolder && (
          <PageBuilder 
            folder={activeFolder}
            initialPage={activePage}
            onSave={(pageData) => {
              if (activePage) {
                setPages(pages.map(p => p.id === activePage.id ? { ...p, ...pageData, updatedAt: new Date().toISOString() } as Page : p));
              } else {
                setPages([...pages, { 
                  id: Date.now().toString(), 
                  folderId: activeFolder.id, 
                  title: pageData.title || 'Untitled Page',
                  data: pageData.data || {},
                  updatedAt: new Date().toISOString(),
                  ...pageData 
                } as Page]);
              }
              setView('folder_view');
            }}
            onCancel={() => setView('folder_view')}
          />
        )}
      </WorkspaceLayout>

      {isAdmin && (
        <Link 
          to="/admin" 
          className="fixed bottom-8 right-8 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all hover:scale-110 group z-50"
          title="Admin Panel"
        >
          <Shield className="w-6 h-6" />
          <span className="absolute right-full mr-4 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Admin Console
          </span>
        </Link>
      )}
    </div>
  );
}

function RootRedirect() {
  const { isAdmin, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
    </div>
  );

  if (isAdmin) return <Navigate to="/admin" replace />;
  return <MainApp />;
}

function App() {
  const { user, loading, isAuthorized } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          <p className="text-sm text-gray-500 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user && isAuthorized ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Routes>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="companies" element={<CompanyManagement />} />
              </Route>
            </Routes>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <RootRedirect />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
