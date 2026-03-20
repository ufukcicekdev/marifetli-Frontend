import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User as AppUser } from '@/src/types';

/**
 * Oturum kullanıcısı — API User ile aynı; reputation bazı uçlarda ek gelir.
 */
export type User = AppUser & {
  reputation?: number;
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken);
        }
        set({ user, accessToken, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    { name: 'marifetli-auth' }
  )
);
