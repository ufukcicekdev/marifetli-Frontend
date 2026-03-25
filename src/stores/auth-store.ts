import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User as AppUser } from '@/src/types';
import {
  KIDS_REFRESH_STORAGE_KEY,
  KIDS_TOKEN_STORAGE_KEY,
  KIDS_UNIFIED_MAIN_AUTH_FLAG,
} from '@/src/lib/kids-config';

const MAIN_SITE_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

function clearKidsLocalSessionKeys() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KIDS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(KIDS_REFRESH_STORAGE_KEY);
  localStorage.removeItem(KIDS_UNIFIED_MAIN_AUTH_FLAG);
}

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

/**
 * `access_token` tek kaynak: Kids’ten ana siteye geçince veya persist gecikmesinde
 * store boş kalabiliyordu — `/auth/me/` ile doldurur.
 */
export async function reconcileAuthStoreWithAccessToken(): Promise<void> {
  if (typeof window === 'undefined') return;
  const token = (localStorage.getItem('access_token') || '').trim();
  const state = useAuthStore.getState();

  if (!token) {
    if (state.isAuthenticated) {
      useAuthStore.getState().logout();
    }
    return;
  }

  if (state.isAuthenticated && state.accessToken === token) {
    return;
  }

  try {
    const res = await fetch(`${MAIN_SITE_API_BASE}/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      useAuthStore.getState().logout();
      clearKidsLocalSessionKeys();
      return;
    }
    if (!res.ok) return;
    const user = (await res.json()) as AppUser;
    useAuthStore.getState().setAuth(user, token);
  } catch {
    /* ağ hatası — oturumu silme */
  }
}
