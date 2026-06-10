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
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => onSelect(company)}
              className="p-10 border border-white/10 rounded-2xl bg-transparent hover:bg-white/5 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-white">{company.name}</h3>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#000000]">
      <div className="p-12 border border-white/10 rounded-3xl bg-transparent max-w-md w-full mx-4">
        <h2 className="text-3xl font-bold text-white mb-4">Sit tight!</h2>
        <p className="text-white/60 mb-8">
          Your account is active. We are currently getting your workspace ready.
        </p>
        <div className="flex items-center gap-3 pt-6 border-t border-white/5">
          <span className="text-sm font-medium text-white/80">{user?.email || profile?.full_name}</span>
          <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-wider border border-white/10">
            Pending Assignment
          </span>
        </div>
      </div>
    </div>
  );
}
