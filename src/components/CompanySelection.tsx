import { useEffect, useState } from 'react';
import { Building2, Loader2, Search, ArrowRight, Sparkles, RefreshCw, Mail } from 'lucide-react';
import type { Company } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onSelect: (company: Company) => void;
}

export function CompanySelection({ onSelect }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { profile, isAdmin } = useAuth();

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (!error && data) {
        let filtered = data as Company[];
        // If not admin and has a company mapping, only show that company
        if (!isAdmin && profile?.company_id) {
          filtered = filtered.filter(c => c.id === profile.company_id);
        }
        setCompanies(filtered);

        // Auto-select if only one company exists for the user
        if (filtered.length === 1) {
          onSelect(filtered[0]);
        }
      }
      setLoading(false);
    };

    fetchCompanies();
  }, [profile, isAdmin, onSelect]);

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Initializing Workspaces...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-8 md:px-12 py-12 md:py-24">
      <header className="mb-20 space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground ml-1">
          Authorized Environments
        </p>
        <h1 className="text-6xl md:text-7xl font-display font-black tracking-tight leading-[0.9]">
          Select <br/> Workspace
        </h1>
        <p className="text-muted-foreground font-body text-lg max-w-xl leading-relaxed pt-4">
          Choose an organization to begin. Your environment is isolated and pre-configured for your brand identity.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[240px]">
        {filteredCompanies.map((company, index) => {
          const isLarge = index === 0;
          const isWide = index === 1;

          return (
            <button
              key={company.id}
              onClick={() => onSelect(company)}
              className={`group relative overflow-hidden bg-card rounded-[2rem] hover:bg-secondary transition-all flex flex-col p-10 text-left ${
                isLarge ? 'md:col-span-2 md:row-span-2' : isWide ? 'md:col-span-2' : ''
              }`}
            >
              <div className="mb-auto">
                <div className={`rounded-2xl flex items-center justify-center overflow-hidden bg-secondary transition-colors group-hover:bg-background ${isLarge ? 'w-24 h-24' : 'w-16 h-16'}`}>
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain p-4" />
                  ) : (
                    <Building2 className={`${isLarge ? 'w-10 h-10' : 'w-7 h-7'} text-muted-foreground`} />
                  )}
                </div>
              </div>

              <div>
                <h3 className={`font-display font-bold leading-none tracking-tight mb-3 ${isLarge ? 'text-4xl' : 'text-xl'}`}>
                  {company.name}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">
                    Ready for access
                  </p>
                </div>
              </div>
              
              <div className="absolute top-10 right-10 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                <ArrowRight className="w-6 h-6 text-primary" />
              </div>
            </button>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="mt-12 py-32 px-12 text-center bg-secondary/50 rounded-[3rem] border border-dashed border-border">
          <Sparkles className="w-12 h-12 text-muted-foreground/20 mx-auto mb-8" />
          <h3 className="text-3xl font-display font-bold mb-4">No Workspaces Found</h3>
          <p className="text-muted-foreground font-body max-w-md mx-auto mb-12">
            You don't have access to any organizations yet. Please contact your system administrator to be assigned a workspace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-10 py-5 bg-primary text-primary-foreground rounded-2xl font-bold text-sm hover:opacity-90 transition-all"
            >
              Check Status
            </button>
            <a 
              href="mailto:support@example.com"
              className="px-10 py-5 bg-card text-foreground rounded-2xl font-bold text-sm hover:bg-secondary transition-all"
            >
              Request Access
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
