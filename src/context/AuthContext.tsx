import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  simulateRoleChange: (role: UserProfile['role']) => void; // Extremely useful helper for immediate, effortless demoing/testing
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    try {
      const { data, error: profileErr } = await supabase
        .from('user_roles')
        .eq('id', userId)
        .single();

      if (profileErr || !data) {
        console.error('Unauthorized: No operational user mapping found inside user_roles:', profileErr);
        setError('Accreditation Required: No matching role mapping found in user_roles. Please contact an Administrator.');
        setProfile(null);
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err: any) {
      console.error('Error fetching role profiling:', err);
      setError(err?.message || 'Failed to authenticate user role routing context.');
      setProfile(null);
    }
  }, []);

  const checkUserSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: userErr } = await supabase.auth.getUser();
      if (userErr || !data.user) {
        setUser(null);
        setProfile(null);
      } else {
        setUser(data.user);
        await fetchProfile(data.user.id, data.user.email || '');
      }
    } catch (err) {
      console.error('Session retrieval error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const signIn = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email });
      if (signErr) {
        setError(signErr.message);
        setLoading(false);
        return false;
      }
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id, data.user.email || '');
        setLoading(false);
        return true;
      }
      setLoading(false);
      return false;
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
      setLoading(false);
      return false;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Error on signout:', err);
    } finally {
      setLoading(false);
    }
  };

  // Immediate role switcher for evaluating the different views (Road Tech, Warehouse, Logistics Admin, etc.)
  const simulateRoleChange = async (role: UserProfile['role']) => {
    if (!profile) return;
    const updatedProfile = { ...profile, role };
    setProfile(updatedProfile);

    // Save user roles to synchronize back on database instances
    try {
      const stored = localStorage.getItem('dallmayr_mock_db');
      if (stored) {
        const db = JSON.parse(stored);
        const userRoles: UserProfile[] = db.user_roles || [];
        const idx = userRoles.findIndex(u => u.id === profile.id);
        if (idx !== -1) {
          userRoles[idx].role = role;
          db.user_roles = userRoles;
          localStorage.setItem('dallmayr_mock_db', JSON.stringify(db));
        }
      }

      // Also persist to real Supabase if it's active so previewing works bidirectionally
      const { data, error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('id', profile.id);
      
      if (error) {
        console.warn('Real Supabase update skipped or failed (common if not using real credentials):', error.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signIn, signOut, simulateRoleChange }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
