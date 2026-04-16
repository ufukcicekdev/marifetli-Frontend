'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Clock, FileUp, ImagePlus, Plus, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsCreateStandaloneTest,
  kidsDeleteTest,
  kidsDistributeTestToClasses,
  kidsExtractTestQuestions,
  kidsGenerateTestFromDocument,
  kidsListClasses,
  kidsListMyCreatedTests,
  kidsPatchTest,
  type KidsClass,
  type KidsTest,
  type KidsTestQuestionFormat,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { kidsPdfFileToPngFiles } from '@/src/lib/kids-pdf-to-images';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';
import { KidsCenteredModal, KidsPrimaryButton, KidsSecondaryButton, KidsSelect } from '@/src/components/kids/kids-ui';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const QUESTION_ILLUSTRATION_MAX_BYTES = 5 * 1024 * 1024;

function QuestionStemIllustrationPreview({
  file,
  url,
  cleared,
}: {
  file: File | null;
  url: string | null;
  cleared: boolean;
}) {
  const [blob, setBlob] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setBlob(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setBlob(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (cleared) return null;
  const src = file ? blob : url;
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className="mt-2 max-h-52 w-full rounded-xl border border-violet-200 object-contain dark:border-violet-700"
    />
  );
}

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
  question_format: KidsTestQuestionFormat;
  constructed_answer: string;
  choices: { key: string; text: string }[];
  correct_choice_key: string;
  points: number;
  /** Kaynak görsel sayfası (1-based); çoklu sayfada zorunlu. */
  source_page_order: number;
  /** Yerel metin kartı kimliği; kayıtta sıraya çevrilir. */
  reading_passage_id: string | null;
  /** Sunucudan gelen soru görseli URL’si (kaydetmeden önce önizleme). */
  illustration_url: string | null;
  /** Yeni seçilen görsel (multipart ile gönderilir). */
  illustration_file: File | null;
  /** Sunucudaki görsel kaldırılsın mı (PATCH clear bayrağı). */
  illustration_cleared: boolean;
};

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_PDF_BYTES = 30 * 1024 * 1024;
const MAX_SOURCE_PAGES = 3;

