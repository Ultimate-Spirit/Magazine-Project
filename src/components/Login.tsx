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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-12">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-blue-50 rounded-3xl text-blue-600 shadow-sm">
            <Shield className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Internal Access</h1>
            <p className="text-gray-400 font-medium">Please sign in to your corporate workspace.</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full pl-8 pr-4 py-3 bg-transparent border-b border-gray-100 focus:border-blue-600 outline-none transition-all text-gray-900 placeholder:text-gray-200 font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-8 pr-4 py-3 bg-transparent border-b border-gray-100 focus:border-blue-600 outline-none transition-all text-gray-900 placeholder:text-gray-200 font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 text-lg"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <footer className="text-center">
          <p className="text-xs text-gray-300 font-medium tracking-wide">
            &copy; 2026 INTERNAL MAGAZINE SYSTEMS
          </p>
        </footer>
      </div>
    </div>
  );
};
