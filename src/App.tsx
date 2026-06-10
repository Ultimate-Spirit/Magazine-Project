import { useState, useCallback } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Loader2, Shield } from 'lucide-react';
import { CompanySelection } from './components/CompanySelection';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { FoldersView } from './components/FoldersView';
import { FolderContents } from './components/FolderContents';
import { MagazineEditor } from './components/MagazineEditor';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserManagement } from './components/admin/UserManagement';
import { CompanyManagement } from './components/admin/CompanyManagement';
import { UpdatePassword } from './components/UpdatePassword';
import { ProtectedRoute } from './components/ProtectedRoute';
import type { Company } from './types';

function App() {
  const { user, loading, isAuthorized, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);

  const handleCompanySelect = useCallback((company: Company) => {
    setActiveCompany(company);
    navigate(`/company/${company.id}/folders`);
  }, [navigate]);

  const handleSelectCompany = useCallback((company: Company) => {
    setActiveCompany(company);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-8">
          <div className="w-16 h-16 bg-secondary rounded-[2rem] flex items-center justify-center">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.5em] animate-pulse">Verifying Session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground font-body">
      <Routes>
        <Route path="/login" element={user && isAuthorized ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        
        {/* Admin Section */}
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

        {/* Application Section (Shared by Users & Admins) */}
        <Route 
          path="/company/:companyId/folders" 
          element={
            <ProtectedRoute>
              <FoldersView onSelectCompany={handleSelectCompany} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/folder/:folderId" 
          element={
            <ProtectedRoute>
              <FolderContents />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/folder/:folderId/editor/:pageId" 
          element={
            <ProtectedRoute>
              <MagazineEditor />
            </ProtectedRoute>
          } 
        />

        {/* Root Route Selection */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              {isAdmin ? (
                <Navigate to="/admin" replace />
              ) : (
                <WorkspaceLayout 
                  company={activeCompany || { id: 'none', name: 'Select Company' }}
                  currentView="company_selection"
                  onNavigateBack={() => navigate(-1)}
                  onHome={() => {
                    setActiveCompany(null);
                    navigate('/');
                  }}
                >
                  <CompanySelection onSelect={handleCompanySelect} />
                </WorkspaceLayout>
              )}
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isAdmin && (
        <Link 
          to="/admin" 
          className="fixed bottom-10 right-10 w-16 h-16 bg-primary text-primary-foreground rounded-[2rem] shadow-2xl shadow-primary/20 flex items-center justify-center transition-all hover:scale-110 hover:-rotate-6 group z-50"
          title="Admin Panel"
        >
          <Shield className="w-6 h-6" />
          <span className="absolute right-full mr-6 bg-card border border-border text-foreground px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap translate-x-4 group-hover:translate-x-0 shadow-xl">
            Admin Console
          </span>
        </Link>
      )}
    </div>
  );
}

export default App;
