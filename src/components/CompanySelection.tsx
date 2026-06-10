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
    <div className="max-w-7xl mx-auto w-full px-8 py-12">
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-2xl text-left">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-primary rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Workspace Selection</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            Welcome back.
          </h1>
          <p className="text-muted-foreground font-medium text-lg leading-relaxed">
            Select a workspace to continue your creative journey. Each environment is tailored to your brand's unique identity.
          </p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-sm outline-none"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[220px]">
        {filteredCompanies.map((company, index) => {
          const isLarge = index === 0 && filteredCompanies.length > 2;
          const isWide = (index === 1 || index === 4) && filteredCompanies.length > 3;

          return (
            <button
              key={company.id}
              onClick={() => onSelect(company)}
              className={`group relative overflow-hidden bg-card rounded-[2.5rem] border border-border shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all flex flex-col p-8 text-left ${
                isLarge ? 'md:col-span-2 md:row-span-2' : isWide ? 'md:col-span-2' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-auto relative z-10">
                <div className={`rounded-2xl flex items-center justify-center overflow-hidden bg-muted border border-border ${isLarge ? 'w-20 h-20' : 'w-14 h-14'}`}>
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className={`${isLarge ? 'w-10 h-10' : 'w-7 h-7'} text-primary`} />
                  )}
                </div>
                <div className="p-3 bg-muted rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 border border-border">
                  <ArrowRight className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="relative z-10">
                <h3 className={`font-black mb-2 leading-tight ${isLarge ? 'text-3xl' : 'text-xl'}`}>
                  {company.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">
                    Active Workspace
                  </p>
                </div>
              </div>

              {/* Decorative background element */}
              <div className={`absolute -bottom-12 -right-12 rounded-full blur-3xl group-hover:opacity-100 opacity-0 transition-opacity z-0 ${
                index % 2 === 0 ? 'w-48 h-48 bg-primary/10' : 'w-48 h-48 bg-purple-500/10'
              }`} />
            </button>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="mt-8 flex flex-col items-center justify-center py-32 px-8 text-center bg-card rounded-[3.5rem] border border-border shadow-sm relative overflow-hidden group">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/10 transition-colors" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] group-hover:bg-purple-500/10 transition-colors" />

          <div className="relative z-10 max-w-xl">
            <div className="w-24 h-24 bg-muted rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-inner border border-border transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            
            <h3 className="text-4xl font-black mb-6 tracking-tight">
              Awaiting Assignment
            </h3>
            
            <div className="space-y-6 text-muted-foreground font-medium text-lg leading-relaxed">
              <p>
                Welcome to the platform. It appears your account is currently in our premium waiting room while we finalize your workspace permissions.
              </p>
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-muted rounded-2xl border border-border text-sm">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
                <span className="text-foreground font-bold italic">Status: Administrator review in progress</span>
              </div>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="group flex items-center gap-2 px-10 py-4 bg-foreground text-background rounded-2xl font-black text-sm hover:opacity-90 transition-all hover:shadow-2xl hover:-translate-y-1"
              >
                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                Refresh View
              </button>
              <a 
                href="mailto:admin@example.com"
                className="flex items-center gap-2 px-10 py-4 bg-card text-foreground border border-border rounded-2xl font-black text-sm hover:bg-muted transition-all"
              >
                <Mail size={18} />
                Contact Admin
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
