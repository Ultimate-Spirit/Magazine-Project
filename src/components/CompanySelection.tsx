import { useEffect, useState } from 'react';
import { Building2, Loader2, Search, ArrowRight } from 'lucide-react';
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
  }, [profile, isAdmin, onSelect]);

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Choose Your Workspace</h1>
        <p className="text-gray-500 font-medium text-lg mb-8">Select a company to begin building your publication.</p>
        
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
          <input 
            type="text" 
            placeholder="Search workspaces..."
            className="w-full pl-14 pr-6 py-4 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[200px]">
        {filteredCompanies.map((company, index) => {
          // Bento layout logic: 1st card is large, others alternate
          const isLarge = index === 0;
          const isWide = index === 1 || index === 4;
          
          return (
            <button
              key={company.id}
              onClick={() => onSelect(company)}
              className={`group relative overflow-hidden bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col p-8 text-left ${
                isLarge ? 'md:col-span-2 md:row-span-2' : isWide ? 'md:col-span-2' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-auto relative z-10">
                <div className={`rounded-2xl flex items-center justify-center overflow-hidden bg-blue-50 border border-blue-100 ${isLarge ? 'w-20 h-20' : 'w-12 h-12'}`}>
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className={`${isLarge ? 'w-10 h-10' : 'w-6 h-6'} text-blue-600`} />
                  )}
                </div>
                <div className="p-2 bg-gray-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                </div>
              </div>

              <div className="relative z-10">
                <h3 className={`font-black text-gray-900 mb-1 leading-tight ${isLarge ? 'text-3xl' : 'text-xl'}`}>
                  {company.name}
                </h3>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                  Workspace ID: {company.id.slice(0, 8)}
                </p>
              </div>

              {/* Decorative background element for large cards */}
              {isLarge && (
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl group-hover:bg-blue-100/50 transition-colors z-0" />
              )}
            </button>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="text-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">No workspaces found</h3>
          <p className="text-gray-400 font-medium">Try searching for a different name or contact your administrator.</p>
        </div>
      )}
    </div>
  );
}
