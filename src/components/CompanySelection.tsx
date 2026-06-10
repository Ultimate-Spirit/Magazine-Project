import { useEffect, useState } from 'react';
import type { Company } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

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
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (!error && data) {
        let filtered = data as Company[];
        if (!isAdmin && profile?.company_id) {
          filtered = filtered.filter(c => c.id === profile.company_id);
        }
        setCompanies(filtered);

        if (filtered.length === 1) {
          onSelect(filtered[0]);
        }
      }
      setLoading(false);
    };

    fetchCompanies();
  }, [profile, isAdmin, onSelect]);

  if (loading) {
    return null;
  }

  if (companies.length > 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => onSelect(company)}
              className="p-10 border border-border rounded-2xl bg-card hover:bg-secondary transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-foreground">{company.name}</h3>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="p-12 border border-border rounded-3xl bg-card max-w-md w-full mx-4">
        <h2 className="text-3xl font-bold text-foreground mb-4">Sit tight!</h2>
        <p className="text-muted-foreground mb-8">
          Your account is active. We are currently getting your workspace ready.
        </p>
        <div className="flex items-center gap-3 pt-6 border-t border-border">
          <span className="text-sm font-medium text-foreground/80">{user?.email || profile?.full_name}</span>
          <span className="px-2 py-0.5 rounded bg-secondary text-[10px] font-bold text-muted-foreground uppercase tracking-wider border border-border">
            Pending Assignment
          </span>
        </div>
      </div>
    </div>
  );
}
