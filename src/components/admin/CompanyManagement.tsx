import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Trash2, Building2, Loader2, Search, X, CheckCircle2, Users, Edit2, ExternalLink } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import type { Company } from '../../types';

export const CompanyManagement: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*, user_companies(count)')
      .order('name');

    if (!error && data) setCompanies(data as Company[]);
    setLoading(false);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const openModal = (company: Company | null = null) => {
    if (company) {
      setEditingCompany(company);
      setNewCompanyName(company.name);
      setLogoPreview(company.logoUrl || null);
    } else {
      setEditingCompany(null);
      setNewCompanyName('');
      setLogoPreview(null);
    }
    setLogoFile(null);
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      let logoUrl = logoPreview;
      
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('company-logos')
          .getPublicUrl(filePath);
          
        logoUrl = publicUrl;
      }

      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({ name: newCompanyName, logoUrl })
          .eq('id', editingCompany.id);
        if (error) throw error;
        showNotification('success', `Company "${newCompanyName}" updated successfully`);
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([{ name: newCompanyName, logoUrl }]);
        if (error) throw error;
        showNotification('success', `Company "${newCompanyName}" created successfully`);
      }

      fetchData();
      setIsCompanyModalOpen(false);
      setNewCompanyName('');
      setLogoFile(null);
      setLogoPreview(null);
      setEditingCompany(null);
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase.from('companies').delete().eq('id', companyToDelete.id);
      if (error) throw error;
      showNotification('success', 'Company deleted');
      setCompanyToDelete(null);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background font-sans invisible-scrollbar">
      <header className="h-14 bg-card/30 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 faint-divider shrink-0 z-10">
        <h1 className="text-lg font-semibold text-foreground tracking-tight leading-none">Workspace Directory</h1>
        
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input 
              type="text" 
              placeholder="Filter..."
              className="h-8 pl-9 pr-3 micro-surface border border-border/50 rounded-lg focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all w-48 lg:w-64 text-xs font-medium text-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 h-8 px-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all border border-border/50 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Workspace</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-2 lg:px-6 py-4 w-full max-w-full">
        {notification && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-bold text-sm">{notification.message}</p>
          </div>
        )}

        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
            {filteredCompanies.map((company) => {
              const memberCount = company.user_companies?.[0]?.count ?? 0;
              return (
              <div 
                key={company.id} 
                onClick={() => navigate(`/company/${company.id}/folders`)}
                className="micro-surface micro-surface-hover border border-border/10 hover:border-primary/30 group relative cursor-pointer flex flex-row items-center gap-4 p-3 rounded-2xl transition-all"
              >
                <div className="w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center overflow-hidden border border-border/10 shrink-0">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <Building2 className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary transition-colors duration-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary tracking-tight truncate">{company.name}</h3>
                  <div className="label-premium flex items-center gap-1.5 mt-0.5 group-hover:text-muted-foreground transition-colors">
                    <Users className="w-3.5 h-3.5" />
                    {memberCount} Member{memberCount !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(company);
                    }}
                    className="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground/40 hover:text-primary transition-all"
                    title="Edit Company"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompanyToDelete(company);
                    }}
                    className="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground/40 hover:text-destructive transition-all"
                    title="Delete Company"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )})}
          </div>
        )}
      </main>

      {/* Company Modal (Create/Edit) */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-2xl z-[150] flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-500">
          <div className="micro-surface rounded-xl shadow-none w-full max-w-md overflow-hidden border border-border/50 animate-in zoom-in-95 duration-300 bg-card/50">
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                  {editingCompany ? 'Edit Identity' : 'New Workspace'}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {editingCompany ? 'Update organization details' : 'Register a new organization'}
                </p>
              </div>
              <button 
                onClick={() => setIsCompanyModalOpen(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-all group"
              >
                <X className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="p-5 space-y-5">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-1">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <input
                      type="text"
                      placeholder="Enterprise Name"
                      className="w-full h-8 pl-9 pr-3 micro-surface border border-border/50 rounded-lg focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium text-foreground"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-1">Identity Visual (Logo)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 micro-surface rounded-xl border border-dashed border-border/50 flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Building2 className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label 
                        htmlFor="logo-upload"
                        className="inline-flex h-8 px-3 items-center micro-surface border border-border/50 rounded-lg text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-all"
                      >
                        Choose Image
                      </label>
                      <p className="text-[9px] text-muted-foreground/40 mt-3 font-bold uppercase tracking-widest">PNG, JPG or SVG. Max 2MB.</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 h-10 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs border border-border/50"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingCompany ? 'Update Workspace' : 'Initialize Workspace'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!companyToDelete}
        title="Delete Workspace"
        message={`Are you sure you want to delete "${companyToDelete?.name}"? This will permanently remove the organization and all associated data, including its directories and publications.`}
        confirmLabel="Delete Workspace"
        onConfirm={confirmDeleteCompany}
        onCancel={() => setCompanyToDelete(null)}
        isLoading={actionLoading}
        variant="danger"
      />
    </div>
  );
};