export default function KidsTeacherTestsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const [classes, setClasses] = useState<KidsClass[]>([]);
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
  const [distributeModalOpen, setDistributeModalOpen] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const [pendingDeleteTestId, setPendingDeleteTestId] = useState<number | null>(null);
  const [deletingTest, setDeletingTest] = useState(false);
  const [uploadDragActive, setUploadDragActive] = useState(false);
  const [pdfConverting, setPdfConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Döküman tab state ---
  const [activeTab, setActiveTab] = useState<'scan' | 'generate'>('scan');
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [docQuestionCount, setDocQuestionCount] = useState<string>('10');
  const [docDragActive, setDocDragActive] = useState(false);
  const [generating, setGenerating] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);
  const MAX_DOC_FILES = 3;
  const imagesRef = useRef<File[]>([]);

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
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('tests.teacherMain.classesLoadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router, pathPrefix, t]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

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

  const existingSourceMediaItems = useMemo<MediaItem[]>(() => {
    const list = editingRow?.source_images;
    if (!list?.length) return [];
    return [...list]
      .sort((a, b) => (a.page_order ?? 0) - (b.page_order ?? 0))
      .map((img) => ({ url: img.url, type: 'image' as const }));
  }, [editingRow?.source_images]);

  const uploadPreviewItems = useMemo<MediaItem[]>(
    () => images.map((f) => ({ url: URL.createObjectURL(f), type: 'image' as const })),
    [images],
  );

  const distributeDurationValid = useMemo(() => {
    const d = Number(durationMinutes.replace(/\D+/g, '') || '0');
    return d >= 1 && d <= 300;
  }, [durationMinutes]);

  const distributeRow = useMemo(
    () => (distributeTestId ? myTests.find((x) => String(x.id) === distributeTestId) ?? null : null),
    [distributeTestId, myTests],
  );

  useEffect(() => {
    return () => {
      uploadPreviewItems.forEach((i) => {
        if (i.url.startsWith('blob:')) URL.revokeObjectURL(i.url);
      });
    };
  }, [uploadPreviewItems]);

  async function appendUploadFiles(newFiles: File[]) {
    if (newFiles.length === 0) return;
    const imageFiles: File[] = [];
    const pdfFiles: File[] = [];
    for (const f of newFiles) {
      const ty = (f.type || '').toLowerCase();
      const nm = f.name.toLowerCase();
      if (ty === 'application/pdf' || nm.endsWith('.pdf')) {
        pdfFiles.push(f);
      } else if (ty.startsWith('image/')) {
        imageFiles.push(f);
      }
    }
    if (imageFiles.length === 0 && pdfFiles.length === 0) {
      toast.error(t('tests.teacherMain.unsupportedFileType'));
      return;
    }

    let next = [...imagesRef.current];

    const validImgs = imageFiles.filter((f) => f.size > 0 && f.size <= MAX_IMAGE_BYTES);
    if (validImgs.length !== imageFiles.length) {
      toast.error(t('tests.teacherMain.imageSizeError'));
    }
    for (const f of validImgs) {
      if (next.length >= MAX_SOURCE_PAGES) break;
      next.push(f);
    }

    for (const pdf of pdfFiles) {
      if (next.length >= MAX_SOURCE_PAGES) {
        toast.error(t('tests.teacherMain.maxSourcePagesReached'));
        break;
      }
      if (pdf.size > MAX_PDF_BYTES) {
        toast.error(t('tests.teacherMain.pdfTooLarge'));
        continue;
      }
      setPdfConverting(true);
      try {
        const room = MAX_SOURCE_PAGES - next.length;
        const pngs = await kidsPdfFileToPngFiles(pdf, { maxPages: room });
        for (const p of pngs) {
          if (p.size > MAX_IMAGE_BYTES) continue;
          if (next.length >= MAX_SOURCE_PAGES) break;
          next.push(p);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('tests.teacherMain.pdfConvertFailed'));
      } finally {
        setPdfConverting(false);
      }
    }

    setImages(next.slice(0, MAX_SOURCE_PAGES));
  }

  function onUploadDrop(e: React.DragEvent) {
    e.preventDefault();
    setUploadDragActive(false);
    const all = Array.from(e.dataTransfer.files || []);
    void appendUploadFiles(all);
  }

  function setQuestionField(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  const MC_MAX_CHOICES = 5;
  const MC_MIN_CHOICES = 2;

  function addMcChoice(qIdx: number) {
    setQuestions((prev) => {
      const q = prev[qIdx];
      if (!q || q.question_format !== 'multiple_choice') return prev;
      if (q.choices.length >= MC_MAX_CHOICES) return prev;
      const nextKey = String.fromCharCode(65 + q.choices.length);
      const next = [...prev];
      next[qIdx] = { ...q, choices: [...q.choices, { key: nextKey, text: '' }] };
      return next;
    });
  }

  function removeLastMcChoice(qIdx: number) {
    setQuestions((prev) => {
      const q = prev[qIdx];
      if (!q || q.question_format !== 'multiple_choice') return prev;
      if (q.choices.length <= MC_MIN_CHOICES) return prev;
      const dropped = q.choices[q.choices.length - 1]!;
      const nextChoices = q.choices.slice(0, -1);
      let correct_choice_key = q.correct_choice_key;
      if ((correct_choice_key || '').trim().toUpperCase() === dropped.key) {
        correct_choice_key = '';
      }
      const next = [...prev];
      next[qIdx] = { ...q, choices: nextChoices, correct_choice_key };
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
          question_format: 'multiple_choice',
          constructed_answer: '',
          choices: [
            { key: 'A', text: '' },
            { key: 'B', text: '' },
            { key: 'C', text: '' },
          ],
          correct_choice_key: '',
          points: 1,
          source_page_order: 1,
          reading_passage_id: onlyPassageId,
          illustration_url: null,
          illustration_file: null,
          illustration_cleared: false,
        },
      ];
    });
  }

  const MAX_DOC_BYTES = 20 * 1024 * 1024;

  function handleDocFiles(incoming: File[]) {
    const valid: File[] = [];
    for (const file of incoming) {
      const mime = (file.type || '').toLowerCase();
      const name = file.name.toLowerCase();
      const isOk =
        mime === 'application/pdf' || name.endsWith('.pdf') ||
        mime === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md') ||
        mime.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');
      if (!isOk) { toast.error(t('tests.teacherMain.generateUnsupportedType')); continue; }
      if (file.size > MAX_DOC_BYTES) { toast.error(t('tests.teacherMain.generateFileTooLarge')); continue; }
      valid.push(file);
    }
    if (!valid.length) return;
    setDocFiles((prev) => {
      const remaining = MAX_DOC_FILES - prev.length;
      if (remaining <= 0) {
        toast.error(t('tests.teacherMain.generateMaxFiles'));
        return prev;
      }
      if (valid.length > remaining) {
        toast.error(t('tests.teacherMain.generateMaxFiles'));
      }
      return [...prev, ...valid.slice(0, remaining)];
    });
  }

  async function onGenerate() {
    if (docFiles.length === 0) {
      toast.error(t('tests.teacherMain.generateUnsupportedType'));
      return;
    }
    const count = Math.min(50, Math.max(1, Number(docQuestionCount.replace(/\D+/g, '') || '10') || 10));
    setGenerating(true);
    try {
      const out = await kidsGenerateTestFromDocument(docFiles, count);
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
          const fmt: KidsTestQuestionFormat = q.question_format === 'constructed' ? 'constructed' : 'multiple_choice';
          return {
            order: q.order || idx + 1,
            stem: q.stem || '',
            topic: q.topic || '',
            subtopic: q.subtopic || '',
            question_format: fmt,
            constructed_answer: (q.constructed_answer || '').trim(),
            choices: (q.choices || []).map((c, cIdx) => ({
              key: c.key || String.fromCharCode(65 + cIdx),
              text: c.text || '',
            })),
            correct_choice_key: q.correct_choice_key || '',
            points: q.points || 1,
            source_page_order: 1,
            reading_passage_id: link,
            illustration_url: null,
            illustration_file: null,
            illustration_cleared: false,
          };
        }),
      );
      toast.success(t('tests.teacherMain.generateSuccess').replace('{n}', String(out.questions.length)));
      setActiveTab('scan');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('tests.teacherMain.generateFailed'));
    } finally {
      setGenerating(false);
    }
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
    setDurationMinutes(row.duration_minutes != null ? String(row.duration_minutes) : '40');
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
      (row.questions || []).map((q, idx) => {
        const fmt: KidsTestQuestionFormat =
          q.question_format === 'constructed' ? 'constructed' : 'multiple_choice';
        return {
          order: q.order || idx + 1,
          stem: q.stem || '',
          topic: q.topic || '',
          subtopic: q.subtopic || '',
          question_format: fmt,
          constructed_answer: (q.constructed_answer_display || '').trim(),
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
          illustration_url: q.illustration_url ?? null,
          illustration_file: null,
          illustration_cleared: false,
        };
      }),
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

  function openDistributeModal() {
    if (workFromTestId) {
      setDistributeTestId(workFromTestId);
      const row = myTests.find((x) => String(x.id) === workFromTestId);
      if (row?.duration_minutes != null) setDurationMinutes(String(row.duration_minutes));
    }
    setDistributeModalOpen(true);
  }

  async function onConfirmDeleteTest() {
    if (!pendingDeleteTestId) return;
    setDeletingTest(true);
    try {
      await kidsDeleteTest(pendingDeleteTestId);
      toast.success(t('tests.teacherMain.deleteTestSuccess'));
      const mine = await kidsListMyCreatedTests().catch(() => []);
      setMyTests(mine);
      if (String(pendingDeleteTestId) === workFromTestId) {
        resetDraftForm();
      }
      setPendingDeleteTestId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('tests.teacherMain.deleteTestFailed'));
    } finally {
      setDeletingTest(false);
    }
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
    const dm = Math.min(300, Math.max(1, Number(durationMinutes.replace(/\D+/g, '') || 0)));
    if (!Number.isFinite(dm) || dm < 1) {
      toast.error(t('tests.teacherMain.durationRequiredForDistribute'));
      return;
    }
    setDistributing(true);
    try {
      const out = await kidsDistributeTestToClasses(Number(distributeTestId), targetClassIds, {
        duration_minutes: dm,
      });
      if (out.home_class_assigned) {
        toast.success(t('tests.teacherMain.distributeHomeAssigned'));
      } else if (out.created_count > 0) {
        toast.success(`${out.created_count} ${t('tests.teacherMain.sentToClassesSuffix')}`);
      } else {
        toast.success(t('tests.teacherMain.distributeUpdatedNoNewCopies'));
      }
      const mine = await kidsListMyCreatedTests().catch(() => []);
      setMyTests(mine);
      setDistributeClassIds([]);
      setDistributeClassPickerId('');
      setDistributeModalOpen(false);
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
          const fmt: KidsTestQuestionFormat =
            q.question_format === 'constructed' ? 'constructed' : 'multiple_choice';
          const ca = (q.constructed_answer || '').trim();
          return {
            order: q.order || idx + 1,
            stem: q.stem || '',
            topic: q.topic || '',
            subtopic: q.subtopic || '',
            question_format: fmt,
            constructed_answer: ca,
            choices: (q.choices || []).map((c, cIdx) => ({
              key: c.key || String.fromCharCode(65 + cIdx),
              text: c.text || '',
            })),
            correct_choice_key: q.correct_choice_key || '',
            points: q.points || 1,
            source_page_order: typeof q.source_page_order === 'number' && q.source_page_order >= 1 ? q.source_page_order : 1,
            reading_passage_id: link,
            illustration_url: null,
            illustration_file: null,
            illustration_cleared: false,
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
    if (!title.trim()) {
      toast.error(t('tests.teacherMain.titleRequired'));
      return;
    }
    if (questions.length === 0) {
      toast.error(t('tests.teacherMain.needAtLeastOneQuestion'));
      return;
    }
    const hasInvalid = questions.some((q) => {
      if (!q.stem.trim()) return true;
      if (q.question_format === 'constructed') return !q.constructed_answer.trim();
      return q.choices.length < 2 || !q.correct_choice_key;
    });
    if (hasInvalid) {
      toast.error(t('tests.teacherMain.invalidQuestions'));
      return;
    }
    setSaving(true);
    try {
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
          question_format: KidsTestQuestionFormat;
          constructed_answer?: string;
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
          question_format: q.question_format,
          choices: q.question_format === 'constructed' ? [] : q.choices.map((c, cIdx) => ({
            key: c.key || String.fromCharCode(65 + cIdx),
            text: c.text.trim(),
          })),
          correct_choice_key: q.question_format === 'constructed' ? '' : q.correct_choice_key,
          points: q.points || 1,
        };
        if (q.question_format === 'constructed') {
          piece.constructed_answer = q.constructed_answer.trim();
        }
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
        status: 'draft' as const,
        passages: passagesPayload,
        questions: questionsPayload,
      };
      const questionIllustrationFiles = questions
        .map((q, idx) => ({ order: idx + 1, file: q.illustration_file }))
        .filter((x): x is { order: number; file: File } => x.file != null);
      const questionIllustrationClearOrders = questions.reduce<number[]>((acc, q, idx) => {
        if (q.illustration_cleared && !q.illustration_file && Boolean(q.illustration_url)) acc.push(idx + 1);
        return acc;
      }, []);
      const illustrationFileOpts =
        questionIllustrationFiles.length > 0 || questionIllustrationClearOrders.length > 0
          ? {
              questionIllustrations: questionIllustrationFiles,
              questionIllustrationClearOrders,
            }
          : undefined;
      const editingTestId = Number(workFromTestId);
      const isEditing = Number.isFinite(editingTestId) && editingTestId > 0;
      if (isEditing) {
        const updated = await kidsPatchTest(editingTestId, payload, illustrationFileOpts);
        toast.success(t('tests.teacherMain.updated'));
        setMyTests((prev) => [updated, ...prev.filter((x) => x.id !== updated.id)]);
        setWorkFromTestId(String(updated.id));
      } else {
        const created = await kidsCreateStandaloneTest({
          ...payload,
          source_images: images,
          questionIllustrationFiles:
            questionIllustrationFiles.length > 0 ? questionIllustrationFiles : undefined,
        });
        toast.success(t('tests.teacherMain.savedAndCanDistribute'));
        setMyTests((prev) => [created, ...prev.filter((x) => x.id !== created.id)]);
        setWorkFromTestId(String(created.id));
        setDistributeTestId(String(created.id));
        setDistributeModalOpen(true);
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
  const canSendDistribute = canDistribute && distributeDurationValid;

  const questionPendingDelete =
    pendingDeleteIndex !== null ? questions[pendingDeleteIndex] ?? null : null;
  const deleteStemPreview = (questionPendingDelete?.stem || '').trim().replace(/\s+/g, ' ');
  const deletePreviewShort =
    deleteStemPreview.length > 140 ? `${deleteStemPreview.slice(0, 140)}…` : deleteStemPreview;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12 px-2 sm:px-0">
      <header>
        <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50 md:text-3xl">{t('tests.teacherMain.title')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{t('tests.teacherMain.subtitle')}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            resetDraftForm();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group flex flex-col rounded-3xl border border-violet-200 bg-white p-5 text-left shadow-sm transition hover:border-violet-400 hover:shadow-md dark:border-violet-800 dark:bg-gray-900/80 dark:hover:border-violet-600"
        >
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-bold text-violet-950 dark:text-violet-100">{t('tests.teacherMain.cardCreateTitle')}</span>
          <span className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{t('tests.teacherMain.cardCreateBody')}</span>
        </button>
        <button
          type="button"
          onClick={openDistributeModal}
          className="group flex flex-col rounded-3xl border border-fuchsia-200 bg-white p-5 text-left shadow-sm transition hover:border-fuchsia-400 hover:shadow-md dark:border-fuchsia-900/50 dark:bg-gray-900/80 dark:hover:border-fuchsia-600"
        >
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md">
            <Send className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-bold text-fuchsia-950 dark:text-fuchsia-100">{t('tests.teacherMain.cardDistributeTitle')}</span>
          <span className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{t('tests.teacherMain.cardDistributeBody')}</span>
        </button>
        <Link
          href={`${pathPrefix}/ogretmen/testler/raporlar`}
          className="group flex flex-col rounded-3xl border border-amber-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-amber-900/40 dark:bg-gray-900/80 dark:hover:border-amber-600"
        >
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
            <BarChart3 className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-bold text-amber-950 dark:text-amber-100">{t('tests.teacherMain.cardReportsTitle')}</span>
          <span className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{t('tests.teacherMain.cardReportsBody')}</span>
        </Link>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <section className="rounded-3xl border border-violet-200/90 bg-white p-6 shadow-sm dark:border-violet-800 dark:bg-gray-900/70">
            <h2 className="text-lg font-bold text-violet-950 dark:text-violet-50">{t('tests.teacherMain.workflowStep1Title')}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('tests.teacherMain.editViaSelectHint')}</p>
            <div className="mt-3">
              <KidsSelect
                value={workFromTestId}
                onChange={applyTestToForm}
                options={[{ value: '', label: t('tests.teacherMain.emptyArchivePlaceholder') }, ...myTestOptions]}
                searchable
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={resetDraftForm}
                className="rounded-full border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-50 dark:border-violet-700 dark:text-violet-200 dark:hover:bg-violet-950/40"
              >
                {t('tests.teacherMain.clearForm')}
              </button>
              {workFromTestId && editingRow?.deletable ? (
                <button
                  type="button"
                  onClick={() => setPendingDeleteTestId(Number(workFromTestId))}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
                >
                  {t('tests.teacherMain.deleteTest')}
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-violet-200/90 bg-white p-6 shadow-sm dark:border-violet-800 dark:bg-gray-900/70">
            {/* Tab switcher */}
            <div className="mb-5 flex rounded-2xl border border-violet-200 bg-violet-50/60 p-1 dark:border-violet-800 dark:bg-violet-950/30">
              <button
                type="button"
                onClick={() => setActiveTab('scan')}
                className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${
                  activeTab === 'scan'
                    ? 'bg-white text-violet-900 shadow-sm dark:bg-gray-800 dark:text-violet-100'
                    : 'text-slate-600 hover:text-violet-800 dark:text-slate-400 dark:hover:text-violet-200'
                }`}
              >
                {t('tests.teacherMain.tabScan')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('generate')}
                className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${
                  activeTab === 'generate'
                    ? 'bg-white text-violet-900 shadow-sm dark:bg-gray-800 dark:text-violet-100'
                    : 'text-slate-600 hover:text-violet-800 dark:text-slate-400 dark:hover:text-violet-200'
                }`}
              >
                {t('tests.teacherMain.tabGenerate')}
              </button>
            </div>

            {/* --- Generate from document tab --- */}
            {activeTab === 'generate' ? (
              <div>
                <h2 className="text-lg font-bold text-violet-950 dark:text-violet-50">{t('tests.teacherMain.generateTitle')}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('tests.teacherMain.generateSubtitle')}</p>

                <input
                  ref={docFileInputRef}
                  type="file"
                  accept="application/pdf,.pdf,text/plain,.txt,.md,image/*,.jpg,.jpeg,.png,.webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleDocFiles(Array.from(e.target.files || []));
                    e.currentTarget.value = '';
                  }}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); docFileInputRef.current?.click(); } }}
                  onDragEnter={(e) => { e.preventDefault(); setDocDragActive(true); }}
                  onDragOver={(e) => { e.preventDefault(); setDocDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); const rel = e.relatedTarget as Node | null; if (rel && e.currentTarget.contains(rel)) return; setDocDragActive(false); }}
                  onDrop={(e) => { e.preventDefault(); setDocDragActive(false); handleDocFiles(Array.from(e.dataTransfer.files || [])); }}
                  onClick={() => docFileInputRef.current?.click()}
                  className={`mt-4 flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition dark:bg-violet-950/10 ${
                    docDragActive
                      ? 'border-violet-500 bg-violet-100/80 dark:border-violet-400 dark:bg-violet-900/40'
                      : docFiles.length >= MAX_DOC_FILES
                        ? 'cursor-not-allowed border-slate-200 bg-slate-50/60 dark:border-slate-700'
                        : 'border-violet-300 bg-violet-50/70 hover:border-fuchsia-400 hover:bg-violet-50 dark:border-violet-700'
                  }`}
                >
                  <FileUp className="mb-3 h-12 w-12 text-violet-500 dark:text-violet-400" strokeWidth={1.25} />
                  <p className="text-sm font-bold text-violet-950 dark:text-violet-100">{t('tests.teacherMain.generateDropzone')}</p>
                  <p className="mt-2 max-w-sm text-xs text-slate-600 dark:text-slate-400">{t('tests.teacherMain.generateDropzoneSub')}</p>
                  {docFiles.length < MAX_DOC_FILES ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); docFileInputRef.current?.click(); }}
                      className="mt-5 rounded-full border-2 border-violet-500 bg-white px-5 py-2 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-50 dark:border-violet-500 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-900/40"
                    >
                      {t('tests.teacherMain.generateBrowse')}
                    </button>
                  ) : (
                    <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{t('tests.teacherMain.generateMaxFiles')}</p>
                  )}
                </div>

                {docFiles.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {docFiles.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs dark:border-violet-800 dark:bg-violet-950/20">
                        <span className="min-w-0 flex-1 truncate font-semibold text-violet-900 dark:text-violet-100">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setDocFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="shrink-0 rounded-full border border-zinc-300 px-2 py-0.5 font-bold text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                        >
                          {t('tests.teacherMain.generateRemoveFile')}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <label className="mt-4 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('tests.teacherMain.generateQuestionCount')}
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={docQuestionCount}
                    onChange={(e) => setDocQuestionCount(e.target.value.replace(/\D+/g, ''))}
                    inputMode="numeric"
                    className="mt-1 w-32 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800"
                    placeholder="10"
                  />
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('tests.teacherMain.generateQuestionCountHint')}</p>

                <button
                  type="button"
                  disabled={generating || docFiles.length === 0}
                  onClick={() => void onGenerate()}
                  className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
                >
                  {generating ? t('tests.teacherMain.generating') : t('tests.teacherMain.generateBtn')}
                </button>
              </div>
            ) : null}

            {/* --- Scan tab (mevcut) --- */}
            {activeTab === 'scan' ? (
              <>
            <h2 className="text-lg font-bold text-violet-950 dark:text-violet-50">{t('tests.teacherMain.workflowStep2Title')}</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                void appendUploadFiles(Array.from(e.target.files || []));
                e.currentTarget.value = '';
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setUploadDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setUploadDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                const rel = e.relatedTarget as Node | null;
                if (rel && e.currentTarget.contains(rel)) return;
                setUploadDragActive(false);
              }}
              onDrop={onUploadDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition dark:bg-violet-950/10 ${
                uploadDragActive
                  ? 'border-violet-500 bg-violet-100/80 dark:border-violet-400 dark:bg-violet-900/40'
                  : 'border-violet-300 bg-violet-50/70 hover:border-fuchsia-400 hover:bg-violet-50 dark:border-violet-700'
              }`}
            >
              <FileUp className="mb-3 h-12 w-12 text-violet-500 dark:text-violet-400" strokeWidth={1.25} />
              <p className="text-sm font-bold text-violet-950 dark:text-violet-100">{t('tests.teacherMain.dropzoneHeadline')}</p>
              <p className="mt-2 max-w-sm text-xs text-slate-600 dark:text-slate-400">{t('tests.teacherMain.dropzoneSub')}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-5 rounded-full border-2 border-violet-500 bg-white px-5 py-2 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-50 dark:border-violet-500 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-900/40"
              >
                {t('tests.teacherMain.browseFiles')}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('tests.teacherMain.uploadHint')}</p>

            {existingSourceMediaItems.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-3 dark:border-violet-800 dark:bg-violet-950/20">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  {t('tests.teacherMain.savedSourcePages')}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t('tests.teacherMain.savedSourceSliderHint')}</p>
                <div className="mt-2">
                  <MediaSlider
                    items={existingSourceMediaItems}
                    className="h-52"
                    alt={t('tests.teacherMain.savedSourcePages')}
                    fit="contain"
                  />
                </div>
              </div>
            ) : null}
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
            {uploadPreviewItems.length > 0 ? (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {t('tests.teacherMain.pendingUploadsForExtract')}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('teacherHomework.sliderHint')}</p>
                <div className="mt-2">
                  <MediaSlider
                    items={uploadPreviewItems}
                    className="h-52"
                    alt={t('tests.teacherMain.pendingUploadsForExtract')}
                    fit="contain"
                    onDeleteAtIndex={(idx) => setImages((prev) => prev.filter((_, i) => i !== idx))}
                  />
                </div>
              </div>
            ) : null}
            {pdfConverting ? (
              <p className="mt-3 text-center text-xs font-semibold text-violet-800 dark:text-violet-200">
                {t('tests.teacherMain.pdfConverting')}
              </p>
            ) : null}
            <button
              type="button"
              disabled={extracting || pdfConverting || images.length === 0}
              onClick={() => void onExtract()}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
            >
              {extracting ? t('tests.teacherMain.aiRunning') : t('tests.teacherMain.step2')}
            </button>
              </>
            ) : null}
          </section>
        </div>

        <section className="rounded-3xl border border-violet-200/90 bg-white p-6 shadow-sm dark:border-violet-800 dark:bg-gray-900/70">
            <div className="border-b border-violet-100 pb-4 dark:border-violet-900/50">
              <h2 className="text-lg font-bold text-violet-950 dark:text-violet-50">{t('tests.teacherMain.workflowStep4Title')}</h2>
              <p className="mt-1 text-sm font-semibold text-violet-600 dark:text-violet-300">
                {t('tests.teacherMain.questionsFoundBadge').replace('{n}', String(questions.length))}
              </p>
              <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/50 px-3 py-2.5 dark:border-violet-900/40 dark:bg-violet-950/20">
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {t('tests.teacherMain.editorSaveHint')}
                </p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('tests.teacherMain.testTitle')}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm dark:border-violet-700 dark:bg-gray-800"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('tests.teacherMain.description')}
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm dark:border-violet-700 dark:bg-gray-800"
              />
            </label>

            <div className="mt-6 space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
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
                    <li key={p.id} className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-800 dark:bg-gray-900/60">
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

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-violet-950 dark:text-violet-100">{t('tests.teacherMain.questionsBlockTitle')}</p>
              <button
                type="button"
                onClick={addQuestion}
                className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-900 shadow-sm transition hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/50"
              >
                {t('tests.teacherMain.addQuestion')}
              </button>
            </div>

            <div className="mt-4 space-y-5">
              {questions.map((q, qIdx) => (
                <div
                  key={`${q.order}-${qIdx}`}
                  className="relative overflow-hidden rounded-2xl border border-violet-200/90 bg-white pl-4 pr-4 pb-4 pt-5 shadow-sm dark:border-violet-800 dark:bg-gray-900/50"
                >
                  <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xs font-bold text-white shadow-md">
                    {qIdx + 1}
                  </div>
                  <div className="ml-12 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-violet-950 dark:text-violet-100">{t('tests.teacherMain.questionLabel')}</p>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteIndex(qIdx)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-950/80"
                    >
                      {t('tests.teacherMain.deleteQuestion')}
                    </button>
                  </div>
                  <div className="ml-12 mt-2 w-[calc(100%-3rem)] max-w-xl">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('tests.teacherMain.questionIllustrationLabel')}
                    </p>
                    <QuestionStemIllustrationPreview
                      file={q.illustration_file}
                      url={q.illustration_url}
                      cleared={q.illustration_cleared}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        id={`q-ill-${qIdx}`}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          if (f.size > QUESTION_ILLUSTRATION_MAX_BYTES) {
                            toast.error(t('tests.teacherMain.questionIllustrationTooBig'));
                            return;
                          }
                          setQuestionField(qIdx, { illustration_file: f, illustration_cleared: false });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById(`q-ill-${qIdx}`)?.click()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-900 shadow-sm transition hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/50"
                      >
                        <ImagePlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {t('tests.teacherMain.pickQuestionIllustration')}
                      </button>
                      {q.illustration_file || (q.illustration_url && !q.illustration_cleared) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setQuestions((prev) =>
                              prev.map((qq, i) => {
                                if (i !== qIdx) return qq;
                                if (qq.illustration_file) return { ...qq, illustration_file: null };
                                if (qq.illustration_url) return { ...qq, illustration_cleared: true };
                                return qq;
                              }),
                            );
                          }}
                          className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-gray-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          {t('tests.teacherMain.removeQuestionIllustration')}
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {t('tests.teacherMain.questionIllustrationHint')}
                    </p>
                  </div>
                  <textarea
                    value={q.stem}
                    onChange={(e) => setQuestionField(qIdx, { stem: e.target.value })}
                    rows={2}
                    className="ml-12 mt-2 w-[calc(100%-3rem)] rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800"
                  />
                  <div className="ml-12 mt-3 w-full max-w-md">
                    <p className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('tests.teacherMain.questionFormatLabel')}
                    </p>
                    <KidsSelect
                      value={q.question_format}
                      onChange={(next) => {
                        const nf = (next === 'constructed' ? 'constructed' : 'multiple_choice') as KidsTestQuestionFormat;
                        if (nf === 'constructed') {
                          setQuestionField(qIdx, { question_format: 'constructed', correct_choice_key: '' });
                        } else {
                          setQuestionField(qIdx, {
                            question_format: 'multiple_choice',
                            choices:
                              q.choices.length >= 2
                                ? q.choices
                                : [
                                    { key: 'A', text: '' },
                                    { key: 'B', text: '' },
                                    { key: 'C', text: '' },
                                  ],
                          });
                        }
                      }}
                      options={[
                        { value: 'multiple_choice', label: t('tests.teacherMain.formatMc') },
                        { value: 'constructed', label: t('tests.teacherMain.formatConstructed') },
                      ]}
                      searchable={false}
                    />
                  </div>
                  {q.question_format === 'constructed' ? (
                    <label className="ml-12 mt-3 block w-[calc(100%-3rem)] max-w-xl">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t('tests.teacherMain.constructedAnswerLabel')}
                      </span>
                      <input
                        value={q.constructed_answer}
                        onChange={(e) => setQuestionField(qIdx, { constructed_answer: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800"
                        placeholder="ör. 30"
                      />
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {t('tests.teacherMain.constructedAnswerHint')}
                      </p>
                    </label>
                  ) : (
                    <>
                      <div className="ml-12 mt-3 grid gap-2 md:grid-cols-2">
                        {q.choices.map((c, cIdx) => (
                          <div
                            key={`${qIdx}-${c.key}`}
                            className={`rounded-xl border-2 bg-white px-3 py-2 transition dark:bg-gray-900/80 ${
                              q.correct_choice_key === c.key
                                ? 'border-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.2)] dark:border-violet-400'
                                : 'border-zinc-200 dark:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-800 dark:bg-violet-900/60 dark:text-violet-200">
                                {c.key}
                              </span>
                              <input
                                value={c.text}
                                onChange={(e) => {
                                  const nextChoices = [...q.choices];
                                  nextChoices[cIdx] = { ...nextChoices[cIdx], text: e.target.value };
                                  setQuestionField(qIdx, { choices: nextChoices });
                                }}
                                className="min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-slate-900 outline-none ring-0 focus:ring-0 dark:text-slate-100"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="ml-12 mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={q.choices.length >= MC_MAX_CHOICES}
                          onClick={() => addMcChoice(qIdx)}
                          className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/50"
                        >
                          {t('tests.teacherMain.addMcChoice')}
                        </button>
                        <button
                          type="button"
                          disabled={q.choices.length <= MC_MIN_CHOICES}
                          onClick={() => removeLastMcChoice(qIdx)}
                          className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          {t('tests.teacherMain.removeLastMcChoice')}
                        </button>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t('tests.teacherMain.mcChoiceCountHint').replace('{n}', String(q.choices.length))}
                        </span>
                      </div>
                      <div className="ml-12 mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{t('tests.teacherMain.correctChoice')}:</span>
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
                    </>
                  )}
                  {passages.length > 0 ? (
                    <div className="ml-12 mt-2">
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
                    <div className="ml-12 mt-2">
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
                <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center dark:border-violet-800 dark:bg-violet-950/20">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t('tests.teacherMain.noQuestionsHint')}</p>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-violet-500"
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

            <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-violet-100 pt-6 dark:border-violet-900/40">
              <button
                type="button"
                onClick={() => resetDraftForm()}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-6 text-sm font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-gray-900 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void onPublish()}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-fuchsia-500 px-8 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/30 transition hover:from-violet-500 hover:via-fuchsia-500 hover:to-fuchsia-400 disabled:opacity-50"
              >
                {saving
                  ? isEditingDraft
                    ? t('tests.teacherMain.updating')
                    : t('tests.teacherMain.saving')
                  : isEditingDraft
                    ? t('tests.teacherMain.step4Update')
                    : t('tests.teacherMain.step4Save')}
              </button>
            </div>
          </section>
      </div>

      {distributeModalOpen ? (
        <KidsCenteredModal
          title={t('tests.teacherMain.distributeSectionTitle')}
          maxWidthClass="max-w-2xl"
          onClose={() => setDistributeModalOpen(false)}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <KidsSecondaryButton type="button" onClick={() => setDistributeModalOpen(false)}>
                {t('common.cancel')}
              </KidsSecondaryButton>
              <KidsPrimaryButton
                type="button"
                disabled={distributing || !canSendDistribute}
                onClick={() => void onDistribute()}
              >
                {distributing ? t('tests.teacherMain.sending') : t('tests.teacherMain.sendSelectedClasses')}
              </KidsPrimaryButton>
            </div>
          }
        >
          <div className="rounded-2xl border border-violet-200/90 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-violet-900 dark:text-violet-100">
                <Clock className="h-4 w-4 shrink-0 text-violet-500" />
                {t('tests.teacherMain.durationMin')}
              </label>
              <input
                type="number"
                min={1}
                max={300}
                step={1}
                value={durationMinutes}
                onChange={(e) => onDurationMinutesChange(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800"
                placeholder="40"
                inputMode="numeric"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('tests.teacherMain.durationHintDistribute')}</p>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">{t('tests.teacherMain.publicationModalHint')}</p>

            {myTests.length > 0 ? (
              <div className="mt-5 border-t border-violet-200/80 pt-5 dark:border-violet-800/80">
                <h3 className="text-sm font-bold text-violet-900 dark:text-violet-100">{t('tests.teacherMain.distributeTest')}</h3>
                <p className="mt-1 text-xs text-violet-800/90 dark:text-violet-200/90">{t('tests.teacherMain.distributeHint')}</p>
                {distributeRow?.kids_class == null ? (
                  <p className="mt-2 text-[11px] font-medium text-violet-800/90 dark:text-violet-200/85">
                    {t('tests.teacherMain.distributeUnassignedFirstClassHint')}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDistributeScope('all')}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      distributeScope === 'all'
                        ? 'bg-violet-600 text-white'
                        : 'border border-violet-300 text-violet-800 dark:border-violet-600 dark:text-violet-200'
                    }`}
                  >
                    {t('tests.teacherMain.allMyClasses')} ({classes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistributeScope('custom')}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      distributeScope === 'custom'
                        ? 'bg-violet-600 text-white'
                        : 'border border-violet-300 text-violet-800 dark:border-violet-600 dark:text-violet-200'
                    }`}
                  >
                    {t('tests.teacherMain.customSelection')}
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-violet-900 dark:text-violet-100">{t('tests.reports.test')}</label>
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
                    <label className="text-xs font-semibold text-violet-900 dark:text-violet-100">{t('tests.teacherMain.targetClasses')}</label>
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
                            className="rounded-lg border border-violet-300 px-2 py-1 text-xs font-bold text-violet-800 dark:border-violet-600 dark:text-violet-200"
                          >
                            {t('tests.teacherMain.add')}
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {distributeClassIds.map((id) => (
                            <span
                              key={`target-chip-${id}`}
                              className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-900 dark:bg-violet-900/50 dark:text-violet-100"
                            >
                              {classNameById.get(id) || `${t('tests.teacherMain.classLabel')} #${id}`}
                              <button
                                type="button"
                                onClick={() => removeDistributeClass(id)}
                                className="rounded-full border border-violet-300 px-1 text-[10px] dark:border-violet-600"
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
                      <div className="mt-1 rounded-lg border border-violet-200 bg-white p-2 text-xs dark:border-violet-700 dark:bg-gray-900/60">
                        {`${t('tests.teacherMain.targetAllClasses')}: (${classes.length})`}
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">{t('tests.teacherMain.distributeDurationNote')}</p>
              </div>
            ) : (
              <p className="mt-5 border-t border-violet-200/80 pt-4 text-sm text-slate-600 dark:border-violet-800/80 dark:text-slate-400">
                {t('tests.teacherMain.noUploadedTestsDistributeHint')}
              </p>
            )}
          </div>
        </KidsCenteredModal>
      ) : null}

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

      {pendingDeleteTestId !== null ? (
        <KidsCenteredModal
          variant="danger"
          title={t('tests.teacherMain.deleteTestModalTitle')}
          onClose={() => {
            if (!deletingTest) setPendingDeleteTestId(null);
          }}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <KidsSecondaryButton type="button" disabled={deletingTest} onClick={() => setPendingDeleteTestId(null)}>
                {t('common.cancel')}
              </KidsSecondaryButton>
              <button
                type="button"
                disabled={deletingTest}
                onClick={() => void onConfirmDeleteTest()}
                className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-rose-800/30 bg-rose-600 px-8 text-sm font-bold text-white shadow-md shadow-rose-900/25 transition hover:bg-rose-700 disabled:opacity-60 dark:border-rose-400/20 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-500"
              >
                {deletingTest ? t('common.loading') : t('tests.teacherMain.deleteTestConfirm')}
              </button>
            </div>
          }
        >
          <p className="text-sm text-slate-700 dark:text-slate-300">{t('tests.teacherMain.deleteTestModalBody')}</p>
        </KidsCenteredModal>
      ) : null}
    </div>
  );
}
