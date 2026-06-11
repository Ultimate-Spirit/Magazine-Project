import { useEffect, useState } from 'react';
import type { Company } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Search, Building2 } from 'lucide-react';

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
            .select('*')
            .order('name');
          if (!error && data) setCompanies(data);
        } else {
          const { data, error } = await supabase
            .from('user_companies')
            .select('companies(*)')
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
      <div className="min-h-[calc(100vh-5rem)] bg-background flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-4xl flex flex-col space-y-8">
          <header className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter leading-none">
              Welcome back
            </h1>
            <p className="text-muted-foreground font-medium text-base md:text-lg">
              Select an environment to continue.
            </p>
          </header>

          {/* Search Bar */}
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Filter environments..."
              className="w-full pl-11 pr-6 py-3.5 bg-secondary/30 border border-border/20 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {filteredCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => onSelect(company)}
                className="group relative p-6 border border-border/20 rounded-[1.5rem] bg-transparent hover:border-foreground/20 hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden flex items-center gap-5"
              >
                {/* Circular Avatar / Logo Visual Anchor */}
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border/10 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors duration-300 overflow-hidden">
                  {company.logoUrl ? (
                    <img 
                      src={company.logoUrl} 
                      alt={`${company.name} logo`}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground tracking-tight truncate transition-colors">
                    {company.name}
                  </h3>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                    {profile?.roles?.name || (isAdmin ? 'Admin' : 'Authorized Personnel')}
                  </p>
                </div>

                {/* Micro-interaction Arrow */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                  <ArrowRight size={16} />
                </div>
              </button>
            ))}
          </div>

          {filteredCompanies.length === 0 && (
            <div className="py-12 text-center bg-secondary/10 rounded-[2rem] border border-dashed border-border/20">
              <p className="text-sm font-medium text-muted-foreground">No matching environments found.</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-4 text-xs font-bold text-primary hover:underline uppercase tracking-widest"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="p-12 border border-border rounded-[3.5rem] bg-card max-w-md w-full mx-4">
        <h2 className="text-3xl font-black text-foreground mb-4 tracking-tight">Sit tight!</h2>
        <p className="text-muted-foreground font-medium leading-relaxed mb-10">
          Your account is active. We are currently getting your workspace ready.
        </p>
        <div className="flex items-center gap-4 pt-8 border-t border-border">
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
