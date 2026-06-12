import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthorized: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await runJitProvision(session.access_token);
          await fetchProfile(session.user);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setUser(null);
        setSession(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      setLoading(true);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Run JIT Provisioning on every login/token refresh
        await runJitProvision(session.access_token);
        await fetchProfile(session.user);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsAuthorized(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const runJitProvision = async (token: string) => {
    try {
      console.log('Running JIT Provisioning...');
      const response = await fetch('/_/backend/jit-provision', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (!response.ok) {
        console.error('JIT Provisioning Error:', result.detail);
      } else {
        console.log('JIT Provisioning Status:', result.status);
      }
    } catch (err) {
      console.error('JIT Provisioning Fetch Exception:', err);
    }
  };

  const fetchProfile = async (user: User) => {
    try {
      console.log('Fetching profile for:', user.id);
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile detail:', error.message, error.details);
        throw error;
      }

      if (!data) {
        console.warn('No profile found, creating failsafe profile for:', user.email);
        const { data: newData, error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
              role: 'viewer',
              is_active: true
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create failsafe profile:', insertError.message);
          // Even if insert fails, we allow session to persist if user is authenticated
          setIsAuthorized(true);
          setIsAdmin(false);
          return;
        }
        data = newData;
      }

      if (data) {
        console.log('Profile found/created:', data.email, 'Role:', data.role, 'Active:', data.is_active);
        if (data.is_active === false) {
          console.warn('User is marked as inactive. Logging out.');
          await supabase.auth.signOut();
          setProfile(null);
          setIsAuthorized(false);
          setIsAdmin(false);
          return;
        }

        setProfile(data as UserProfile);
        setIsAuthorized(true);
        setIsAdmin(data.role === 'admin');
      }
    } catch (error: any) {
      console.error('Fetch Profile Exception:', error.message);
      // Failsafe: allow authenticated users to stay logged in even if profile fetch fails
      setIsAuthorized(true);
      setIsAdmin(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isAdmin, isAuthorized, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
