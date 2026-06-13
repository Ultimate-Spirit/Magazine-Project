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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 lg:p-6">
      <div className="w-full max-w-sm space-y-12 micro-surface p-8 lg:p-10 rounded-[3rem] border border-border/10 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-primary/10 rounded-3xl text-primary border border-primary/20">
            <Shield className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl lg:text-4xl font-black text-foreground tracking-tighter">Internal Access</h1>
            <p className="text-muted-foreground/60 font-medium text-sm">Please sign in to your corporate workspace.</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full pl-11 pr-4 py-4 bg-secondary/50 border border-border/10 rounded-2xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground/30 font-bold text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-4 bg-secondary/50 border border-border/10 rounded-2xl focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground/30 font-bold text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/5 text-destructive text-sm rounded-2xl font-bold border border-destructive/10 animate-in fade-in duration-200 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-primary text-primary-foreground font-black rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/10"   
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authenticate'}
          </button>
        </form>

        <footer className="text-center pt-4">
          <p className="text-[9px] text-muted-foreground/40 font-black tracking-widest uppercase">
            &copy; 2026 INTERNAL MAGAZINE SYSTEMS
          </p>
        </footer>
      </div>
    </div>
  );
};
