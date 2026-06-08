import { Folder as FolderIcon, Plus } from 'lucide-react';
import type { Folder } from '../types';

interface Props {
  folders: Folder[];
  onCreateFolder: (name: string) => void;
  onOpenFolder: (folder: Folder) => void;
}

export function ProjectExplorer({ folders, onCreateFolder, onOpenFolder }: Props) {
  const handleCreate = () => {
    const name = prompt('Enter new project folder name:');
    if (name && name.trim()) {
      onCreateFolder(name.trim());
    }
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-serif font-bold tracking-tight">Project Explorer</h2>
            <p className="text-muted-foreground text-sm mt-1">Manage and access your project directories.</p>
          </div>
          <button 
            onClick={handleCreate}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium rounded flex items-center shadow-sm transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Create Project Folder
          </button>
        </div>

        {folders.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center h-64 bg-white/50">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-muted-foreground mb-4">
              <FolderIcon size={20} />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No Project Folders</h3>
            <p className="text-muted-foreground text-sm mb-4">Get started by creating a new directory.</p>
            <button 
              onClick={handleCreate}
              className="text-primary hover:underline text-sm font-medium"
            >
              + Create Project Folder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => onOpenFolder(folder)}
                className="bg-white border rounded-lg p-6 flex flex-col items-start hover:border-primary/50 hover:shadow-sm transition-all group text-left"
              >
                <div className="w-10 h-10 bg-secondary/50 rounded-lg flex items-center justify-center text-muted-foreground mb-4 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                  <FolderIcon size={20} className="fill-current/20" />
                </div>
                <h4 className="font-medium text-foreground truncate w-full">{folder.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated {new Date(folder.updated_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
