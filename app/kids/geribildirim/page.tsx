'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsGetMyFeedback, kidsSendFeedback, type KidsFeedbackCategory, type KidsFeedbackItem } from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { KidsCard, KidsPageHeader, KidsPanelMax, KidsPrimaryButton } from '@/src/components/kids/kids-ui';

const CATEGORIES: { value: KidsFeedbackCategory; label: string; emoji: string }[] = [
  { value: 'suggestion', label: 'Öneri', emoji: '💡' },
  { value: 'bug', label: 'Hata', emoji: '🐛' },
  { value: 'praise', label: 'Övgü', emoji: '🌟' },
  { value: 'general', label: 'Genel', emoji: '💬' },
];

const CATEGORY_LABELS: Record<string, string> = {
  suggestion: '💡 Öneri',
  bug: '🐛 Hata',
  praise: '🌟 Övgü',
  general: '💬 Genel',
};

export default function KidsGeribildirimPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();

  const [category, setCategory] = useState<KidsFeedbackCategory>('general');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<KidsFeedbackItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    kidsGetMyFeedback()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [authLoading, user, router, pathPrefix]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const fb = await kidsSendFeedback({ message: message.trim(), category, rating });
      toast.success('Görüşünüz iletildi, teşekkürler! 🎉');
      setMessage('');
      setRating(null);
      setCategory('general');
      setHistory((prev) => [
        {
          id: fb.id,
          role: user?.role ?? 'other',
          category,
          rating,
          message: message.trim(),
          created_at: fb.created_at,
        },
        ...prev,
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gönderilemedi');
    } finally {
      setSending(false);
    }
  }

  if (authLoading || !user) return null;

  return (
    <KidsPanelMax>
      <KidsPageHeader
        emoji="💬"
        title="Görüş ve Öneriler"
        subtitle="Marifetli'yi birlikte geliştirelim. Her geri bildirim değerlidir."
      />

      <div className="mx-auto max-w-xl space-y-8">
        {/* Form */}
        <KidsCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Konu</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
                      category === c.value
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Puan (isteğe bağlı)
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(rating === s ? null : s)}
                    className={`text-3xl transition-transform hover:scale-110 ${
                      rating !== null && s <= rating ? 'text-amber-400' : 'text-zinc-300 dark:text-zinc-600'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Mesajınız
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Düşüncelerinizi, önerilerinizi veya karşılaştığınız sorunları buraya yazın…"
                rows={5}
                maxLength={2000}
                className="w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-slate-800 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <p className="mt-1 text-right text-xs text-zinc-400">{message.length} / 2000</p>
            </div>

            <KidsPrimaryButton type="submit" disabled={!message.trim() || sending}>
              {sending ? 'Gönderiliyor…' : 'Görüşü Gönder ✉️'}
            </KidsPrimaryButton>
          </form>
        </KidsCard>

        {/* Geçmiş */}
        {(historyLoading || history.length > 0) && (
          <div>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Önceki Gönderimleriniz
            </h2>
            {historyLoading ? (
              <p className="text-center text-sm text-slate-400">Yükleniyor…</p>
            ) : (
              <div className="space-y-3">
                {history.map((fb) => (
                  <KidsCard key={fb.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-violet-100 px-3 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                        {CATEGORY_LABELS[fb.category] ?? fb.category}
                      </span>
                      <div className="flex items-center gap-2">
                        {fb.rating && (
                          <span className="text-xs font-bold text-amber-500">
                            {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">
                          {new Date(fb.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-zinc-300">{fb.message}</p>
                  </KidsCard>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </KidsPanelMax>
  );
}
