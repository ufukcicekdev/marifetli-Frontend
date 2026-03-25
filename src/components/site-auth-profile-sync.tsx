'use client';

import { useEffect } from 'react';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';

/**
 * Giriş varken mount’ta sunucudan güncel kullanıcıyı alır (`is_staff` / `is_superuser` dahil).
 * sessionStorage kilidi kullanmıyoruz: bir kez yanlış/boş cache yazılınca Yönetim hep kayboluyordu
 * (özellikle production / backend güncellemesi sonrası).
 */
export function SiteAuthProfileSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!isAuthenticated || !userId || typeof window === 'undefined') return;
    let cancelled = false;
    api
      .getCurrentUser()
      .then((r) => {
        if (!cancelled) setUser(r.data);
      })
      .catch(() => {
        /* 401 / ağ */
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, setUser]);

  return null;
}
