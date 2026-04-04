'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsCreateClassTest,
  kidsDistributeTestToClasses,
  kidsExtractTestQuestions,
  kidsListClasses,
  kidsListMyCreatedTests,
  kidsPatchTest,
  type KidsClass,
  type KidsTest,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { KidsCenteredModal, KidsSecondaryButton, KidsSelect } from '@/src/components/kids/kids-ui';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

function newPassageLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type DraftPassage = {
  id: string;
  title: string;
  body: string;
};

type DraftQuestion = {
  order: number;
  stem: string;
  topic: string;
  subtopic: string;
  choices: { key: string; text: string }[];
  correct_choice_key: string;
  points: number;
  /** Kaynak görsel sayfası (1-based); çoklu sayfada zorunlu. */
  source_page_order: number;
  /** Yerel metin kartı kimliği; kayıtta sıraya çevrilir. */
  reading_passage_id: string | null;
};

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export default function KidsTeacherTestsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [classId, setClassId] = useState<number>(0);
  const [myTests, setMyTests] = useState<KidsTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [title, setTitle] = useState('Yeni Test');
  const [instructions, setInstructions] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<string>('40');
  const [passages, setPassages] = useState<DraftPassage[]>([]);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [workFromTestId, setWorkFromTestId] = useState<string>('');
  const [distributeTestId, setDistributeTestId] = useState<string>('');
  const [distributeClassIds, setDistributeClassIds] = useState<number[]>([]);
  const [distributeScope, setDistributeScope] = useState<'all' | 'custom'>('all');
  const [distributeClassPickerId, setDistributeClassPickerId] = useState<string>('');
  const [distributing, setDistributing] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const [rows, mine] = await Promise.all([
          kidsListClasses(),
          kidsListMyCreatedTests().catch(() => []),
        ]);
        setClasses(rows);
        setMyTests(mine);
        if (rows.length > 0) setClassId(rows[0].id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('tests.teacherMain.classesLoadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router, pathPrefix, t]);

  const myTestOptions = useMemo(
    () => myTests.map((t) => ({ value: String(t.id), label: t.title })),
    [myTests],
  );
  const editingRow = useMemo(
    () => (workFromTestId ? myTests.find((x) => String(x.id) === workFromTestId) ?? null : null),
    [myTests, workFromTestId],
  );
  const sourcePageCount = Math.max(images.length, editingRow?.source_images?.length ?? 0);
  const classNameById = useMemo(() => {
    const map = new Map<number, string>();
    classes.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [classes]);
  const distributeCustomClassOptions = useMemo(
    () =>
      classes
        .filter((c) => !distributeClassIds.includes(c.id))
        .map((c) => ({ value: String(c.id), label: c.name })),
    [classes, distributeClassIds],
  );
  function appendImages(newFiles: File[]) {
    if (newFiles.length === 0) return;
    const valid = newFiles.filter((f) => f.size > 0 && f.size <= MAX_IMAGE_BYTES);
    if (valid.length !== newFiles.length) {
      toast.error(t('tests.teacherMain.imageSizeError'));
    }
    setImages((prev) => [...prev, ...valid].slice(0, 10));
  }

  function setQuestionField(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function setPassageField(index: number, patch: Partial<DraftPassage>) {
    setPassages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function removePassageAt(index: number) {
    const removed = passages[index];
    setPassages((prev) => prev.filter((_, i) => i !== index));
    if (removed) {
      setQuestions((prev) =>
        prev.map((q) => (q.reading_passage_id === removed.id ? { ...q, reading_passage_id: null } : q)),
      );
    }
  }

  function confirmRemoveQuestion() {
    if (pendingDeleteIndex === null) return;
    const idx = pendingDeleteIndex;
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((q, i) => ({ ...q, order: i + 1 }));
    });
    setPendingDeleteIndex(null);
  }

  function addQuestion() {
    setQuestions((prev) => {
      const nextOrder = prev.length + 1;
      const onlyPassageId = passages.length === 1 ? passages[0]!.id : null;
      return [
        ...prev,
        {
          order: nextOrder,
          stem: '',
          topic: '',
          subtopic: '',
          choices: [
            { key: 'A', text: '' },
            { key: 'B', text: '' },
            { key: 'C', text: '' },
          ],
          correct_choice_key: '',
          points: 1,
          source_page_order: 1,
          reading_passage_id: onlyPassageId,
        },
      ];
    });
  }

  function resetDraftForm() {
    setWorkFromTestId('');
    setTitle(t('tests.teacherMain.newTestTitle'));
    setInstructions('');
    setDurationMinutes('40');
    setPassages([]);
    setQuestions([]);
    setImages([]);
  }

  function applyTestToForm(testId: string) {
    setWorkFromTestId(testId);
    if (!testId) {
      resetDraftForm();
      return;
    }
    const row = myTests.find((t) => String(t.id) === testId);
    if (!row) return;
    setTitle(row.title || t('tests.teacherMain.newTestTitle'));
    setInstructions(row.instructions || '');
    setDurationMinutes(row.duration_minutes != null ? String(row.duration_minutes) : '');
    setClassId(row.kids_class || classId);
    const plist = [...(row.passages ?? [])].sort((a, b) => a.order - b.order);
    setPassages(
      plist.map((p) => ({
        id: `db-${p.id}`,
        title: p.title || '',
        body: p.body || '',
      })),
    );
    const idByOrder = new Map(plist.map((p) => [p.order, `db-${p.id}`]));
    setQuestions(
      (row.questions || []).map((q, idx) => ({
        order: q.order || idx + 1,
        stem: q.stem || '',
        topic: q.topic || '',
        subtopic: q.subtopic || '',
        choices: (q.choices || []).map((c, cIdx) => ({
          key: c.key || String.fromCharCode(65 + cIdx),
          text: c.text || '',
        })),
        correct_choice_key: q.correct_choice_key || '',
        points: q.points || 1,
        source_page_order: q.source_page_order ?? 1,
        reading_passage_id: (() => {
          const po = q.reading_passage_order;
          if (po == null) return null;
          return idByOrder.get(po) ?? null;
        })(),
      })),
    );
  }

  function onDurationMinutesChange(raw: string) {
    const onlyDigits = raw.replace(/\D+/g, '');
    setDurationMinutes(onlyDigits);
  }

  function addDistributeClass() {
    const id = Number(distributeClassPickerId);
    if (!id) return;
    setDistributeClassIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setDistributeClassPickerId('');
  }

  function removeDistributeClass(id: number) {
    setDistributeClassIds((prev) => prev.filter((x) => x !== id));
  }

  async function onDistribute() {
    if (!distributeTestId) {
      toast.error(t('tests.teacherMain.selectTestFirst'));
      return;
    }
    const targetClassIds =
      distributeScope === 'all'
        ? classes.map((c) => c.id)
        : distributeClassIds;
    if (targetClassIds.length === 0) {
      toast.error(t('tests.teacherMain.selectAtLeastOneClass'));
      return;
    }
    setDistributing(true);
    try {
      const out = await kidsDistributeTestToClasses(Number(distributeTestId), targetClassIds);
      if (out.created_count > 0) {
        toast.success(`${out.created_count} ${t('tests.teacherMain.sentToClassesSuffix')}`);
      } else {
        toast(t('tests.teacherMain.classesAlreadyAssigned'));
      }
      const mine = await kidsListMyCreatedTests().catch(() => []);
      setMyTests(mine);
      setDistributeClassIds([]);
      setDistributeClassPickerId('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('tests.teacherMain.distributeFailed'));
    } finally {
      setDistributing(false);
    }
  }

  async function onExtract() {
    if (images.length === 0) {
      toast.error(t('tests.teacherMain.uploadAtLeastOneImage'));
      return;
    }
    setExtracting(true);
    try {
      const out = await kidsExtractTestQuestions(images);
      setTitle((out.title || t('tests.teacherMain.newTestTitle')).trim());
      setInstructions((out.instructions || '').trim());
      const rawPassages = [...(out.passages || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const builtPassages: DraftPassage[] = rawPassages.map((p) => ({
        id: newPassageLocalId(),
        title: (p.title || '').trim(),
        body: (p.body || '').trim(),
      }));
      const orderToId = new Map<number, string>();
      rawPassages.forEach((p, idx) => {
        const card = builtPassages[idx];
        if (card) orderToId.set(typeof p.order === 'number' ? p.order : idx + 1, card.id);
      });
      setPassages(builtPassages);
      setQuestions(
        out.questions.map((q, idx) => {
          const ro = q.reading_passage_order;
          let link: string | null = null;
          if (ro != null) link = orderToId.get(ro) ?? null;
          if (link == null && builtPassages.length === 1) link = builtPassages[0]!.id;
          return {
            order: q.order || idx + 1,
            stem: q.stem || '',
            topic: q.topic || '',
            subtopic: q.subtopic || '',
            choices: (q.choices || []).map((c, cIdx) => ({
              key: c.key || String.fromCharCode(65 + cIdx),
              text: c.text || '',
            })),
            correct_choice_key: q.correct_choice_key || '',
            points: q.points || 1,
            source_page_order: typeof q.source_page_order === 'number' && q.source_page_order >= 1 ? q.source_page_order : 1,
            reading_passage_id: link,
          };
        }),
      );
      toast.success(`AI ${out.questions.length} ${t('tests.teacherMain.aiExtractedQuestionsSuffix')}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('tests.teacherMain.aiExtractFailed'));
    } finally {
      setExtracting(false);
    }
  }

  async function onPublish() {
    if (!classId) {
      toast.error(t('tests.teacherMain.mustSelectClass'));
      return;
    }
    if (!title.trim()) {
      toast.error(t('tests.teacherMain.titleRequired'));
      return;
    }
    if (questions.length === 0) {
      toast.error(t('tests.teacherMain.needAtLeastOneQuestion'));
      return;
    }
    const hasInvalid = questions.some((q) => !q.stem.trim() || q.choices.length < 2 || !q.correct_choice_key);
    if (hasInvalid) {
      toast.error(t('tests.teacherMain.invalidQuestions'));
      return;
    }
    setSaving(true);
    try {
      const duration =
        durationMinutes.trim() === ''
          ? null
          : Math.min(300, Math.max(1, Number(durationMinutes.replace(/\D+/g, '') || '0')));
      const packedPassages = passages
        .map((p) => ({ id: p.id, title: p.title.trim(), body: p.body.trim() }))
        .filter((p) => p.title || p.body)
        .map((p, idx) => ({ ...p, order: idx + 1 }));
      const passageIdToOrder = new Map(packedPassages.map((p) => [p.id, p.order]));
      const passagesPayload = packedPassages.map(({ order, title, body }) => ({ order, title, body }));
      const questionsPayload = questions.map((q, idx) => {
        const piece: {
          order: number;
          stem: string;
          topic: string;
          subtopic: string;
          choices: { key: string; text: string }[];
          correct_choice_key: string;
          points: number;
          reading_passage_order?: number;
          source_page_order?: number;
        } = {
          order: idx + 1,
          stem: q.stem.trim(),
          topic: q.topic.trim(),
          subtopic: q.subtopic.trim(),
          choices: q.choices.map((c, cIdx) => ({
            key: c.key || String.fromCharCode(65 + cIdx),
            text: c.text.trim(),
          })),
          correct_choice_key: q.correct_choice_key,
          points: q.points || 1,
        };
        const rp = q.reading_passage_id ? passageIdToOrder.get(q.reading_passage_id) : undefined;
        if (rp != null) piece.reading_passage_order = rp;
        if (sourcePageCount > 1) {
          piece.source_page_order = Math.min(sourcePageCount, Math.max(1, q.source_page_order || 1));
        }
        return piece;
      });
      const payload = {
        title: title.trim(),
        instructions: instructions.trim(),
        duration_minutes: duration,
        status: 'draft' as const,
        passages: passagesPayload,
        questions: questionsPayload,
      };
      const editingTestId = Number(workFromTestId);
      const isEditing = Number.isFinite(editingTestId) && editingTestId > 0;
      if (isEditing) {
        const updated = await kidsPatchTest(editingTestId, payload);
        toast.success(t('tests.teacherMain.updated'));
        setMyTests((prev) => [updated, ...prev.filter((x) => x.id !== updated.id)]);
        setWorkFromTestId(String(updated.id));
      } else {
        const created = await kidsCreateClassTest(classId, {
          ...payload,
          source_images: images,
        });
        toast.success(t('tests.teacherMain.savedAndCanDistribute'));
        setMyTests((prev) => [created, ...prev.filter((x) => x.id !== created.id)]);
        setWorkFromTestId(String(created.id));
      }
      setPassages([]);
      setQuestions([]);
      setImages([]);
      setInstructions('');
      setTitle(t('tests.teacherMain.newTestTitle'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('tests.teacherMain.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) return <p className="text-center text-sm">{t('common.loading')}</p>;
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) return <p className="text-center text-sm">{t('common.redirecting')}</p>;
  const isEditingDraft = Boolean(workFromTestId && Number(workFromTestId) > 0);
  const canDistribute =
    Boolean(distributeTestId) &&
    (distributeScope === 'all' ? classes.length > 0 : distributeClassIds.length > 0);

  const questionPendingDelete =
    pendingDeleteIndex !== null ? questions[pendingDeleteIndex] ?? null : null;
  const deleteStemPreview = (questionPendingDelete?.stem || '').trim().replace(/\s+/g, ' ');
  const deletePreviewShort =
    deleteStemPreview.length > 140 ? `${deleteStemPreview.slice(0, 140)}…` : deleteStemPreview;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">{t('tests.teacherMain.title')}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t('tests.teacherMain.subtitle')}
        </p>
      </div>

      <section className="rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-gray-900/70">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-violet-900 dark:text-violet-100">
            {t('tests.teacherMain.selectFromUploadedOptional')}
            <div className="mt-1">
              <KidsSelect
                value={workFromTestId}
                onChange={applyTestToForm}
                options={[{ value: '', label: t('tests.teacherMain.emptyForm') }, ...myTestOptions]}
                searchable
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('tests.teacherMain.editViaSelectHint')}</p>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={`${pathPrefix}/ogretmen/testler/raporlar`}
            className="inline-flex min-h-10 items-center rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
          >
            {t('tests.teacherMain.goReports')}
          </Link>
          <button
            type="button"
            onClick={resetDraftForm}
            className="inline-flex min-h-10 items-center rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-300/60 dark:border-violet-700 dark:bg-gray-900 dark:text-violet-200 dark:hover:bg-violet-950/40"
          >
            {t('tests.teacherMain.clearForm')}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-gray-900/70">
        <h2 className="mb-3 text-lg font-bold text-violet-950 dark:text-violet-100">{t('tests.teacherMain.distributeSectionTitle')}</h2>
        {myTests.length > 0 ? (
          <div className="mb-4 rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 p-3 dark:border-fuchsia-800 dark:bg-fuchsia-950/20">
            <h3 className="text-sm font-bold text-fuchsia-900 dark:text-fuchsia-100">{t('tests.teacherMain.distributeTest')}</h3>
            <p className="mt-1 text-xs text-fuchsia-800 dark:text-fuchsia-200">
              {t('tests.teacherMain.distributeHint')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDistributeScope('all')}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  distributeScope === 'all'
                    ? 'bg-fuchsia-600 text-white'
                    : 'border border-fuchsia-300 text-fuchsia-800 dark:border-fuchsia-700 dark:text-fuchsia-200'
                }`}
              >
                {t('tests.teacherMain.allMyClasses')} ({classes.length})
              </button>
              <button
                type="button"
                onClick={() => setDistributeScope('custom')}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  distributeScope === 'custom'
                    ? 'bg-fuchsia-600 text-white'
                    : 'border border-fuchsia-300 text-fuchsia-800 dark:border-fuchsia-700 dark:text-fuchsia-200'
                }`}
              >
                {t('tests.teacherMain.customSelection')}
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-fuchsia-900 dark:text-fuchsia-100">{t('tests.reports.test')}</label>
                <div className="mt-1">
                  <KidsSelect
                    value={distributeTestId}
                    onChange={(next) => setDistributeTestId(next)}
                    options={[{ value: '', label: t('tests.reports.selectTest') }, ...myTestOptions]}
                    searchable
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-fuchsia-900 dark:text-fuchsia-100">
                  {t('tests.teacherMain.durationMin')}
                  <input
                    type="number"
                    min={1}
                    max={300}
                    step={1}
                    value={durationMinutes}
                    onChange={(e) => onDurationMinutesChange(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-fuchsia-200 bg-white px-3 py-2 text-sm dark:border-fuchsia-700 dark:bg-gray-900/60"
                    placeholder="40"
                    inputMode="numeric"
                  />
                </label>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('tests.teacherMain.durationHint')}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-fuchsia-900 dark:text-fuchsia-100">{t('tests.teacherMain.targetClasses')}</label>
                {distributeScope === 'custom' ? (
                  <>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <KidsSelect
                          value={distributeClassPickerId}
                          onChange={(next) => setDistributeClassPickerId(next)}
                          options={[{ value: '', label: t('tests.reports.selectClass') }, ...distributeCustomClassOptions]}
                          searchable
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addDistributeClass}
                        className="rounded-lg border border-fuchsia-300 px-2 py-1 text-xs font-bold text-fuchsia-800 dark:border-fuchsia-700 dark:text-fuchsia-200"
                      >
                        {t('tests.teacherMain.add')}
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {distributeClassIds.map((id) => (
                        <span
                          key={`target-chip-${id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-fuchsia-100 px-2.5 py-1 text-[11px] font-bold text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200"
                        >
                          {classNameById.get(id) || `${t('tests.teacherMain.classLabel')} #${id}`}
                          <button
                            type="button"
                            onClick={() => removeDistributeClass(id)}
                            className="rounded-full border border-fuchsia-300 px-1 text-[10px] dark:border-fuchsia-700"
                            aria-label={t('tests.teacherMain.removeClass')}
                          >
                            x
                          </button>
                        </span>
                      ))}
                      {distributeClassIds.length === 0 ? (
                        <span className="text-[11px] text-slate-500">{t('tests.teacherMain.noClassAdded')}</span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 rounded-lg border border-fuchsia-200 bg-white p-2 text-xs dark:border-fuchsia-800 dark:bg-gray-900/60">
                    {`${t('tests.teacherMain.targetAllClasses')}: (${classes.length})`}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={distributing || !canDistribute}
              onClick={() => void onDistribute()}
              className="mt-3 rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {distributing ? t('tests.teacherMain.sending') : t('tests.teacherMain.sendSelectedClasses')}
            </button>
          </div>
        ) : null}
        {myTests.length === 0 ? (
          <p className="text-sm text-slate-500">{t('tests.teacherMain.noUploadedTests')}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-gray-900/70">
        <h2 className="mb-3 text-lg font-bold text-violet-950 dark:text-violet-100">{t('tests.teacherMain.step1')}</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            appendImages(Array.from(e.target.files || []));
            e.currentTarget.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group block w-full rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/60 p-5 text-left transition hover:border-fuchsia-400 hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-950/20 dark:hover:border-fuchsia-600"
        >
          <p className="text-sm font-bold text-violet-900 dark:text-violet-100">{t('tests.teacherMain.clickToSelectFiles')}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {t('tests.teacherMain.uploadHelp')}
          </p>
        </button>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('tests.teacherMain.uploadHint')}
        </p>
        {images.length > 0 ? (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 font-bold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
              {images.length} {t('tests.teacherMain.imagesSelected')}
            </span>
            <button
              type="button"
              onClick={() => setImages([])}
              className="rounded-full border border-slate-300 px-2 py-0.5 font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              {t('tests.teacherMain.removeAll')}
            </button>
          </div>
        ) : null}
        {images.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {images.map((img, idx) => (
              <li
                key={`${img.name}-${idx}`}
                className="flex items-center justify-between rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-900/60"
              >
                <span className="truncate pr-2 font-medium text-violet-900 dark:text-violet-100">
                  {idx + 1}. {img.name}
                </span>
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="rounded-full border border-violet-200 px-2 py-0.5 text-xs font-bold text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-200"
                >
                  {t('tests.teacherMain.remove')}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          disabled={extracting || images.length === 0}
          onClick={() => void onExtract()}
          className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {extracting ? t('tests.teacherMain.aiRunning') : t('tests.teacherMain.step2')}
        </button>
      </section>

      <section className="rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-gray-900/70">
        <h2 className="mb-3 text-lg font-bold text-violet-950 dark:text-violet-100">{t('tests.teacherMain.step3')}</h2>
        <label className="block text-sm font-semibold">
          {t('tests.teacherMain.testTitle')}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800"
          />
        </label>
        <label className="mt-3 block text-sm font-semibold">
          {t('tests.teacherMain.description')}
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800"
          />
        </label>

        <div className="mt-6 space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 dark:border-amber-800/60 dark:bg-amber-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">{t('tests.teacherMain.readingPassagesSection')}</h3>
            <button
              type="button"
              onClick={() => setPassages((prev) => [...prev, { id: newPassageLocalId(), title: '', body: '' }])}
              className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-bold text-amber-900 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-100"
            >
              {t('tests.teacherMain.addReadingPassage')}
            </button>
          </div>
          {passages.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">{t('tests.teacherMain.readingPassagesEmptyHint')}</p>
          ) : (
            <ul className="space-y-3">
              {passages.map((p, pIdx) => (
                <li key={p.id} className="rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-800 dark:bg-gray-900/60">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      {t('tests.teacherMain.readingPassagePickerLabel').replace('{n}', String(pIdx + 1))}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePassageAt(pIdx)}
                      className="rounded-full border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:border-rose-800 dark:text-rose-200"
                    >
                      {t('tests.teacherMain.removeReadingPassage')}
                    </button>
                  </div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('tests.teacherMain.readingPassageTitleLabel')}
                    <input
                      value={p.title}
                      onChange={(e) => setPassageField(pIdx, { title: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800"
                    />
                  </label>
                  <label className="mt-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('tests.teacherMain.readingPassageBodyLabel')}
                    <textarea
                      value={p.body}
                      onChange={(e) => setPassageField(pIdx, { body: e.target.value })}
                      rows={6}
                      className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800"
                    />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-violet-100 pb-2 dark:border-violet-900/50">
          <p className="text-sm font-bold text-violet-950 dark:text-violet-100">{t('tests.teacherMain.questionsBlockTitle')}</p>
          <button
            type="button"
            onClick={addQuestion}
            className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-900 shadow-sm transition hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/50"
          >
            {t('tests.teacherMain.addQuestion')}
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {questions.map((q, qIdx) => (
            <div key={`${q.order}-${qIdx}`} className="rounded-xl border border-violet-200 p-3 dark:border-violet-700">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">
                  {qIdx + 1}. {t('tests.teacherMain.questionLabel')}
                </p>
                <button
                  type="button"
                  onClick={() => setPendingDeleteIndex(qIdx)}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-950/80"
                >
                  {t('tests.teacherMain.deleteQuestion')}
                </button>
              </div>
              <textarea
                value={q.stem}
                onChange={(e) => setQuestionField(qIdx, { stem: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800"
              />
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {q.choices.map((c, cIdx) => (
                  <div key={`${qIdx}-${cIdx}`} className="flex items-center gap-2">
                    <span className="w-6 text-xs font-bold">{c.key}</span>
                    <input
                      value={c.text}
                      onChange={(e) => {
                        const nextChoices = [...q.choices];
                        nextChoices[cIdx] = { ...nextChoices[cIdx], text: e.target.value };
                        setQuestionField(qIdx, { choices: nextChoices });
                      }}
                      className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span>{t('tests.teacherMain.correctChoice')}:</span>
                <div className="w-28">
                  <KidsSelect
                    value={q.correct_choice_key || ''}
                    onChange={(next) => setQuestionField(qIdx, { correct_choice_key: next })}
                    options={[
                      { value: '', label: t('tests.teacherMain.select') },
                      ...q.choices.map((c) => ({ value: c.key, label: c.key })),
                    ]}
                    searchable={false}
                  />
                </div>
              </div>
              {passages.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('tests.teacherMain.linkQuestionToPassage')}</p>
                  <div className="mt-1 w-full max-w-md">
                    <KidsSelect
                      value={q.reading_passage_id || ''}
                      onChange={(next) =>
                        setQuestionField(qIdx, { reading_passage_id: next ? next : null })
                      }
                      options={[
                        { value: '', label: t('tests.teacherMain.noPassageOption') },
                        ...passages.map((p, pi) => ({
                          value: p.id,
                          label: t('tests.teacherMain.readingPassagePickerLabel').replace('{n}', String(pi + 1)),
                        })),
                      ]}
                      searchable={false}
                    />
                  </div>
                </div>
              ) : null}
              {sourcePageCount > 1 ? (
                <div className="mt-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('tests.teacherMain.sourcePageHelp')}</p>
                  <div className="mt-1 w-full max-w-xs">
                    <KidsSelect
                      value={String(q.source_page_order || 1)}
                      onChange={(next) =>
                        setQuestionField(qIdx, { source_page_order: Math.max(1, Number(next) || 1) })
                      }
                      options={Array.from({ length: sourcePageCount }, (_, i) => ({
                        value: String(i + 1),
                        label: `${t('tests.teacherMain.sourcePage')} ${i + 1}`,
                      }))}
                      searchable={false}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-4 text-center dark:border-violet-800 dark:bg-violet-950/20">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('tests.teacherMain.noQuestionsHint')}</p>
              <button
                type="button"
                onClick={addQuestion}
                className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-violet-500"
              >
                {t('tests.teacherMain.addQuestion')}
              </button>
            </div>
          ) : (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={addQuestion}
                className="rounded-full border border-violet-300 bg-white px-4 py-2 text-xs font-bold text-violet-800 shadow-sm hover:bg-violet-50 dark:border-violet-600 dark:bg-gray-900 dark:text-violet-200 dark:hover:bg-violet-950/50"
              >
                {t('tests.teacherMain.addQuestion')}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={saving || !classId}
          onClick={() => void onPublish()}
          className="mt-4 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? (isEditingDraft ? t('tests.teacherMain.updating') : t('tests.teacherMain.saving')) : isEditingDraft ? t('tests.teacherMain.step4Update') : t('tests.teacherMain.step4Save')}
        </button>
      </section>

      {pendingDeleteIndex !== null ? (
        <KidsCenteredModal
          variant="danger"
          title={t('tests.teacherMain.deleteQuestionModalTitle')}
          onClose={() => setPendingDeleteIndex(null)}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <KidsSecondaryButton type="button" onClick={() => setPendingDeleteIndex(null)}>
                {t('common.cancel')}
              </KidsSecondaryButton>
              <button
                type="button"
                onClick={() => confirmRemoveQuestion()}
                className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-rose-800/30 bg-rose-600 px-8 text-sm font-bold text-white shadow-md shadow-rose-900/25 transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:border-rose-400/20 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-500"
              >
                {t('tests.teacherMain.deleteQuestionModalConfirm')}
              </button>
            </div>
          }
        >
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {t('tests.teacherMain.deleteQuestionModalBody')
              .replace('{n}', String(pendingDeleteIndex + 1))
              .replace('{count}', String(questions.length))}
          </p>
          {deletePreviewShort ? (
            <p className="mt-3 rounded-lg border border-violet-100 bg-violet-50/80 p-3 text-xs leading-relaxed text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
              {deletePreviewShort}
            </p>
          ) : null}
        </KidsCenteredModal>
      ) : null}
    </div>
  );
}
