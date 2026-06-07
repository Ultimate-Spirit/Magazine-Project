import { Building2, Loader2 } from 'lucide-react';
import type { Company } from '../types';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onSelect: (company: Company) => void;
}

export function CompanySelection({ onSelect }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
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
        if (!isAdmin && profile?.companyId) {
          filtered = filtered.filter(c => c.id === profile.companyId);
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
  }, [profile, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground mb-3">Select Workspace</h1>
          <p className="text-muted-foreground text-sm italic">
            {companies.length === 0 
              ? "No authorized workspaces found. Please contact support." 
              : "Choose a company environment to access its project folders."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => onSelect(company)}
              className="bg-white border hover:border-blue-500/50 hover:shadow-lg transition-all p-8 flex flex-col items-center justify-center space-y-4 rounded-2xl group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:bg-blue-100" />
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-inner relative z-10">
                <Building2 size={28} strokeWidth={1.5} />
              </div>
              <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors relative z-10">{company.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
