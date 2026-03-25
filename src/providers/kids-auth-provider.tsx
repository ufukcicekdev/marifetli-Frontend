'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  kidsClearSession,
  kidsLogin,
  kidsLoginViaMainSiteApi,
  kidsMe,
  kidsSyncMainSiteAuthStore,
  type KidsUser,
} from '@/src/lib/kids-api';
import { KIDS_TOKEN_STORAGE_KEY, KIDS_UNIFIED_MAIN_AUTH_FLAG } from '@/src/lib/kids-config';
export type KidsAuthLoginOptions = {
  /** true: ana site `/auth/login/` (veli/öğretmen); false: Kids `/auth/login/` (öğrenci). */
  useMainSitePortal?: boolean;
};

type KidsAuthContextValue = {
  pathPrefix: string;
  user: KidsUser | null;
  loading: boolean;
  login: (email: string, password: string, options?: KidsAuthLoginOptions) => Promise<KidsUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** Token’lar zaten yazıldıysa (ör. veli→çocuk switch) sunucunun user yanıtını doğrudan uygula. */
  setUserFromServer: (user: KidsUser) => void;
};

const KidsAuthContext = createContext<KidsAuthContextValue | null>(null);

export function KidsAuthProvider({
  pathPrefix,
  children,
}: {
  pathPrefix: string;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<KidsUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const unified = localStorage.getItem(KIDS_UNIFIED_MAIN_AUTH_FLAG) === '1';
    const kidsTok = localStorage.getItem(KIDS_TOKEN_STORAGE_KEY);
    const mainTok = localStorage.getItem('access_token');
    if (unified ? !mainTok : !kidsTok && !mainTok) {
      setUser(null);
      return;
    }
    try {
      const me = await kidsMe();
      setUser(me);
      if (typeof window !== 'undefined' && localStorage.getItem(KIDS_UNIFIED_MAIN_AUTH_FLAG) === '1') {
        await kidsSyncMainSiteAuthStore();
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string, options?: KidsAuthLoginOptions) => {
    if (options?.useMainSitePortal) {
      const u = await kidsLoginViaMainSiteApi(email, password);
      setUser(u);
      return u;
    }
    const data = await kidsLogin(email.trim(), password);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    kidsClearSession();
    setUser(null);
  }, []);

  const setUserFromServer = useCallback((u: KidsUser) => {
    setUser(u);
  }, []);

  const value = useMemo(
    () => ({
      pathPrefix,
      user,
      loading,
      login,
      logout,
      refreshUser,
      setUserFromServer,
    }),
    [pathPrefix, user, loading, login, logout, refreshUser, setUserFromServer],
  );

  return <KidsAuthContext.Provider value={value}>{children}</KidsAuthContext.Provider>;
}

export function useKidsAuth() {
  const ctx = useContext(KidsAuthContext);
  if (!ctx) throw new Error('useKidsAuth sadece Kids içinde kullanılabilir');
  return ctx;
}
