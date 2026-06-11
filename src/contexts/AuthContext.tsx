import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile, RolePermissions } from '../types';

const ALL_PERMISSIONS: RolePermissions = {
  can_create_folders: true,
  can_edit_own_folders: true,
  can_edit_all_folders: true,
  can_delete_own_folders: true,
  can_delete_all_folders: true,
  can_create_publications: true,
  can_edit_own_publications: true,
  can_edit_all_publications: true,
  can_delete_own_publications: true,
  can_delete_all_publications: true,
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthorized: boolean;
  permissions: RolePermissions | null;
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
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);

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
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsAuthorized(false);
      }
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
          setPermissions(null);
          return;
        }

        // Only update if data has changed to prevent unnecessary re-renders/remounts
        const updatedProfile = data as UserProfile;
        if (JSON.stringify(updatedProfile) !== JSON.stringify(profile)) {
          setProfile(updatedProfile);
        }

        setIsAuthorized(true);
        // Prioritize system_admin flag from roles table, with hardcoded override for primary admin
        const isSysAdmin = data.roles?.is_system_admin === true || data.role === 'admin' || user.email === 'avessaify@gmail.com';
        setIsAdmin(isSysAdmin);
        
        if (isSysAdmin) {
          setPermissions(ALL_PERMISSIONS);
        } else {
          setPermissions(data.roles?.permissions || null);
        }
      } else {
        console.warn('No profile data returned for user');
        // If it's the primary admin, allow them in even without a profile
        if (user.email === 'avessaify@gmail.com') {
          setIsAuthorized(true);
          setIsAdmin(true);
          setPermissions(ALL_PERMISSIONS);
        } else {
          setProfile(null);
          setIsAuthorized(false);
          setIsAdmin(false);
          setPermissions(null);
        }
      }
    } catch (error: any) {
      console.error('Fetch Profile Exception:', error.message);
      
      // CRITICAL BYPASS: If the fetch fails (e.g. roles table doesn't exist yet)
      // we must still allow the primary admin to enter so they can fix the DB.
      if (user.email === 'avessaify@gmail.com') {
        console.warn('Emergency bypass triggered for admin');
        setIsAuthorized(true);
        setIsAdmin(true);
        setPermissions(ALL_PERMISSIONS);
        setProfile({
          id: user.id,
          email: user.email,
          role: 'admin',
          full_name: 'System Administrator',
          is_active: true
        });
      } else {
        setProfile(null);
        setIsAuthorized(false);
        setIsAdmin(false);
        setPermissions(null);
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isAdmin, isAuthorized, permissions, signOut }}>
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
