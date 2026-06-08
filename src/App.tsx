import { useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Loader2, Shield } from 'lucide-react';
import { CompanySelection } from './components/CompanySelection';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { FoldersView } from './components/FoldersView';
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

  const handleCompanySelect = (company: Company) => {
    setActiveCompany(company);
    navigate(`/company/${company.id}/folders`);
  };

  return (
    <div className="relative min-h-screen">
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
              <FoldersView onSelectCompany={(company) => setActiveCompany(company)} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/folder/:folderId/editor" 
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

export default App;
