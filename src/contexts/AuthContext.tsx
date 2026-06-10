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

  const fetchProfile = async (user: User) => {
    try {
      console.log('Fetching profile for:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*, roles(*)')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile detail:', error.message, error.details);
        throw error;
      }

      if (data) {
        console.log('Profile found:', data.email, 'Role:', data.roles?.name, 'Active:', data.is_active);
        if (data.is_active === false && user.email !== 'avessaify@gmail.com') {
          console.warn('User is marked as inactive. Logging out.');
          await supabase.auth.signOut();
          setProfile(null);
          setIsAuthorized(false);
          setIsAdmin(false);
          return;
        }

        const userProfile = data as UserProfile;
        setProfile(userProfile);
        setIsAuthorized(true);
        // Prioritize system_admin flag from roles table, with hardcoded override for primary admin
        setIsAdmin(data.roles?.is_system_admin === true || data.role === 'admin' || user.email === 'avessaify@gmail.com');
      } else {
        console.warn('No profile data returned for user');
        // If it's the primary admin, allow them in even without a profile
        if (user.email === 'avessaify@gmail.com') {
          setIsAuthorized(true);
          setIsAdmin(true);
        } else {
          setProfile(null);
          setIsAuthorized(false);
          setIsAdmin(false);
        }
      }
    } catch (error: any) {
      console.error('Fetch Profile Exception:', error.message);
      setProfile(null);
      // Fallback: If we have a user but fetch failed, we might still want to allow access
      // to basic routes, but for now we stay strict.
      setIsAuthorized(false);
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
