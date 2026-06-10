import { FileText, Plus } from 'lucide-react';
import type { Folder, Page } from '../types';

interface Props {
  folder: Folder;
  pages: Page[];
  onCreatePage: () => void;
  onOpenPage: (page: Page) => void;
}

export function FolderView({ folder, pages, onCreatePage, onOpenPage }: Props) {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 border-b pb-6">
          <div>
            <div className="flex items-center text-xs text-muted-foreground mb-2">
              <span>Project Explorer</span>
              <span className="mx-2">/</span>
              <span className="text-foreground font-medium">{folder.name}</span>
            </div>
            <h2 className="text-2xl font-serif font-bold tracking-tight">{folder.name}</h2>
          </div>
          <button 
            onClick={onCreatePage}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium rounded flex items-center transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Create New Page
          </button>
        </div>

        {pages.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center h-64 bg-secondary/50">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-muted-foreground mb-4">
              <FileText size={20} />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Directory Empty</h3>
            <p className="text-muted-foreground text-sm mb-4">No pages have been saved to this folder yet.</p>
            <button 
              onClick={onCreatePage}
              className="text-primary hover:underline text-sm font-medium"
            >
              + Create New Page
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => onOpenPage(page)}
                className="group text-left"
              >
                <div className="aspect-[3/4] bg-card border border-border rounded-lg mb-3 flex flex-col items-center justify-center overflow-hidden group-hover:border-primary/50 transition-all">
                  {page.thumbnailUrl ? (
                    <img src={page.thumbnailUrl} alt={page.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-muted-foreground/30 group-hover:text-primary/30 transition-colors">
                      <FileText size={48} strokeWidth={1} />
                    </div>
                  )}
                </div>
                <h4 className="font-medium text-sm text-foreground truncate">{page.title || 'Untitled Page'}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Updated {new Date(page.updated_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
