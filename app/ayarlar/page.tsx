'use client';

import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import { useAuthStore } from '@/src/stores/auth-store';

type Tab = 'profil' | 'bildirimler';

const SOCIAL_PLATFORMS = [
  { key: 'instagram_url', label: 'Instagram', icon: '📷' },
  { key: 'twitter_url', label: 'X (Twitter)', icon: '𝕏' },
  { key: 'facebook_url', label: 'Facebook', icon: 'f' },
  { key: 'linkedin_url', label: 'LinkedIn', icon: 'in' },
  { key: 'youtube_url', label: 'YouTube', icon: '▶' },
  { key: 'pinterest_url', label: 'Pinterest', icon: 'P' },
] as const;

interface NotificationSetting {
  id?: number;
  email_notifications: boolean;
  push_notifications: boolean;
  desktop_notifications: boolean;
  notify_on_answer: boolean;
  notify_on_like: boolean;
  notify_on_follow: boolean;
  notify_mention: boolean;
}

export default function AyarlarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profil');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/giris');
      return;
    }
    setHasAccess(true);
  }, [router]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => api.getMyProfile().then((r) => r.data),
    enabled: hasAccess === true,
  });

  const { data: notifSettings, isLoading: notifLoading } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => api.getNotificationSettings().then((r) => r.data),
    enabled: hasAccess === true,
  });

  const updateUser = useMutation({
    mutationFn: (data: { first_name?: string; last_name?: string; bio?: string; gender?: string }) =>
      api.updateUser(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['user', user?.username] });
      const u = useAuthStore.getState().user;
      if (u && res.data) useAuthStore.getState().setUser({ ...u, ...res.data });
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => api.uploadProfilePicture(file),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      const u = useAuthStore.getState().user;
      if (u && res.data) useAuthStore.getState().setUser({ ...u, ...res.data });
      toast.success('Profil fotoğrafı güncellendi');
    },
    onError: () => toast.error('Fotoğraf yüklenemedi'),
  });

  const updateProfile = useMutation({
    mutationFn: (data: {
      location?: string;
      website?: string;
      instagram_url?: string;
      twitter_url?: string;
      facebook_url?: string;
      linkedin_url?: string;
      youtube_url?: string;
      pinterest_url?: string;
    }) => api.updateUserProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      toast.success('Profil kaydedildi');
    },
    onError: () => toast.error('Kaydetme başarısız'),
  });

  const updateNotif = useMutation({
    mutationFn: (data: Partial<NotificationSetting>) => api.updateNotificationSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      toast.success('Bildirim ayarları güncellendi');
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const socialDropdownRef = useRef<HTMLDivElement>(null);
  const [socialDropdownOpen, setSocialDropdownOpen] = useState(false);
  const [resendVerificationLoading, setResendVerificationLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    gender: '',
    location: '',
    website: '',
  });
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        bio: user.bio || '',
        gender: user.gender || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        location: profile.location || '',
        website: profile.website || '',
      }));
      const links: { platform: string; url: string }[] = [];
      SOCIAL_PLATFORMS.forEach(({ key }) => {
        const url = profile[key as keyof typeof profile];
        if (typeof url === 'string' && url.trim()) {
          links.push({ platform: key, url: url.trim() });
        }
      });
      setSocialLinks(links);
    }
  }, [profile]);

  const handleSaveProfil = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser.mutate({
      first_name: form.first_name,
      last_name: form.last_name,
      bio: form.bio,
      gender: form.gender || undefined,
    });
    const socialPayload: Record<string, string> = {};
    SOCIAL_PLATFORMS.forEach(({ key }) => {
      const link = socialLinks.find((l) => l.platform === key);
      socialPayload[key] = link?.url?.trim() || '';
    });
    updateProfile.mutate({
      location: form.location,
      website: form.website,
      ...socialPayload,
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadAvatar.mutate(file);
    }
    e.target.value = '';
  };

  const handleNotifToggle = (key: keyof NotificationSetting, value: boolean) => {
    updateNotif.mutate({ [key]: value });
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (socialDropdownRef.current && !socialDropdownRef.current.contains(e.target as Node)) {
        setSocialDropdownOpen(false);
      }
    }
    if (socialDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [socialDropdownOpen]);

  const handleResendVerification = async () => {
    if (resendVerificationLoading || user?.is_verified) return;
    setResendVerificationLoading(true);
    try {
      const res = await api.resendVerificationEmail();
      toast.success(res.data?.message ?? 'Doğrulama linki e-postanıza gönderildi.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      toast.error(e.response?.data?.error ?? e.response?.data?.message ?? 'Gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setResendVerificationLoading(false);
    }
  };

  if (hasAccess !== true) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-2xl min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Hesap Ayarları</h1>

        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
          <button
            onClick={() => setTab('profil')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
              tab === 'profil'
                ? 'bg-white dark:bg-gray-800 text-orange-500 border border-b-0 border-gray-200 dark:border-gray-700'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
            }`}
          >
            Profil
          </button>
          <button
            onClick={() => setTab('bildirimler')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
              tab === 'bildirimler'
                ? 'bg-white dark:bg-gray-800 text-orange-500 border border-b-0 border-gray-200 dark:border-gray-700'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
            }`}
          >
            Bildirimler
          </button>
        </div>

        {tab === 'profil' && user && !user.is_verified && (
          <div className="mb-6 p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100">
            <p className="text-sm font-medium mb-1">E-posta adresiniz henüz doğrulanmadı</p>
            <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
              Gönderi paylaşmak, yorum ve beğeni yapmak için e-postanıza gelen doğrulama linkine tıklayın. Mail gelmediyse tekrar gönderebilirsiniz.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendVerificationLoading}
              className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-60"
            >
              {resendVerificationLoading ? 'Gönderiliyor…' : 'Doğrulama mailini tekrar gönder'}
            </button>
          </div>
        )}

        {tab === 'profil' && (
          <form onSubmit={handleSaveProfil} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profil Fotoğrafı</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                  {user?.profile_picture ? (
                    <OptimizedAvatar src={user.profile_picture} size={80} alt="" className="w-full h-full" />
                  ) : (
                    <span className="text-2xl font-bold text-gray-500">
                      {(user?.first_name || user?.username)?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadAvatar.isPending}
                    className="px-4 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg"
                  >
                    {uploadAvatar.isPending ? 'Yükleniyor...' : 'Fotoğraf Seç'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG veya GIF (max 2MB)</p>
                </div>
              </div>
            </div>

            {/* Ad / Soyad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ad</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soyad</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Cinsiyet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cinsiyet</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Belirtmek istemiyorum</option>
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
                <option value="other">Diğer</option>
              </select>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hakkımda</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">{form.bio.length}/500</p>
            </div>

            {/* Konum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konum</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Örn: İstanbul"
                maxLength={30}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Web Sitesi</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Sosyal medya linkleri - custom dropdown ile ekleme */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sosyal medya</h3>
              <div className="relative" ref={socialDropdownRef}>
                <button
                  type="button"
                  onClick={() => setSocialDropdownOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 transition-colors text-left"
                >
                  <span className="text-gray-500 dark:text-gray-400">Platform seçin...</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${socialDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {socialDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                    {SOCIAL_PLATFORMS.filter((p) => !socialLinks.some((l) => l.platform === p.key)).length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Tüm platformlar eklendi</div>
                    ) : (
                      SOCIAL_PLATFORMS.filter((p) => !socialLinks.some((l) => l.platform === p.key)).map(({ key, label, icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSocialLinks((prev) => [...prev, { platform: key, url: '' }]);
                            setSocialDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span>{icon}</span>
                          <span>{label}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {socialLinks.map((item, index) => {
                  const platformInfo = SOCIAL_PLATFORMS.find((p) => p.key === item.platform);
                  return (
                    <div
                      key={`${item.platform}-${index}`}
                      className="flex gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-lg shrink-0">{platformInfo?.icon ?? '🔗'}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">{platformInfo?.label ?? item.platform}</span>
                        <input
                          type="url"
                          value={item.url}
                          onChange={(e) =>
                            setSocialLinks((prev) =>
                              prev.map((l, i) => (i === index ? { ...l, url: e.target.value } : l))
                            )
                          }
                          placeholder="https://..."
                          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSocialLinks((prev) => prev.filter((_, i) => i !== index))}
                        className="shrink-0 p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Kaldır"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateUser.isPending || updateProfile.isPending}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg disabled:opacity-50"
              >
                {updateUser.isPending || updateProfile.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}

        {tab === 'bildirimler' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            {notifLoading ? (
              <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded" />
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Hangi bildirimleri almak istediğinizi seçin.
                </p>
                {[
                  { key: 'email_notifications', label: 'E-posta bildirimleri' },
                  { key: 'push_notifications', label: 'Tarayıcı bildirimleri' },
                  { key: 'desktop_notifications', label: 'Masaüstü bildirimleri' },
                  { key: 'notify_on_answer', label: 'Soruma cevap verildiğinde' },
                  { key: 'notify_on_like', label: 'Beğeni aldığımda' },
                  { key: 'notify_on_follow', label: 'Beni takip ettiğinde' },
                  { key: 'notify_mention', label: 'Benden bahsedildiğinde' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <span className="text-gray-700 dark:text-gray-300">{label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!(notifSettings as Record<string, boolean>)?.[key]}
                      onClick={() =>
                        handleNotifToggle(
                          key as keyof NotificationSetting,
                          !(notifSettings as Record<string, boolean>)?.[key]
                        )
                      }
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        (notifSettings as Record<string, boolean>)?.[key]
                          ? 'bg-orange-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          (notifSettings as Record<string, boolean>)?.[key] ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
