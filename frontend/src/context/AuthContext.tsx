import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../stores/authStore';
import { Session, User } from '@supabase/supabase-js';
import apiClient from '../services/apiClient';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasProfile: boolean | null;
  setHasProfile: (val: boolean | null) => void;
  logout: () => Promise<void>;
  checkProfilePresence: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { session, setSession, clearSession } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const checkProfilePresence = async (_userId: string) => {
    try {
      // Call backend `/users/me` (requires Bearer token, which our apiClient attaches)
      const response = await apiClient.get('/users/me');
      if (response.status === 200) {
        setHasProfile(true);
      } else {
        setHasProfile(false);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setHasProfile(false);
      } else {
        console.error('Error verifying profile presence:', err);
        setHasProfile(false); // Default to false to prompt profile setup
      }
    }
  };

  useEffect(() => {
    // Hydrate session and check validity on application mount
    const hydrateSession = async () => {
      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        
        if (activeSession) {
          const currentTime = Math.floor(Date.now() / 1000);
          // If token has already expired
          if (activeSession.expires_at && activeSession.expires_at <= currentTime) {
            // Attempt to refresh the session
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) {
              console.warn('Session expired and auto-refresh failed. Clearing auth state.');
              await supabase.auth.signOut();
              clearSession();
              setHasProfile(null);
              setIsLoading(false);
              return;
            }
            setSession(refreshData.session);
            await checkProfilePresence(refreshData.session.user.id);
            setIsLoading(false);
            return;
          }
          setSession(activeSession);
          await checkProfilePresence(activeSession.user.id);
        } else {
          setSession(activeSession);
          setHasProfile(null);
        }
      } catch (err) {
        console.error('Session hydration failed:', err);
        clearSession();
        setHasProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    hydrateSession();

    // Subscribe to auth state updates (sign in, sign out, redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, activeSession) => {
      if (activeSession) {
        setSession(activeSession);
        await checkProfilePresence(activeSession.user.id);
      } else {
        clearSession();
        setHasProfile(null);
      }
      setIsLoading(false);
    });

    // Check expiration periodically (every 30 seconds) and auto-refresh if expiring in < 60s
    const checkExpiryInterval = setInterval(() => {
      const currentSession = useAuthStore.getState().session;
      if (currentSession && currentSession.expires_at) {
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentSession.expires_at - currentTime <= 60) {
          console.log('Session token is close to expiring. Refreshing session...');
          supabase.auth.refreshSession().then(({ data, error }) => {
            if (error || !data.session) {
              console.warn('Auto token-refresh failed. Logging user out.');
              supabase.auth.signOut();
              clearSession();
              setHasProfile(null);
            } else {
              setSession(data.session);
            }
          });
        }
      }
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(checkExpiryInterval);
    };
  }, [setSession, clearSession]);

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      clearSession();
      setHasProfile(null);
      setIsLoading(false);
    }
  };

  const user = session ? session.user : null;
  const isAuthenticated = !!session;

  return (
    <AuthContext.Provider value={{ session, user, isAuthenticated, isLoading, hasProfile, setHasProfile, logout, checkProfilePresence }}>
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
