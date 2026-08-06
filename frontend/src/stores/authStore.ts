import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      isAuthenticated: false,
      setSession: (session) => {
        set({
          session,
          user: session ? session.user : null,
          isAuthenticated: !!session,
        });
      },
      clearSession: () => {
        set({
          session: null,
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'bloodping-auth-storage', // Unique name for the key in localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);
