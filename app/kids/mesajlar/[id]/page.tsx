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
import { KidsCenteredModal, KidsPrimaryButton, KidsSecondaryButton } from '@/src/components/kids/kids-ui';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import {
  Download,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Send,
  Smile,
  Sparkles,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { MediaLightbox } from '@/src/components/media-lightbox';
import type { MediaItem } from '@/src/lib/extract-media';

const QUICK_EMOJIS = ['😀', '😂', '😍', '👏', '👍', '🙏', '🎉', '🔥', '❤️', '🌟'] as const;
const MAX_IMAGE_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_FILE_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function topicInitials(topic: string): string {
  const parts = (topic || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return '?';
  return parts.map((p) => (p[0] || '').toUpperCase()).join('').slice(0, 2);
}

function calendarDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function KidsConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = Number(params.id);
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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
      toast.error(e instanceof Error ? e.message : t('messageDetail.loadError'));
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
    () =>
      conversation?.topic?.trim() ||
      t('messages.conversationFallback').replace('{id}', String(conversation?.id ?? '')),
    [conversation, t],
  );

  const imageItems = useMemo<MediaItem[]>(
    () =>
      messages
        .filter((m) => m.attachment && isImageAttachment(m.attachment.content_type, m.attachment.original_name))
        .map((m) => ({ url: m.attachment!.url, type: 'image' as const })),
    [messages],
  );

  const peerAvatarInitial = useMemo(() => topicInitials(title), [title]);

  const messagesWithDayBreaks = useMemo(() => {
    const today = new Date();
    const todayKey = calendarDayKey(today);
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const yesterdayKey = calendarDayKey(y);
    const locale = language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US';
    let prevKey = '';
    return messages.map((m) => {
      const d = new Date(m.created_at);
      const key = calendarDayKey(d);
      const showDay = key !== prevKey;
      prevKey = key;
      let dayLabel = '';
      if (showDay) {
        if (key === todayKey) dayLabel = t('messageDetail.today');
        else if (key === yesterdayKey) dayLabel = t('messageDetail.yesterday');
        else dayLabel = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
      }
      return { m, showDay, dayLabel };
    });
  }, [messages, language, t]);

  function formatConversationListTime(iso: string | null): string {
    if (!iso) return t('messageDetail.noMessage');
    const d = new Date(iso);
    const locale = language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US';
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startToday - startMsg) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return t('messageDetail.yesterday');
    if (diffDays < 7) return d.toLocaleDateString(locale, { weekday: 'short' });
    return d.toLocaleDateString(locale, { dateStyle: 'short' });
  }

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
    if (!body && !selectedFile) return;
    setSending(true);
    try {
      const ws = wsRef.current;
      if (!selectedFile && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'send_message', body }));
      } else {
        const row = await kidsSendConversationMessage(conversationId, body, selectedFile);
        setMessages((prev) => [...prev, row]);
      }
      setText('');
      setSelectedFile(null);
      touchConversationListNow();
      void loadConversationList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('messageDetail.sendError'));
    } finally {
      setSending(false);
    }
  }

  function appendEmoji(emoji: string) {
    setText((prev) => `${prev}${emoji}`);
  }

  function formatBytesTr(size: number): string {
    if (!Number.isFinite(size) || size <= 0) return '0 B';
    if (size < 1024) return `${size} B`;
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  function isImageAttachment(contentType?: string | null, name?: string | null): boolean {
    const ct = (contentType || '').toLowerCase();
    if (ct.startsWith('image/')) return true;
    const lowerName = (name || '').toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].some((ext) => lowerName.endsWith(ext));
  }

  function onPickFile(file: File | null) {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const image = file.type.startsWith('image/');
    const max = image ? MAX_IMAGE_ATTACHMENT_BYTES : MAX_FILE_ATTACHMENT_BYTES;
    if (file.size <= 0) {
      toast.error(t('messageDetail.emptyFile'));
      return;
    }
    if (file.size > max) {
      toast.error(image ? t('messageDetail.imageTooLarge') : t('messageDetail.fileTooLarge'));
      return;
    }
    setSelectedFile(file);
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
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || (user.student_login_name || user.email).charAt(0).toUpperCase() || '?';
  }

  function conversationTitle(c: KidsConversation): string {
    return c.topic?.trim() || t('messages.conversationFallback').replace('{id}', String(c.id));
  }

  async function verifyPasswordAndUnlock() {
    const pass = password.trim();
    setPasswordError(null);
    if (!pass) {
      setPasswordError(t('messages.enterPassword'));
      return;
    }
    setPasswordBusy(true);
    try {
      await kidsParentVerifyPassword(pass);
      kidsParentMessagesMarkUnlockedNow();
      setAccessReady(true);
      setPassword('');
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : t('messages.passwordVerifyFailed'));
    } finally {
      setPasswordBusy(false);
    }
  }

  if (authLoading || !user || (accessReady && loading)) {
    return <p className="text-center text-sm text-violet-800 dark:text-violet-200">{t('common.loading')}</p>;
  }

  const msgLocale = language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US';

  function insertQuickReply(s: string) {
    setText((prev) => {
      const pad = prev.length > 0 && !/\s$/.test(prev) ? ' ' : '';
      return `${prev}${pad}${s}`;
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-2 pb-8 md:px-4">
      <div className="grid gap-4 md:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] md:items-stretch md:gap-6">
        <aside className="hidden h-[min(78vh,760px)] flex-col overflow-hidden rounded-[2rem] border border-zinc-200/90 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 md:flex">
          <div className="px-5 pb-3 pt-6">
            <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">{t('messages.title')}</h2>
            <div className="mt-2 h-1 w-12 rounded-full bg-violet-600" aria-hidden />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {listLoading ? <p className="px-2 py-2 text-xs text-zinc-500">{t('messageDetail.listRefreshing')}</p> : null}
            {rows.length === 0 ? (
              <p className="px-2 py-2 text-sm text-zinc-500 dark:text-zinc-400">{t('messages.empty')}</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((c) => {
                  const active = c.id === conversationId;
                  const name = conversationTitle(c);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => router.push(`${pathPrefix}/mesajlar/${c.id}`)}
                        className={`flex w-full gap-3 rounded-2xl border-2 p-3.5 text-left transition ${
                          active
                            ? 'border-violet-500 bg-violet-50/90 shadow-md dark:border-violet-400 dark:bg-violet-950/50'
                            : 'border-transparent bg-zinc-50/90 hover:border-violet-200 dark:bg-zinc-800/50 dark:hover:border-violet-800'
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-black text-white shadow-inner">
                          {topicInitials(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`truncate text-sm font-bold ${
                                active ? 'text-violet-700 dark:text-violet-200' : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {name}
                            </p>
                            <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                              {formatConversationListTime(c.last_message_at)}
                            </span>
                          </div>
                          <p
                            className={`mt-0.5 truncate text-xs ${
                              active ? 'text-violet-600 dark:text-violet-300' : 'text-zinc-500 dark:text-zinc-400'
                            }`}
                          >
                            {c.unread_count > 0
                              ? `${t('messages.unread')}: ${c.unread_count}`
                              : t('messages.listPreview')}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-h-[min(78vh,760px)] flex-col overflow-hidden rounded-[2rem] border border-zinc-200/90 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 dark:border-zinc-800">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50">
                  <UserCircle2 className="h-7 w-7 text-violet-600 dark:text-violet-300" />
                </div>
                <span
                  className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                    wsConnected ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                  aria-hidden
                />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-logo text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
                <p
                  className={`text-[11px] font-bold uppercase tracking-wide ${
                    wsConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
                  }`}
                >
                  {wsConnected ? t('messageDetail.onlineStatus') : t('messageDetail.offlineStatus')}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center md:hidden">
              <button
                type="button"
                onClick={() => router.push(`${pathPrefix}/mesajlar`)}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-violet-200"
              >
                <Users className="h-3.5 w-3.5" />
                {t('messageDetail.contacts')}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-zinc-100/90 p-4 dark:bg-zinc-950/40">
            {messages.length === 0 ? (
              <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white/90 p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('messageDetail.noMessageYet')}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" /> {t('messageDetail.startConversation')}
                </p>
              </div>
            ) : (
              messagesWithDayBreaks.map(({ m, showDay, dayLabel }) => {
                const mine = isOutgoingMessage(m);
                const att = m.attachment;
                const attImage = att && isImageAttachment(att.content_type, att.original_name);
                const timeStr = new Date(m.created_at).toLocaleTimeString(msgLocale, { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={m.id}>
                    {showDay ? (
                      <div className="flex justify-center py-2">
                        <span className="rounded-full bg-white/95 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500 shadow-sm dark:bg-zinc-800 dark:text-zinc-400">
                          {dayLabel}
                        </span>
                      </div>
                    ) : null}
                    <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine && (
                        <div className="mb-6 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-[10px] font-black text-white shadow-sm">
                          {peerAvatarInitial.slice(0, 1) || 'V'}
                        </div>
                      )}
                      <div className={`flex max-w-[min(100%,20rem)] flex-col gap-1.5 sm:max-w-[min(100%,26rem)] ${mine ? 'items-end' : 'items-start'}`}>
                        {m.body ? (
                          <div
                            className={`rounded-[1.15rem] px-4 py-3 shadow-sm ${
                              mine
                                ? 'rounded-br-md bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 text-white'
                                : 'rounded-bl-md border border-zinc-200/90 bg-white text-slate-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-100'
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                          </div>
                        ) : null}
                        {att ? (
                          <div
                            className={`w-full max-w-[min(100%,280px)] overflow-hidden rounded-[1.15rem] border bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-900 ${
                              mine ? 'border-violet-200/70' : 'border-zinc-200'
                            }`}
                          >
                            {attImage ? (
                              <button
                                type="button"
                                className="block w-full"
                                onClick={() => {
                                  const idx = imageItems.findIndex((x) => x.url === att.url);
                                  setLightboxIndex(idx >= 0 ? idx : 0);
                                  setLightboxOpen(true);
                                }}
                              >
                                <img
                                  src={att.url}
                                  alt={att.original_name || t('messageDetail.imageAttachment')}
                                  className="max-h-52 w-full object-cover"
                                />
                              </button>
                            ) : null}
                            <div className="flex items-center gap-2.5 border-t border-zinc-100 p-3 dark:border-zinc-700">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
                                {attImage ? (
                                  <ImageIcon className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                                ) : (
                                  <FileText className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                                  {att.original_name || t('messageDetail.file')}
                                </p>
                                <p className="text-[11px] text-zinc-500">{formatBytesTr(att.size_bytes)}</p>
                              </div>
                              <a
                                href={att.url}
                                download={att.original_name || undefined}
                                className="shrink-0 rounded-full p-2 text-violet-600 transition hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/50"
                                aria-label={t('messageDetail.download')}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          </div>
                        ) : null}
                        <p className={`px-1 text-[11px] tabular-nums text-zinc-400 ${mine ? 'text-right' : 'text-left'}`}>{timeStr}</p>
                      </div>
                      {mine && (
                        <div className="mb-6 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-[10px] font-black text-white shadow-sm">
                          {userInitial()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-end gap-3">
              <div className="relative min-w-0 flex-1 rounded-[1.25rem] border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
                <div className="flex items-end gap-1 px-1 pb-1 pt-1 sm:gap-2 sm:px-2 sm:pb-2 sm:pt-2">
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((v) => !v)}
                    className="mb-0.5 shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-zinc-200/80 dark:hover:bg-zinc-700"
                    aria-expanded={emojiOpen}
                    aria-label={t('messageDetail.quickIcons')}
                  >
                    <Smile className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <textarea
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void onSend();
                      }
                    }}
                    placeholder={t('messageDetail.placeholderShort')}
                    className="mb-0.5 max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      onPickFile(e.target.files?.[0] ?? null);
                      e.currentTarget.value = '';
                    }}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      onPickFile(e.target.files?.[0] ?? null);
                      e.currentTarget.value = '';
                    }}
                  />
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-0.5 shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-zinc-200/80 disabled:opacity-50 dark:hover:bg-zinc-700"
                    aria-label={t('messageDetail.file')}
                  >
                    <Paperclip className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => imageInputRef.current?.click()}
                    className="mb-0.5 shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-zinc-200/80 disabled:opacity-50 dark:hover:bg-zinc-700"
                    aria-label={t('messageDetail.imageAttachment')}
                  >
                    <ImageIcon className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
                {emojiOpen ? (
                  <div className="flex flex-wrap gap-1 border-t border-zinc-200 px-2 py-2 dark:border-zinc-700">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          appendEmoji(emoji);
                          setEmojiOpen(false);
                        }}
                        className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-base transition hover:bg-violet-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-violet-950/40"
                        aria-label={`${t('messageDetail.addIcon')} ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                disabled={sending || (!text.trim() && !selectedFile)}
                onClick={() => void onSend()}
                className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label={t('messageDetail.send')}
              >
                <Send className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
            {selectedFile ? (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800/60">
                <div className="flex min-w-0 items-center gap-2">
                  {selectedFile.type.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4 shrink-0 text-violet-600" />
                  ) : (
                    <Paperclip className="h-4 w-4 shrink-0 text-violet-600" />
                  )}
                  <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{selectedFile.name}</span>
                  <span className="text-zinc-500">{formatBytesTr(selectedFile.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2 py-1 font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('messageDetail.remove')}
                </button>
              </div>
            ) : null}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">{t('messageDetail.quickReaction')}</span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['👍 ', t('messageDetail.quickReplyOk')],
                    ['🚀 ', t('messageDetail.quickReplyReady')],
                    ['🤔 ', t('messageDetail.quickReplyIssue')],
                    ['💖 ', t('messageDetail.quickReplyThanks')],
                  ] as const
                ).map(([prefix, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => insertQuickReply(`${prefix}${label}`)}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200 dark:hover:border-violet-700"
                  >
                    {prefix}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      {user.role === 'parent' && !accessReady ? (
        <KidsCenteredModal title={t('messages.passwordModalTitle')} onClose={() => router.replace(`${pathPrefix}/veli/panel`)}>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {t('messages.passwordModalBody')}
          </p>
          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
            {t('messages.accountPassword')}
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
              {t('common.cancel')}
            </KidsSecondaryButton>
            <KidsPrimaryButton type="button" disabled={passwordBusy} onClick={() => void verifyPasswordAndUnlock()}>
              {passwordBusy ? t('messages.verifying') : t('messages.continue')}
            </KidsPrimaryButton>
          </div>
        </KidsCenteredModal>
      ) : null}
      {lightboxOpen && imageItems.length > 0 ? (
        <MediaLightbox
          items={imageItems}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </div>
  );
}
