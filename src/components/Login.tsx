import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate(from, { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-20">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="w-20 h-20 bg-secondary rounded-[2.5rem] flex items-center justify-center text-primary shadow-inner">
            <Shield className="w-10 h-10" />
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl font-display font-black tracking-tighter leading-none">
              Internal <br/> Access
            </h1>
            <p className="text-muted-foreground font-body text-lg max-w-xs mx-auto leading-relaxed">
              Authenticate to access your organization's creative workspace.
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em] ml-2">Identity Identifier</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full pl-16 pr-8 py-6 bg-secondary border-none rounded-2xl focus:ring-4 focus:ring-primary/5 outline-none transition-all font-body font-bold text-lg placeholder:text-muted-foreground/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em] ml-2">Secure Credential</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-16 pr-8 py-6 bg-secondary border-none rounded-2xl focus:ring-4 focus:ring-primary/5 outline-none transition-all font-body font-bold text-lg placeholder:text-muted-foreground/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-6 bg-destructive/10 text-destructive text-sm rounded-2xl font-bold animate-in fade-in zoom-in-95 duration-200 border border-destructive/20 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-8 bg-primary text-primary-foreground font-display font-black rounded-3xl hover:opacity-90 disabled:opacity-50 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-4 text-xl tracking-tight"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enter Workspace'}
          </button>
        </form>

        <footer className="text-center pt-8">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.5em] opacity-30">
            &copy; 2026 INTERNAL MAGAZINE SYSTEMS
          </p>
        </footer>
      </div>
    </div>
  );
};
