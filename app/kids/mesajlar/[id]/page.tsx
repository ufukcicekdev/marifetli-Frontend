'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsGetConversation,
  kidsListConversations,
  kidsListConversationMessages,
  kidsParentVerifyPassword,
  kidsSendConversationMessage,
  type KidsConversation,
  type KidsMessage,
} from '@/src/lib/kids-api';
import {
  KIDS_TOKEN_STORAGE_KEY,
  KIDS_UNIFIED_MAIN_AUTH_FLAG,
  kidsLoginPortalHref,
} from '@/src/lib/kids-config';
import {
  kidsParentMessagesHasRecentUnlock,
  kidsParentMessagesMarkUnlockedNow,
} from '@/src/lib/kids-parent-message-gate';
import {
  KidsCenteredModal,
  KidsPrimaryButton,
  KidsSecondaryButton,
  kidsTextareaClass,
} from '@/src/components/kids/kids-ui';
import { MessageCircle, Send, Smile, Sparkles, UserCircle2, Users, Wifi, WifiOff } from 'lucide-react';

const QUICK_EMOJIS = ['😀', '😂', '😍', '👏', '👍', '🙏', '🎉', '🔥', '❤️', '🌟'] as const;

export default function KidsConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = Number(params.id);
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [conversation, setConversation] = useState<KidsConversation | null>(null);
  const [rows, setRows] = useState<KidsConversation[]>([]);
  const [messages, setMessages] = useState<KidsMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const loadConversationList = async () => {
    setListLoading(true);
    try {
      const list = await kidsListConversations();
      setRows(list);
    } catch {
      // list errors should not block the chat panel
    } finally {
      setListLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [c, items, list] = await Promise.all([
        kidsGetConversation(conversationId),
        kidsListConversationMessages(conversationId),
        kidsListConversations(),
      ]);
      setConversation(c);
      setMessages(items);
      setRows(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Konuşma yüklenemedi');
      router.replace(`${pathPrefix}/mesajlar`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    if (user.role === 'student') {
      router.replace(`${pathPrefix}/ogrenci/panel`);
      return;
    }
    if (user.role === 'parent') {
      setAccessReady(kidsParentMessagesHasRecentUnlock());
      return;
    }
    setAccessReady(true);
  }, [authLoading, user, pathPrefix, router]);

  useEffect(() => {
    if (!accessReady) return;
    if (!user) return;
    if (!Number.isFinite(conversationId) || conversationId <= 0) {
      router.replace(`${pathPrefix}/mesajlar`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessReady, user, conversationId, pathPrefix, router]);

  const title = useMemo(
    () => conversation?.topic?.trim() || `Konuşma #${conversation?.id ?? ''}`,
    [conversation],
  );

  function realtimeToken(): string {
    if (typeof window === 'undefined') return '';
    const main = (localStorage.getItem('access_token') || '').trim();
    const kids = (localStorage.getItem(KIDS_TOKEN_STORAGE_KEY) || '').trim();
    const unified = localStorage.getItem(KIDS_UNIFIED_MAIN_AUTH_FLAG) === '1';
    if (unified) return main || kids;
    return kids || main;
  }

  function wsUrlForConversation(id: number, token: string): string {
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : '');
    const origin = new URL(base, typeof window !== 'undefined' ? window.location.origin : undefined).origin;
    const u = new URL(origin);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}/ws/kids/messages/${id}/?token=${encodeURIComponent(token)}`;
  }

  function touchConversationListNow() {
    setRows((prev) => {
      const nowIso = new Date().toISOString();
      const idx = prev.findIndex((r) => r.id === conversationId);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], last_message_at: nowIso };
      next.sort((a, b) => {
        const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return tb - ta;
      });
      return next;
    });
  }

  useEffect(() => {
    if (!accessReady) return;
    if (!user || !conversationId) return;
    const token = realtimeToken();
    if (!token) return;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      clearReconnectTimer();
      const url = wsUrlForConversation(conversationId, token);
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        setWsConnected(true);
        clearReconnectTimer();
      };
      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimerRef.current = window.setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        setWsConnected(false);
      };
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data || '{}')) as {
            type?: string;
            message?: KidsMessage;
          };
          if (payload?.type === 'message.new' && payload.message) {
            setMessages((prev) => {
              if (prev.some((x) => x.id === payload.message!.id)) return prev;
              return [...prev, payload.message!];
            });
            touchConversationListNow();
            void loadConversationList();
          }
        } catch {
          // ignore malformed payload
        }
      };
    };

    connect();
    return () => {
      clearReconnectTimer();
      const socket = wsRef.current;
      wsRef.current = null;
      try {
        socket?.close();
      } catch {
        // noop
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessReady, user, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  async function onSend() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'send_message', body }));
      } else {
        const row = await kidsSendConversationMessage(conversationId, body);
        setMessages((prev) => [...prev, row]);
      }
      setText('');
      touchConversationListNow();
      void loadConversationList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  }

  function appendEmoji(emoji: string) {
    setText((prev) => `${prev}${emoji}`);
  }

  function isOutgoingMessage(m: KidsMessage): boolean {
    if (!user) return false;
    if (user.role === 'student') return m.sender_student === user.id;
    return m.sender_user === user.id;
  }

  function userInitial(): string {
    if (!user) return '?';
    const f = (user.first_name || '').trim();
    const l = (user.last_name || '').trim();
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || user.email.charAt(0).toUpperCase() || '?';
  }

  function conversationTitle(c: KidsConversation): string {
    return c.topic?.trim() || `Konuşma #${c.id}`;
  }

  async function verifyPasswordAndUnlock() {
    const pass = password.trim();
    setPasswordError(null);
    if (!pass) {
      setPasswordError('Lütfen şifreni gir.');
      return;
    }
    setPasswordBusy(true);
    try {
      await kidsParentVerifyPassword(pass);
      kidsParentMessagesMarkUnlockedNow();
      setAccessReady(true);
      setPassword('');
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Şifre doğrulanamadı');
    } finally {
      setPasswordBusy(false);
    }
  }

  if (authLoading || !user || (accessReady && loading)) {
    return <p className="text-center text-sm text-violet-800 dark:text-violet-200">Yükleniyor…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden overflow-hidden rounded-3xl border-2 border-violet-200 bg-white/95 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.25)] dark:border-violet-800 dark:bg-gray-900/80 md:block">
          <div className="flex items-center gap-2 border-b border-violet-100 px-4 py-3 dark:border-violet-800">
            <MessageCircle className="h-4 w-4 text-violet-700 dark:text-violet-300" />
            <h2 className="font-logo text-lg font-bold text-violet-950 dark:text-violet-50">Mesajlar</h2>
          </div>
          <div className="max-h-[72vh] overflow-y-auto p-2">
            {listLoading ? <p className="px-2 py-2 text-xs text-slate-500">Liste güncelleniyor…</p> : null}
            {rows.length === 0 ? (
              <p className="px-2 py-2 text-sm text-slate-500 dark:text-slate-400">Henüz konuşma yok.</p>
            ) : (
              <ul className="space-y-1.5">
                {rows.map((c) => {
                  const active = c.id === conversationId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => router.push(`${pathPrefix}/mesajlar/${c.id}`)}
                        className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                          active
                            ? 'border-fuchsia-300 bg-fuchsia-50 dark:border-fuchsia-700 dark:bg-fuchsia-950/30'
                            : 'border-violet-100 bg-white hover:border-violet-300 hover:bg-violet-50 dark:border-violet-900 dark:bg-gray-900 dark:hover:border-violet-700 dark:hover:bg-violet-950/25'
                        }`}
                      >
                        <p className="truncate text-sm font-semibold text-violet-950 dark:text-violet-100">{conversationTitle(c)}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {c.last_message_at
                              ? new Date(c.last_message_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                              : 'Mesaj yok'}
                          </span>
                          {c.unread_count > 0 ? (
                            <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-bold text-white">
                              {c.unread_count}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="overflow-hidden rounded-3xl border-2 border-violet-200 bg-white/95 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.35)] dark:border-violet-800 dark:bg-gray-900/80">
          <div className="flex items-center justify-between border-b border-violet-100 bg-linear-to-r from-violet-50 to-fuchsia-50 px-4 py-3 dark:border-violet-800 dark:from-violet-950/50 dark:to-fuchsia-950/40">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-logo text-xl font-bold text-violet-950 dark:text-violet-50">{title}</h1>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {wsConnected ? 'Canlı mesajlaşma aktif' : 'Canlı bağlantı kuruluyor...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`${pathPrefix}/mesajlar`)}
                className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-bold text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200 md:hidden"
              >
                <Users className="h-3.5 w-3.5" />
                Kişiler
              </button>
              <div
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  wsConnected
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                }`}
              >
                {wsConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                {wsConnected ? 'Canlı' : 'Bağlanıyor'}
              </div>
            </div>
          </div>

          <div className="max-h-[56vh] space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_20%,#ffffff_80%,#f5f3ff_100%)] p-4 dark:bg-[linear-gradient(180deg,rgba(46,16,101,0.2)_0%,rgba(2,6,23,0.88)_35%,rgba(2,6,23,0.88)_100%)]">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-violet-100 bg-white/80 p-4 text-center dark:border-violet-900 dark:bg-violet-950/30">
                <p className="text-sm text-slate-500 dark:text-slate-400">Henüz mesaj yok.</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" /> İlk mesajı göndererek konuşmayı başlat.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const mine = isOutgoingMessage(m);
                return (
                  <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {!mine && (
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700 dark:bg-violet-900/60 dark:text-violet-200">
                        V
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                        mine
                          ? 'rounded-br-md bg-violet-600 text-white'
                          : 'rounded-bl-md border border-violet-100 bg-white text-slate-900 dark:border-violet-900 dark:bg-violet-950/60 dark:text-slate-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                      <p className={`mt-1 text-right text-[11px] ${mine ? 'text-violet-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {mine && (
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-fuchsia-100 text-[11px] font-bold text-fuchsia-700 dark:bg-fuchsia-900/60 dark:text-fuchsia-200">
                        {userInitial()}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-violet-100 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/80">
            <div className="space-y-2 rounded-2xl border border-violet-200 bg-violet-50/50 p-2.5 dark:border-violet-800 dark:bg-violet-950/30">
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-violet-200/70 bg-white/80 p-2 dark:border-violet-800 dark:bg-gray-950/60">
                <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                  <Smile className="h-3.5 w-3.5" />
                  Hızlı ikonlar
                </span>
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => appendEmoji(emoji)}
                    className="grid h-8 w-8 place-items-center rounded-full border border-violet-200 bg-white text-base transition hover:scale-105 hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-950/40"
                    aria-label={`İkon ekle ${emoji}`}
                    title={`İkon ekle ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
                placeholder="Mesaj yazın... (Enter: gönder, Shift+Enter: yeni satır)"
                className={kidsTextareaClass}
              />
              <div className="flex justify-end">
                <KidsPrimaryButton type="button" disabled={sending || !text.trim()} onClick={() => void onSend()}>
                  <span className="inline-flex items-center gap-1.5">
                    <Send className="h-4 w-4" />
                    {sending ? 'Gönderiliyor…' : 'Gönder'}
                  </span>
                </KidsPrimaryButton>
              </div>
            </div>
          </div>
        </section>
      </div>
      {user.role === 'parent' && !accessReady ? (
        <KidsCenteredModal title="Mesajlar için şifre doğrulaması" onClose={() => router.replace(`${pathPrefix}/veli/panel`)}>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Veli mesajlarını görüntülemek için hesabının şifresini gir. Bu doğrulama 15 dakika boyunca geçerli olur.
          </p>
          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
            Hesap şifren
          </label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!passwordBusy) void verifyPasswordAndUnlock();
              }
            }}
            disabled={passwordBusy}
            className="mt-2 w-full rounded-xl border-2 border-violet-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-400/25 dark:border-violet-700 dark:bg-gray-800 dark:text-white"
            placeholder="••••••••"
          />
          {passwordError ? (
            <p className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              {passwordError}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <KidsSecondaryButton type="button" disabled={passwordBusy} onClick={() => router.replace(`${pathPrefix}/veli/panel`)}>
              Vazgeç
            </KidsSecondaryButton>
            <KidsPrimaryButton type="button" disabled={passwordBusy} onClick={() => void verifyPasswordAndUnlock()}>
              {passwordBusy ? 'Doğrulanıyor…' : 'Devam et'}
            </KidsPrimaryButton>
          </div>
        </KidsCenteredModal>
      ) : null}
    </div>
  );
}
