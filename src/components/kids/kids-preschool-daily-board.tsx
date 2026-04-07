'use client';

import { useCallback, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BriefcaseMedical,
  ClipboardList,
  Copy,
  Moon,
  MoreVertical,
  Send,
  StickyNote,
  UtensilsCrossed,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  KidsKindergartenBulkBody,
  KidsKindergartenDailyBoardResponse,
  KidsKindergartenSlotItem,
} from '@/src/lib/kids-api';
import {
  KidsCenteredModal,
  KidsEmptyState,
  KidsPrimaryButton,
  KidsSecondaryButton,
  kidsInputClass,
  kidsTextareaClass,
} from '@/src/components/kids/kids-ui';

function cycleTri(v: boolean | null): boolean | null {
  if (v === null) return false;
  if (v === false) return true;
  return null;
}

function slotOkFromRecord(
  legacy: boolean | null | undefined,
  slots: { ok?: boolean | null }[] | null | undefined,
): boolean | null {
  if (slots && slots.length > 0) {
    const o = slots[0].ok;
    if (o === true || o === false || o === null) return o;
  }
  return legacy ?? null;
}

function nextMealSlots(
  rec: { meal_slots?: KidsKindergartenSlotItem[] | null } | null | undefined,
  mealLabel: string,
  nextOk: boolean | null,
): KidsKindergartenSlotItem[] {
  const existing = rec?.meal_slots;
  if (existing && existing.length > 1) {
    return existing.map((s, i) => (i === 0 ? { ...s, ok: nextOk } : s));
  }
  if (existing && existing.length === 1) {
    return [{ ...existing[0], ok: nextOk }];
  }
  return [{ label: mealLabel, ok: nextOk }];
}

function nextNapSlots(
  rec: { nap_slots?: KidsKindergartenSlotItem[] | null } | null | undefined,
  napLabel: string,
  nextOk: boolean | null,
): KidsKindergartenSlotItem[] {
  const existing = rec?.nap_slots;
  if (existing && existing.length > 1) {
    return existing.map((s, i) => (i === 0 ? { ...s, ok: nextOk } : s));
  }
  if (existing && existing.length === 1) {
    return [{ ...existing[0], ok: nextOk }];
  }
  return [{ label: napLabel, ok: nextOk }];
}

type PatchBody = Partial<{
  present: boolean | null;
  meal_ok: boolean | null;
  nap_ok: boolean | null;
  meal_slots: { label: string; ok: boolean | null }[];
  nap_slots: { label: string; ok: boolean | null }[];
  teacher_day_note: string;
}>;

export type KidsPreschoolDailyBoardProps = {
  kgDate: string;
  setKgDate: (v: string) => void;
  kgBoard: KidsKindergartenDailyBoardResponse | null;
  kgLoading: boolean;
  kgPlanDraft: string;
  setKgPlanDraft: (v: string) => void;
  kgSavingPlan: boolean;
  onSavePlan: () => void;
  onRefresh: () => void;
  kgPatchField: (studentId: number, body: PatchBody) => Promise<void>;
  kgPatchingStudents: Set<number>;
  kgBulkTarget: 'all_enrolled' | 'present_only';
  setKgBulkTarget: (v: 'all_enrolled' | 'present_only') => void;
  kgRunBulk: (body: KidsKindergartenBulkBody) => void;
  kgBulkBusy: boolean;
  kgBulkNote: string;
  setKgBulkNote: (v: string) => void;
  t: (key: string) => string;
  /** Tarih/saat rozetleri icin (or. `tr`). */
  locale?: string;
};

