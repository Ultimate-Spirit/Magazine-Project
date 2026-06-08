import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Folder as FolderIcon, Plus, Loader2, ChevronRight, LayoutGrid } from 'lucide-react';
import { WorkspaceLayout } from './WorkspaceLayout';
import type { Folder, Company } from '../types';

interface Props {
  onSelectCompany: (company: Company) => void;
}

export function FoldersView({ onSelectCompany }: Props) {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  const fetchData = async () => {
    setLoading(true);
    const [companyRes, foldersRes] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      supabase.from('folders').select('*').eq('company_id', companyId).order('updated_at', { ascending: false })
    ]);

    if (companyRes.data) {
      setCompany(companyRes.data);
      onSelectCompany(companyRes.data);
    }
    
    if (foldersRes.data) {
      setFolders(foldersRes.data);
    }
    setLoading(false);
  };

  const handleCreateFolder = async () => {
    const name = prompt('Enter new project folder name:');
    if (name && name.trim()) {
      setIsCreating(true);
      const { error } = await supabase
        .from('folders')
        .insert([{ name: name.trim(), company_id: companyId }]);
      
      if (!error) {
        fetchData();
      }
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <WorkspaceLayout 
      company={company || { id: companyId || 'none', name: 'Loading...' }}
      currentView="project_explorer"
      onNavigateBack={() => navigate('/')}
      onHome={() => navigate('/')}
    >
      <div className="max-w-7xl mx-auto px-8 py-12">
        <header className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">
              <LayoutGrid className="w-4 h-4" />
              Project Directories
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Workspace Folders</h1>
            <p className="text-gray-400 font-medium mt-2">Organize your magazines and publications into dedicated projects.</p>
          </div>
          <button 
            onClick={handleCreateFolder}
            disabled={isCreating}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            New Folder
          </button>
        </header>

        {folders.length === 0 ? (
          <div className="bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 py-32 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
              <FolderIcon className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">This workspace is empty</h3>
            <p className="text-gray-400 font-medium mb-8">Create your first folder to start building magazines.</p>
            <button 
              onClick={handleCreateFolder}
              className="px-8 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigate(`/folder/${folder.id}/editor`)}
                className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all text-left flex flex-col justify-between min-h-[220px]"
              >
                <div className="flex items-start justify-between">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <FolderIcon className="w-8 h-8" />
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                    <ChevronRight className="w-5 h-5 text-blue-600" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {folder.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Modified {new Date(folder.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
