import { useEffect, useState } from 'react';
import type { Company } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Search, Building2, ChevronRight } from 'lucide-react';

interface Props {
  onSelect: (company: Company) => void;
}

export function CompanySelection({ onSelect }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, profile, isAdmin } = useAuth();

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      
      try {
        if (isAdmin) {
          const { data, error } = await supabase
            .from('companies')
            .select('*, user_companies(count)')
            .order('name');
          if (!error && data) setCompanies(data);
        } else {
          const { data, error } = await supabase
            .from('user_companies')
            .select('companies(*, user_companies(count))')
            .eq('user_id', user?.id);
          
          if (!error && data) {
            const mapped = data.map((item: any) => item.companies).filter(Boolean);
            setCompanies(mapped);
          }
        }
      } catch (err) {
        console.error('Fetch companies error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [user, isAdmin]);

  if (loading) {
    return null;
  }

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (companies.length > 0) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-background flex flex-col p-8 md:p-12 xl:px-16 py-12 md:py-20 text-foreground">
        <div className="w-full max-w-full mx-auto flex flex-col">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em]">
                <div className="w-2 h-2 rounded-full bg-primary" />
                System Access
              </div>
              <h1 className="text-6xl font-display font-black tracking-tighter leading-none">
                Workspace Portal
              </h1>
              <p className="text-muted-foreground font-body text-lg max-w-xl leading-relaxed">
                Select an assigned environment to continue.
              </p>
            </div>

            <div className="relative group w-full md:w-64">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Find environment..."
                className="w-full pl-12 pr-6 py-4 bg-secondary border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
            {filteredCompanies.map((company) => {
              const memberCount = company.user_companies?.[0]?.count ?? 0;
              return (
              <div
                key={company.id}
                className="group relative bento-card micro-surface micro-surface-hover flex flex-col justify-between min-h-[260px] cursor-pointer overflow-hidden border border-border/20 hover:border-primary/30"
                onClick={() => onSelect(company)}
              >
                <div className="flex items-start justify-between">
                  {/* Circular Avatar / Logo Visual Anchor */}
                  <div className="w-16 h-16 rounded-2xl bg-secondary/80 flex items-center justify-center shrink-0 border border-border/10 group-hover:bg-primary group-hover:border-primary/20 transition-all duration-500 overflow-hidden">
                    {company.logoUrl ? (
                      <img 
                        src={company.logoUrl} 
                        alt={`${company.name} logo`}
                        className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-muted-foreground group-hover:text-primary-foreground transition-colors duration-500" />
                    )}
                  </div>

                  <div className="w-8 h-8 rounded-full micro-surface flex items-center justify-center text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-display font-black mb-3 text-foreground group-hover:text-primary transition-colors tracking-tight line-clamp-1 pr-4">
                    {company.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-lg micro-surface text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border/10 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {profile?.roles?.name || (isAdmin ? 'Admin' : 'Authorized Personnel')}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {memberCount} Active Member{memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            )})}
          </div>

          {filteredCompanies.length === 0 && (
            <div className="py-32 text-center micro-surface rounded-[2.5rem] border border-border/20">
              <p className="text-xl font-body font-bold text-muted-foreground">No matches for "<span className="text-foreground">{searchQuery}</span>"</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-6 text-sm font-bold text-primary hover:underline"
              >
                Reset search filters
              </button>
            </div>
          )}
        </div>

        {/* Premium Branding Footer */}
        <footer className="fixed bottom-0 left-0 w-full px-8 md:px-16 py-8 flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-none z-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping opacity-40" />
            </div>
            <span className="text-[10px] font-black text-slate-500/60 uppercase tracking-[0.2em]">System Status: Online</span>
          </div>

          <div className="flex items-center gap-4 opacity-15 hover:opacity-30 transition-opacity duration-500">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] whitespace-nowrap">Spirit OS // Internal Access Only</span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="p-12 border border-border/10 rounded-[3.5rem] bg-card/50 backdrop-blur-xl max-w-md w-full mx-4 shadow-2xl micro-surface">
        <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Verifying Session</h2>
        <p className="text-foreground font-black text-2xl leading-tight mb-10 tracking-tighter">
          Identity Confirmed. Provisioning your secure workspace environment.
        </p>
        <div className="flex items-center gap-4 pt-8 border-t border-black/5 dark:border-white/5">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{user?.email || profile?.full_name}</p>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Pending Assignment
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
