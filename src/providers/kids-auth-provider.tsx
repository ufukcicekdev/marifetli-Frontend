'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { kidsClearSession, kidsLogin, kidsMe, type KidsUser } from '@/src/lib/kids-api';
import { KIDS_TOKEN_STORAGE_KEY } from '@/src/lib/kids-config';

type KidsAuthContextValue = {
  pathPrefix: string;
  user: KidsUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<KidsUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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
    const token = typeof window !== 'undefined' ? localStorage.getItem(KIDS_TOKEN_STORAGE_KEY) : null;
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await kidsMe();
      setUser(me);
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

  const login = useCallback(async (email: string, password: string) => {
    const data = await kidsLogin(email.trim(), password);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    kidsClearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      pathPrefix,
      user,
      loading,
      login,
      logout,
      refreshUser,
    }),
    [pathPrefix, user, loading, login, logout, refreshUser],
  );

  return <KidsAuthContext.Provider value={value}>{children}</KidsAuthContext.Provider>;
}

export function useKidsAuth() {
  const ctx = useContext(KidsAuthContext);
  if (!ctx) throw new Error('useKidsAuth sadece Kids içinde kullanılabilir');
  return ctx;
}
