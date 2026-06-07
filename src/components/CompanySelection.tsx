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
      try {
        let data: Company[] = [];
        
        if (isAdmin) {
          // Admins can see all companies
          const { data: allCompanies, error } = await supabase
            .from('companies')
            .select('*')
            .order('name');
          if (!error) data = allCompanies as Company[];
        } else if (profile) {
          // Non-admins only see companies they are mapped to via user_companies
          const { data: userCompData, error } = await supabase
            .from('user_companies')
            .select('companies (*)')
            .eq('user_id', profile.id);

          if (!error && userCompData) {
            data = userCompData.map((uc: any) => uc.companies).filter(Boolean) as Company[];
          }
        }

        setCompanies(data);

        // Auto-select if only one company exists
        if (data.length === 1) {
          onSelect(data[0]);
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [profile, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-gray-400 font-medium animate-pulse">Syncing workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 md:p-8">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-gray-900 mb-4">Select Workspace</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            {companies.length === 0 
              ? "We couldn't find any workspaces associated with your account." 
              : "Choose an environment to begin managing your publications and assets."}
          </p>
        </div>

        {companies.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem] p-12 text-center max-w-xl mx-auto">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 mx-auto mb-6">
              <Building2 size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Required</h2>
            <p className="text-gray-400 mb-8">Your account hasn't been assigned to a workspace yet. Please reach out to your administrator for access.</p>
            <button 
              onClick={() => window.location.href = 'mailto:support@emdash.ai'}
              className="px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all"
            >
              Contact Support
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => onSelect(company)}
                className="bg-white border border-gray-100 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all p-10 flex flex-col items-center justify-center space-y-6 rounded-[2rem] group relative overflow-hidden text-center"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -mr-16 -mt-16 transition-all group-hover:bg-blue-100/50" />
                
                <div className="w-24 h-24 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner relative z-10 overflow-hidden">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 size={40} strokeWidth={1.5} />
                  )}
                </div>
                
                <div className="relative z-10">
                  <span className="block text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">{company.name}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-blue-400 transition-colors">Launch Workspace</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
