'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { kidsSendFeedback, type KidsFeedbackCategory } from '@/src/lib/kids-api';

const STORAGE_KEY = 'marifetli_kids_feedback_dismissed';
const SNOOZE_DAYS = 30;

export function shouldShowFeedbackModal(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return true;
  try {
    const { permanent, until } = JSON.parse(raw) as { permanent?: boolean; until?: number };
    if (permanent) return false;
    if (until && Date.now() < until) return false;
  } catch {
    // parse hatası — göster
  }
  return true;
}

export function dismissFeedbackModal(permanent: boolean) {
  const val = permanent
    ? { permanent: true }
    : { until: Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
}

const CATEGORIES: { value: KidsFeedbackCategory; label: string; emoji: string }[] = [
  { value: 'suggestion', label: 'Öneri', emoji: '💡' },
  { value: 'bug', label: 'Hata', emoji: '🐛' },
  { value: 'praise', label: 'Övgü', emoji: '🌟' },
  { value: 'general', label: 'Genel', emoji: '💬' },
];

interface Props {
  onClose: () => void;
}

export function KidsFeedbackModal({ onClose }: Props) {
  const [category, setCategory] = useState<KidsFeedbackCategory>('general');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [neverShow, setNeverShow] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function handleDismiss() {
    dismissFeedbackModal(neverShow);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await kidsSendFeedback({ message: message.trim(), category, rating });
      dismissFeedbackModal(neverShow);
      setSent(true);
    } catch {
      toast.error('Gönderilemedi, tekrar dene.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-zinc-900">
        {sent ? (
          /* Teşekkür ekranı */
          <div className="flex flex-col items-center gap-4 px-8 py-10 text-center">
            <span className="text-5xl">🎉</span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Teşekkürler!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Görüşün bize ulaştı. Platformu daha iyi hale getirmek için çalışmaya devam edeceğiz.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full rounded-2xl bg-violet-600 py-3 text-sm font-black text-white"
            >
              Kapat
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-500">Marifetli Kids</p>
                <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  Görüş ve Önerileriniz 💬
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Platformu birlikte geliştirelim. Her görüş değerli!
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="ml-3 mt-1 shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {/* Kategori */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      category === c.value
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>

              {/* Yıldız puanı */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Genel deneyiminizi puanlayın (isteğe bağlı)
                </p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(rating === s ? null : s)}
                      className={`text-2xl transition-transform hover:scale-110 ${
                        rating !== null && s <= rating ? 'text-amber-400' : 'text-zinc-300 dark:text-zinc-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Mesaj */}
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Düşüncelerinizi yazın…"
                  rows={4}
                  maxLength={2000}
                  className="w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-slate-800 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
                <p className="mt-1 text-right text-[11px] text-zinc-400">{message.length} / 2000</p>
              </div>

              {/* Bir daha gösterme */}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={neverShow}
                  onChange={(e) => setNeverShow(e.target.checked)}
                  className="h-4 w-4 rounded accent-violet-600"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">Bir daha gösterme</span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 rounded-2xl border border-zinc-200 py-2.5 text-sm font-bold text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
              >
                Şimdi Değil
              </button>
              <button
                type="submit"
                disabled={!message.trim() || sending}
                className="flex-1 rounded-2xl bg-violet-600 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                {sending ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