function DailyActivitySquare({
  label,
  disabled,
  onClick,
  icon: Icon,
  variant,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  icon: LucideIcon;
  variant: 'neutral' | 'mealOn' | 'mealOff' | 'napOn' | 'napOff' | 'healthOn' | 'healthOff' | 'noteOn';
}) {
  const v =
    variant === 'mealOn'
      ? 'border-pink-300 bg-pink-100 text-pink-800 shadow-sm dark:border-pink-700 dark:bg-pink-950/50 dark:text-pink-100'
      : variant === 'mealOff'
        ? 'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-950/45 dark:text-rose-100'
        : variant === 'napOn'
          ? 'border-violet-300 bg-violet-100 text-violet-900 shadow-sm dark:border-violet-600 dark:bg-violet-950/50 dark:text-violet-100'
          : variant === 'napOff'
            ? 'border-orange-300 bg-orange-100 text-orange-950 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-50'
            : variant === 'healthOn'
              ? 'border-emerald-300 bg-emerald-100 text-emerald-900 shadow-sm dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-50'
              : variant === 'healthOff'
                ? 'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-950/45 dark:text-rose-100'
                : variant === 'noteOn'
                  ? 'border-amber-300 bg-amber-100 text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-50'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 text-center transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 sm:min-h-[5rem] ${v}`}
    >
      <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" strokeWidth={2.25} aria-hidden />
      <span className="max-w-full px-0.5 text-[9px] font-bold uppercase leading-tight tracking-wide sm:text-[10px]">{label}</span>
    </button>
  );
}

export function KidsPreschoolDailyBoard({
  kgDate,
  setKgDate,
  kgBoard,
  kgLoading,
  kgPlanDraft,
  setKgPlanDraft,
  kgSavingPlan,
  onSavePlan,
  onRefresh,
  kgPatchField,
  kgPatchingStudents,
  kgBulkTarget,
  setKgBulkTarget,
  kgRunBulk,
  kgBulkBusy,
  kgBulkNote,
  setKgBulkNote,
  t,
  locale = 'tr',
}: KidsPreschoolDailyBoardProps) {
  const [noteForStudent, setNoteForStudent] = useState<{
    id: number;
    name: string;
    draft: string;
  } | null>(null);
  const [endDayModalOpen, setEndDayModalOpen] = useState(false);

  const mealLabel = useMemo(() => t('teacherClass.kindergarten.cardSlotMeal'), [t]);
  const napLabel = useMemo(() => t('teacherClass.kindergarten.cardSlotNap'), [t]);

  const boardStats = useMemo(() => {
    if (!kgBoard?.rows?.length) return null;
    const rows = kgBoard.rows;
    const n = rows.length;
    let present = 0;
    let mealYes = 0;
    let napYes = 0;
    let pendingDigest = 0;
    for (const r of rows) {
      const rec = r.record;
      if (rec?.present === true) present += 1;
      const m = slotOkFromRecord(rec?.meal_ok, rec?.meal_slots);
      if (m === true) mealYes += 1;
      const nap = slotOkFromRecord(rec?.nap_ok, rec?.nap_slots);
      if (nap === true) napYes += 1;
      if (!rec?.digest_sent_at) pendingDigest += 1;
    }
    return { n, present, mealYes, napYes, pendingDigest };
  }, [kgBoard]);

  const runChip = useCallback(
    (body: KidsKindergartenBulkBody) => {
      if (kgBulkBusy || kgLoading) return;
      kgRunBulk(body);
    },
    [kgBulkBusy, kgLoading, kgRunBulk],
  );

  const confirmEndDayAndSend = useCallback(() => {
    if (kgBulkBusy || kgLoading) return;
    setEndDayModalOpen(false);
    runChip({ action: 'send_digest' });
  }, [kgBulkBusy, kgLoading, runChip]);

  const saveNote = useCallback(async () => {
    if (!noteForStudent) return;
    await kgPatchField(noteForStudent.id, { teacher_day_note: noteForStudent.draft.trim() });
    setNoteForStudent(null);
  }, [kgPatchField, noteForStudent]);

  const veliReportButtonClass =
    'flex w-full items-center justify-center gap-2 rounded-full border-2 border-violet-400/50 bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-500 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-500/35 transition active:scale-[0.99] disabled:opacity-50 dark:border-violet-700 dark:from-violet-700 dark:via-violet-600 dark:to-cyan-600 dark:shadow-black/40';

  return (
    <div className="relative pb-6 sm:pb-8">
      <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="border-l-[5px] border-violet-600 pl-3 font-logo text-xl font-bold tracking-tight text-slate-900 dark:border-violet-500 dark:text-white sm:text-2xl">
              {t('teacherClass.kindergarten.title')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t('teacherClass.kindergarten.subtitleV2')}
            </p>
            <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-500">{t('teacherClass.kindergarten.boardHintV2')}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <span className="mb-1">{t('teacherClass.kindergarten.date')}</span>
              <input
                type="date"
                value={kgDate}
                onChange={(e) => setKgDate(e.target.value)}
                className={`${kidsInputClass} min-h-11 rounded-xl border-zinc-200 bg-zinc-50 text-sm dark:border-zinc-600 dark:bg-zinc-800`}
              />
            </label>
            <KidsSecondaryButton
              type="button"
              disabled={kgLoading}
              className="min-h-11 rounded-xl border-violet-200 text-violet-800 dark:border-violet-800 dark:text-violet-200"
              onClick={() => onRefresh()}
            >
              {kgLoading ? t('common.loading') : t('teacherClass.kindergarten.refresh')}
            </KidsSecondaryButton>
          </div>
        </div>
      </div>

      {boardStats ? (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-logo text-3xl font-black text-slate-900 dark:text-white">{boardStats.present}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
              {t('teacherClass.kindergarten.summaryPresentSub')}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
              {t('teacherClass.kindergarten.summaryTotalOf').replace('{n}', String(boardStats.n))}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-logo text-3xl font-black text-slate-900 dark:text-white">
              {boardStats.mealYes}/{boardStats.n}
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-rose-500 dark:text-rose-400">
              {t('teacherClass.kindergarten.summaryMealsSub')}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">{t('teacherClass.kindergarten.summaryMealsHint')}</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-logo text-3xl font-black text-slate-900 dark:text-white">{boardStats.napYes}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t('teacherClass.kindergarten.summaryNapSub')}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">{t('teacherClass.kindergarten.summaryNapHint')}</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 border-l-4 border-l-violet-600 bg-white p-4 shadow-md dark:border-zinc-800 dark:border-l-violet-500 dark:bg-zinc-900">
            <p className="font-logo text-3xl font-black text-slate-900 dark:text-white">{boardStats.pendingDigest}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-violet-900 dark:text-violet-200">
              {t('teacherClass.kindergarten.summaryPendingSub')}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">{t('teacherClass.kindergarten.summaryPendingHint')}</p>
          </div>
        </div>
      ) : null}

      <details className="mt-5 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-800 dark:text-white [&::-webkit-details-marker]:hidden">
          <ClipboardList className="mr-2 inline h-4 w-4 text-violet-600 align-text-bottom dark:text-violet-400" aria-hidden />
          {t('teacherClass.kindergarten.planSummaryToggle')}
        </summary>
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
          <textarea
            value={kgPlanDraft}
            onChange={(e) => setKgPlanDraft(e.target.value)}
            rows={3}
            className={`${kidsTextareaClass} rounded-xl border-zinc-200 bg-white text-sm dark:border-zinc-700 dark:bg-zinc-950`}
            placeholder={t('teacherClass.kindergarten.planPlaceholder')}
          />
          <KidsPrimaryButton
            type="button"
            disabled={kgSavingPlan}
            className="mt-2 rounded-xl bg-violet-600 hover:bg-violet-500"
            onClick={() => onSavePlan()}
          >
            {kgSavingPlan ? t('profile.saving') : t('teacherClass.kindergarten.savePlan')}
          </KidsPrimaryButton>
        </div>
      </details>

      <details className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-800 dark:text-white [&::-webkit-details-marker]:hidden">
          {t('teacherClass.kindergarten.bulkToolsToggle')}
        </summary>
        <div className="space-y-4 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <span className="w-full text-xs font-bold text-zinc-700 dark:text-zinc-200 sm:w-auto">{t('teacherClass.kindergarten.chipsTarget')}</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setKgBulkTarget('all_enrolled')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  kgBulkTarget === 'all_enrolled'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-white text-zinc-800 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-600'
                }`}
              >
                {t('teacherClass.kindergarten.chipsTargetAll')}
              </button>
              <button
                type="button"
                onClick={() => setKgBulkTarget('present_only')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  kgBulkTarget === 'present_only'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-white text-zinc-800 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-600'
                }`}
              >
                {t('teacherClass.kindergarten.chipsTargetPresent')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={kgBulkBusy || kgLoading}
              onClick={() => runChip({ action: 'mark_present', present: true })}
              className="shrink-0 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 shadow-sm active:scale-[0.98] disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
            >
              ✓ {t('teacherClass.kindergarten.chipAllPresent')}
            </button>
            <button
              type="button"
              disabled={kgBulkBusy || kgLoading}
              onClick={() =>
                runChip({
                  action: 'meal_slot',
                  slot_label: mealLabel,
                  ok: true,
                })
              }
              className="shrink-0 rounded-2xl border-2 border-lime-200 bg-lime-50 px-3 py-2 text-xs font-bold text-lime-900 shadow-sm active:scale-[0.98] disabled:opacity-50 dark:border-lime-900 dark:bg-lime-950/30 dark:text-lime-100"
            >
              🍽 {t('teacherClass.kindergarten.chipAllMealFull')}
            </button>
            <button
              type="button"
              disabled={kgBulkBusy || kgLoading}
              onClick={() =>
                runChip({
                  action: 'meal_slot',
                  slot_label: mealLabel,
                  ok: null,
                })
              }
              className="shrink-0 rounded-2xl border-2 border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 shadow-sm active:scale-[0.98] disabled:opacity-50 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-100"
            >
              🍽 {t('teacherClass.kindergarten.chipAllMealHalf')}
            </button>
            <button
              type="button"
              disabled={kgBulkBusy || kgLoading}
              onClick={() =>
                runChip({
                  action: 'meal_slot',
                  slot_label: mealLabel,
                  ok: false,
                })
              }
              className="shrink-0 rounded-2xl border-2 border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-900 shadow-sm active:scale-[0.98] disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/35 dark:text-rose-100"
            >
              🍽 {t('teacherClass.kindergarten.chipAllMealNone')}
            </button>
            <button
              type="button"
              disabled={kgBulkBusy || kgLoading}
              onClick={() =>
                runChip({
                  action: 'nap_slot',
                  slot_label: napLabel,
                  ok: true,
                })
              }
              className="shrink-0 rounded-2xl border-2 border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 shadow-sm active:scale-[0.98] disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
            >
              😴 {t('teacherClass.kindergarten.chipAllNapYes')}
            </button>
            <button
              type="button"
              disabled={kgBulkBusy || kgLoading}
              onClick={() =>
                runChip({
                  action: 'nap_slot',
                  slot_label: napLabel,
                  ok: false,
                })
              }
              className="shrink-0 rounded-2xl border-2 border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900 shadow-sm active:scale-[0.98] disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
            >
              😴 {t('teacherClass.kindergarten.chipAllNapNo')}
            </button>
          </div>

          <details className="rounded-xl border border-amber-200/70 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
            <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-amber-950 dark:text-amber-100">
              {t('teacherClass.kindergarten.advancedBulkNote')}
            </summary>
            <div className="border-t border-amber-200/50 p-3 dark:border-amber-900/40">
              <textarea
                value={kgBulkNote}
                onChange={(e) => setKgBulkNote(e.target.value)}
                rows={2}
                className={`${kidsTextareaClass} text-sm`}
                placeholder={t('teacherClass.kindergarten.notePlaceholder')}
              />
              <KidsSecondaryButton
                type="button"
                disabled={kgBulkBusy || kgLoading}
                className="mt-2 rounded-xl"
                onClick={() => runChip({ action: 'set_note', note: kgBulkNote.trim() })}
              >
                {t('teacherClass.kindergarten.bulkApplyNote')}
              </KidsSecondaryButton>
            </div>
          </details>
        </div>
      </details>

      {kgLoading && !kgBoard ? (
        <p className="mt-8 text-center text-sm font-semibold text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      ) : null}

      {kgBoard && kgBoard.rows.length === 0 ? (
        <div className="mt-8">
          <KidsEmptyState
            emoji="🧒"
            title={t('teacherClass.kindergarten.emptyStudentsTitle')}
            description={t('teacherClass.kindergarten.emptyStudentsDesc')}
          />
        </div>
      ) : null}

      {kgBoard && kgBoard.rows.length > 0 ? (
        <>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
          {kgBoard.rows.map((row) => {
            const st = row.student;
            const rec = row.record;
            const busy = kgPatchingStudents.has(st.id);
            const name = `${st.first_name} ${st.last_name}`.trim() || `#${st.id}`;
            const present = rec?.present ?? null;
            const meal = slotOkFromRecord(rec?.meal_ok, rec?.meal_slots);
            const nap = slotOkFromRecord(rec?.nap_ok, rec?.nap_slots);
            const absent = present === false;
            const photo = st.profile_picture;
            const noteText = (rec?.teacher_day_note ?? '').trim();
            const hasNote = noteText.length > 0;

            const mealVariant =
              meal === true ? 'mealOn' : meal === false ? 'mealOff' : 'neutral';
            const mealLabelSq =
              meal === true
                ? t('teacherClass.kindergarten.squareMealFull')
                : meal === false
                  ? t('teacherClass.kindergarten.squareMealNone')
                  : t('teacherClass.kindergarten.squareMealHalf');

            const napVariant = nap === true ? 'napOn' : nap === false ? 'napOff' : 'neutral';
            const napLabelSq =
              nap === true
                ? t('teacherClass.kindergarten.squareNapYes')
                : nap === false
                  ? t('teacherClass.kindergarten.squareNapNo')
                  : t('teacherClass.kindergarten.squareNapUnset');

            const healthVariant =
              present === true ? 'healthOn' : present === false ? 'healthOff' : 'neutral';
            const healthLabelSq =
              present === true
                ? t('teacherClass.kindergarten.squareHealthHere')
                : present === false
                  ? t('teacherClass.kindergarten.squareHealthAbsent')
                  : t('teacherClass.kindergarten.squareHealthUnset');

            const noteVariant = hasNote ? 'noteOn' : 'neutral';
            const noteLabelSq = hasNote ? t('teacherClass.kindergarten.squareNoteHas') : t('teacherClass.kindergarten.squareNoteEmpty');

            const timeStr =
              present === true && rec?.present_marked_at
                ? new Date(rec.present_marked_at).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;
            const badgeText =
              present === true && timeStr
                ? t('teacherClass.kindergarten.badgeCheckedIn').replace('{time}', timeStr)
                : present === false
                  ? t('teacherClass.kindergarten.badgeNotArrived')
                  : t('teacherClass.kindergarten.badgePending');
            const badgeClass =
              present === true
                ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-800'
                : present === false
                  ? 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600'
                  : 'bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-800';

            return (
              <li
                key={st.id}
                className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white p-4 shadow-lg ring-1 ring-black/[0.03] dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/5"
              >
                <details className="absolute top-3 right-3 z-10">
                  <summary className="flex cursor-pointer list-none items-center justify-center rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden">
                    <span className="sr-only">{t('teacherClass.kindergarten.cardMenuAria')}</span>
                    <MoreVertical className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  </summary>
                  <div
                    className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-zinc-50 dark:text-gray-100 dark:hover:bg-zinc-800"
                      onClick={(e) => {
                        void navigator.clipboard?.writeText(st.email).then(
                          () => {
                            toast.success(t('teacherClass.kindergarten.cardEmailCopied'));
                            (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open');
                          },
                          () => toast.error(t('teacherClass.invite.copyFailed')),
                        );
                      }}
                    >
                      {t('teacherClass.kindergarten.cardMenuCopyEmail')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-zinc-50 disabled:opacity-50 dark:text-gray-100 dark:hover:bg-zinc-800"
                      disabled={busy || absent}
                      onClick={(e) => {
                        setNoteForStudent({ id: st.id, name, draft: rec?.teacher_day_note ?? '' });
                        (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open');
                      }}
                    >
                      {t('teacherClass.kindergarten.cardNoteOpen')}
                    </button>
                  </div>
                </details>

                <div className="flex gap-3 pr-8">
                  <div className="relative shrink-0">
                    <div className="h-14 w-14 overflow-hidden rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 ring-2 ring-white dark:from-violet-950/50 dark:to-fuchsia-950/40 dark:ring-zinc-800 sm:h-16 sm:w-16">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-logo text-xl font-black text-violet-700 dark:text-violet-200">
                          {(st.first_name?.[0] || '?').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span
                      className={`absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                        present === true ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                      }`}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-logo text-base font-bold text-slate-900 dark:text-white">{name}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{st.email}</p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}
                    >
                      {badgeText}
                    </span>
                    {rec?.digest_sent_at ? (
                      <p className="mt-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ {t('teacherClass.kindergarten.cardDigestSent')}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <DailyActivitySquare
                    label={mealLabelSq}
                    icon={UtensilsCrossed}
                    variant={mealVariant}
                    disabled={busy || absent}
                    onClick={() =>
                      void kgPatchField(st.id, {
                        meal_slots: nextMealSlots(rec, mealLabel, cycleTri(meal)),
                      })
                    }
                  />
                  <DailyActivitySquare
                    label={napLabelSq}
                    icon={Moon}
                    variant={napVariant}
                    disabled={busy || absent}
                    onClick={() =>
                      void kgPatchField(st.id, {
                        nap_slots: nextNapSlots(rec, napLabel, cycleTri(nap)),
                      })
                    }
                  />
                  <DailyActivitySquare
                    label={healthLabelSq}
                    icon={BriefcaseMedical}
                    variant={healthVariant}
                    disabled={busy}
                    onClick={() => void kgPatchField(st.id, { present: cycleTri(present) })}
                  />
                  <DailyActivitySquare
                    label={noteLabelSq}
                    icon={StickyNote}
                    variant={noteVariant}
                    disabled={busy || absent}
                    onClick={() =>
                      setNoteForStudent({
                        id: st.id,
                        name,
                        draft: rec?.teacher_day_note ?? '',
                      })
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 border-t border-zinc-200/90 pt-6 dark:border-zinc-700">
          <div className="mx-auto w-full max-w-md">
            <button
              type="button"
              disabled={kgBulkBusy || kgLoading}
              onClick={() => setEndDayModalOpen(true)}
              className={veliReportButtonClass}
            >
              <Send className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden />
              {kgBulkBusy ? t('teacherClass.kindergarten.bulkWorking') : t('teacherClass.kindergarten.fabEndDay')}
            </button>
          </div>
        </div>
        </>
      ) : null}

      {endDayModalOpen ? (
        <KidsCenteredModal
          title={t('teacherClass.kindergarten.fabEndDayModalTitle')}
          onClose={() => setEndDayModalOpen(false)}
          maxWidthClass="max-w-md"
          panelClassName="bg-gradient-to-b from-violet-50/90 via-white to-cyan-50/50 dark:from-violet-950/80 dark:via-gray-900 dark:to-cyan-950/40"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <KidsSecondaryButton
                type="button"
                className="rounded-xl border-violet-200 dark:border-violet-800"
                disabled={kgBulkBusy}
                onClick={() => setEndDayModalOpen(false)}
              >
                {t('common.cancel')}
              </KidsSecondaryButton>
              <KidsPrimaryButton
                type="button"
                className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 shadow-md hover:from-violet-500 hover:to-cyan-400"
                disabled={kgBulkBusy || kgLoading}
                onClick={() => confirmEndDayAndSend()}
              >
                {kgBulkBusy ? t('teacherClass.kindergarten.bulkWorking') : t('teacherClass.kindergarten.fabEndDayModalConfirm')}
              </KidsPrimaryButton>
            </div>
          }
        >
          <p className="text-sm font-medium leading-relaxed text-violet-950 dark:text-violet-100/95">
            {t('teacherClass.kindergarten.fabEndDayConfirm')}
          </p>
          <p className="mt-3 text-xs font-semibold text-violet-800/80 dark:text-violet-200/80">
            {t('teacherClass.kindergarten.bulkDigestHint')}
          </p>
        </KidsCenteredModal>
      ) : null}

      {noteForStudent ? (
        <KidsCenteredModal
          title={noteForStudent.name}
          onClose={() => setNoteForStudent(null)}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <KidsSecondaryButton type="button" className="rounded-xl" onClick={() => setNoteForStudent(null)}>
                {t('common.cancel')}
              </KidsSecondaryButton>
              <KidsPrimaryButton type="button" className="rounded-xl bg-violet-600 hover:bg-violet-500" onClick={() => void saveNote()}>
                {t('teacherClass.kindergarten.cardNoteSave')}
              </KidsPrimaryButton>
            </div>
          }
        >
          <textarea
            value={noteForStudent.draft}
            onChange={(e) => setNoteForStudent((p) => (p ? { ...p, draft: e.target.value } : null))}
            rows={5}
            className={kidsTextareaClass}
            placeholder={t('teacherClass.kindergarten.notePlaceholder')}
          />
        </KidsCenteredModal>
      ) : null}

    </div>
  );
}
