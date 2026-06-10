import { useEffect, useState } from 'react';
import type { Company } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight } from 'lucide-react';

interface Props {
  onSelect: (company: Company) => void;
}

export function CompanySelection({ onSelect }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
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
            // Automatic single-workspace redirect REMOVED per architectural mandate
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

  if (companies.length > 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-6xl space-y-16">
          <header className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black text-foreground tracking-tighter leading-none">
              Welcome back
            </h1>
            <p className="text-muted-foreground font-medium text-lg md:text-xl max-w-2xl leading-relaxed">
              Select an environment to continue.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => onSelect(company)}
                className="group relative p-12 border border-border/50 rounded-[3rem] bg-transparent hover:bg-secondary/20 hover:border-primary/20 transition-all duration-500 text-left overflow-hidden"
              >
                <div className="space-y-6">
                  <h3 className="text-3xl font-black text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {company.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="px-4 py-1.5 rounded-full bg-primary/5 text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/10">
                      {profile?.roles?.name || (isAdmin ? 'Admin' : 'Authorized Personnel')}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                      <ArrowRight size={20} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
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
