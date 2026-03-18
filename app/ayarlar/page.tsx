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
    <div className="min-h-screen overflow-x-hidden">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-2xl min-w-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Hesap Ayarları</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Profil ve bildirim tercihlerinizi yönetin.</p>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/60 mb-8 overflow-x-auto">
          <button
            onClick={() => setTab('profil')}
            className={`px-5 py-2.5 font-medium rounded-lg transition-all ${
              tab === 'profil'
                ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Profil
          </button>
          <button
            onClick={() => setTab('bildirimler')}
            className={`px-5 py-2.5 font-medium rounded-lg transition-all ${
              tab === 'bildirimler'
                ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Bildirimler
          </button>
        </div>

        {tab === 'profil' && user && !user.is_verified && (
          <div className="mb-6 p-5 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100">
            <p className="text-sm font-semibold mb-1">E-posta adresiniz henüz doğrulanmadı</p>
            <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
              Gönderi paylaşmak, yorum ve beğeni yapmak için e-postanıza gelen doğrulama linkine tıklayın. Mail gelmediyse tekrar gönderebilirsiniz.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendVerificationLoading}
              className="px-4 py-2.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-xl disabled:opacity-60 transition-colors"
            >
              {resendVerificationLoading ? 'Gönderiliyor…' : 'Doğrulama mailini tekrar gönder'}
            </button>
          </div>
        )}

        {tab === 'profil' && (
          <form onSubmit={handleSaveProfil} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Bölüm: Profil fotoğrafı */}
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Profil Fotoğrafı</h2>
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-700">
                  {user?.profile_picture ? (
                    <OptimizedAvatar src={user.profile_picture} size={80} alt="" className="w-full h-full" />
                  ) : (
                    <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">
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
                    className="px-4 py-2.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-colors"
                  >
                    {uploadAvatar.isPending ? 'Yükleniyor...' : 'Fotoğraf Seç'}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">JPG, PNG veya GIF (max 2MB)</p>
                </div>
              </div>
            </div>

            {/* Bölüm: Kişisel bilgiler */}
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 space-y-5">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Kişisel Bilgiler</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ad</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Soyad</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cinsiyet</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
                >
                  <option value="">Belirtmek istemiyorum</option>
                  <option value="male">Erkek</option>
                  <option value="female">Kadın</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hakkımda</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{form.bio.length}/500</p>
              </div>
            </div>

            {/* Bölüm: Konum & Web */}
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 space-y-5">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Konum & Bağlantılar</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Konum</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Örn: İstanbul"
                  maxLength={30}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Web Sitesi</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Sosyal medya */}
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 space-y-4">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Sosyal medya</h2>
              <div className="relative" ref={socialDropdownRef}>
                <button
                  type="button"
                  onClick={() => setSocialDropdownOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-500 transition-colors text-left"
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
                  <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20">
                    {SOCIAL_PLATFORMS.filter((p) => !socialLinks.some((l) => l.platform === p.key)).length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Tüm platformlar eklendi</div>
                    ) : (
                      SOCIAL_PLATFORMS.filter((p) => !socialLinks.some((l) => l.platform === p.key)).map(({ key, label, icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSocialLinks((prev) => [...prev, { platform: key, url: '' }]);
                            setSocialDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
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
                      className="flex gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40"
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
                          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500/30"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSocialLinks((prev) => prev.filter((_, i) => i !== index))}
                        className="shrink-0 p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Kaldır"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 sm:p-8 flex justify-end">
              <button
                type="submit"
                disabled={updateUser.isPending || updateProfile.isPending}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl disabled:opacity-50 transition-colors shadow-sm"
              >
                {updateUser.isPending || updateProfile.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}

        {tab === 'bildirimler' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
            {notifLoading ? (
              <div className="animate-pulse h-48 p-6 space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ) : (
              <>
                <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Bildirim tercihleri</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Hangi bildirimleri almak istediğinizi seçin.
                  </p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { key: 'email_notifications', label: 'E-posta bildirimleri', desc: 'Önemli güncellemeler e-posta ile gelsin' },
                    { key: 'push_notifications', label: 'Tarayıcı bildirimleri', desc: 'Tarayıcıda anlık bildirim' },
                    { key: 'desktop_notifications', label: 'Masaüstü bildirimleri', desc: 'Masaüstü uygulamasında bildirim' },
                    { key: 'notify_on_answer', label: 'Soruma cevap verildiğinde', desc: 'Sorunuza yeni cevap geldiğinde' },
                    { key: 'notify_on_like', label: 'Beğeni aldığımda', desc: 'Gönderiniz veya cevabınız beğenildiğinde' },
                    { key: 'notify_on_follow', label: 'Beni takip ettiğinde', desc: 'Yeni takipçi olduğunda' },
                    { key: 'notify_mention', label: 'Benden bahsedildiğinde', desc: 'Bir yorumda @kullanıcıadı ile etiketlendiğinizde' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 px-6 sm:px-8 py-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
                        {desc && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>}
                      </div>
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
                        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                          (notifSettings as Record<string, boolean>)?.[key]
                            ? 'bg-orange-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                            (notifSettings as Record<string, boolean>)?.[key] ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
