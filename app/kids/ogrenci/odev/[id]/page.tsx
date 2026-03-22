'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsCreateSubmission, kidsStudentDashboard, type KidsAssignment } from '@/src/lib/kids-api';

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Video okunamadı'));
    };
    v.src = url;
  });
}

export default function KidsStudentAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = Number(params.id);
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();

  const [assignment, setAssignment] = useState<KidsAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<'steps' | 'video'>('steps');
  const [steps, setSteps] = useState<{ text: string }[]>([{ text: '' }]);
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await kidsStudentDashboard();
      const found = data.assignments.find((a) => a.id === assignmentId) ?? null;
      setAssignment(found);
    } catch {
      toast.error('Ödev yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'student') {
      router.replace(`${pathPrefix}/giris/ogrenci`);
      return;
    }
    load();
  }, [authLoading, user, router, pathPrefix, load]);

  const submissionMode = useMemo(() => {
    if (!assignment) return 'both';
    if (assignment.require_video && !assignment.require_image) return 'video_only';
    if (assignment.require_image && !assignment.require_video) return 'steps_only';
    return 'both';
  }, [assignment]);

  useEffect(() => {
    if (!assignment) return;
    if (assignment.require_video && !assignment.require_image) setKind('video');
    else if (assignment.require_image && !assignment.require_video) setKind('steps');
  }, [assignment]);

  const showSteps =
    submissionMode === 'steps_only' || (submissionMode === 'both' && kind === 'steps');
  const showVideo =
    submissionMode === 'video_only' || (submissionMode === 'both' && kind === 'video');

  const canSubmit = useMemo(() => {
    if (!assignment) return false;
    if (showVideo) {
      if (assignment.require_video && !videoUrl.trim()) return false;
      return !!videoUrl.trim() || !!caption.trim();
    }
    if (showSteps) return steps.some((s) => s.text.trim());
    return false;
  }, [assignment, showSteps, showVideo, steps, videoUrl, caption]);

  async function onVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !assignment) return;
    try {
      const sec = await readVideoDuration(f);
      if (sec > assignment.video_max_seconds + 0.5) {
        toast.error(
          `Video süresi çok uzun (yaklaşık ${Math.ceil(sec)} sn). En fazla ${assignment.video_max_seconds} sn olmalı.`,
        );
      } else {
        toast.success(`Süre uygun görünüyor (~${Math.ceil(sec)} sn). Linki aşağıya yapıştırmayı unutma.`);
      }
    } catch {
      toast.error('Video kontrol edilemedi');
    }
    e.target.value = '';
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignment || !canSubmit) return;
    setSubmitting(true);
    try {
      if (showSteps) {
        const payload = { steps: steps.filter((s) => s.text.trim()).map((s) => ({ text: s.text.trim() })) };
        await kidsCreateSubmission({
          assignment: assignment.id,
          kind: 'steps',
          steps_payload: payload,
          caption: caption.trim(),
        });
      } else {
        await kidsCreateSubmission({
          assignment: assignment.id,
          kind: 'video',
          video_url: videoUrl.trim(),
          caption: caption.trim(),
        });
      }
      toast.success('Teslim kaydedildi');
      router.push(`${pathPrefix}/ogrenci/panel`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user || user.role !== 'student') {
    return <p className="text-center text-gray-600">Yükleniyor…</p>;
  }
  if (loading) {
    return <p className="text-center text-gray-600">Yükleniyor…</p>;
  }
  if (!assignment) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">Bu ödev bulunamadı veya sana atanmadı.</p>
        <Link href={`${pathPrefix}/ogrenci/panel`} className="mt-4 inline-block text-brand hover:underline">
          Panele dön
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`${pathPrefix}/ogrenci/panel`} className="text-sm text-brand hover:underline">
        ← Öğrenci paneli
      </Link>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900/80">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{assignment.title}</h1>
        {assignment.purpose ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{assignment.purpose}</p>
        ) : null}
        {assignment.materials ? (
          <div className="mt-4 rounded-lg bg-sky-50 p-3 text-sm dark:bg-sky-950/40">
            <span className="font-medium text-sky-900 dark:text-sky-100">Malzemeler</span>
            <p className="mt-1 whitespace-pre-wrap text-sky-800 dark:text-sky-200">{assignment.materials}</p>
          </div>
        ) : null}
        <p className="mt-4 text-xs text-gray-500">
          {assignment.require_video && !assignment.require_image
            ? `Video teslimi · en fazla ${assignment.video_max_seconds} sn`
            : assignment.require_image && !assignment.require_video
              ? 'Adım adım yazılı teslim beklenir; görselleri adımlarına eklemeyi unutma.'
              : `Video süre sınırı: ${assignment.video_max_seconds} sn${assignment.require_image ? ' · Görsel veya video seçebilirsin' : ''}`}
        </p>
      </div>

      <form className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900/80" onSubmit={onSubmit}>
        {submissionMode === 'both' ? (
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="kind" checked={kind === 'steps'} onChange={() => setKind('steps')} />
              Adım adım (metin)
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="kind" checked={kind === 'video'} onChange={() => setKind('video')} />
              Video + açıklama
            </label>
          </div>
        ) : submissionMode === 'video_only' ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">Bu ödev için video teslimi gerekir.</p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">Bu ödev için adım adım yazılı teslim gerekir.</p>
        )}

        {showSteps ? (
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Adım {i + 1}</label>
                <textarea
                  value={s.text}
                  onChange={(e) => {
                    const next = [...steps];
                    next[i] = { text: e.target.value };
                    setSteps(next);
                  }}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="Ne yaptın?"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSteps([...steps, { text: '' }])}
              className="text-sm text-brand hover:underline"
            >
              + Adım ekle
            </button>
          </div>
        ) : null}

        {showVideo ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Video dosyası (süre kontrolü, yerelde)</label>
              <input type="file" accept="video/*" onChange={onVideoFile} className="mt-1 block w-full text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Video bağlantısı (YouTube, Drive vb.)</label>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="https://..."
              />
            </div>
          </div>
        ) : null}

        <div>
          <label className="text-sm font-medium">Kısa açıklama / özet</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
        >
          {submitting ? 'Gönderiliyor…' : 'Teslim et'}
        </button>
      </form>
    </div>
  );
}
