'use client';

import { useCallback, useMemo, useState } from 'react';
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
};

function StatusIconButton({
  label,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-base transition active:scale-95 disabled:opacity-50 sm:h-11 sm:w-11 sm:rounded-2xl sm:text-lg ${className}`}
    >
      {children}
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
}: KidsPreschoolDailyBoardProps) {
  const [noteForStudent, setNoteForStudent] = useState<{
    id: number;
    name: string;
    draft: string;
  } | null>(null);
  const [endDayModalOpen, setEndDayModalOpen] = useState(false);

  const mealLabel = useMemo(() => t('teacherClass.kindergarten.cardSlotMeal'), [t]);
  const napLabel = useMemo(() => t('teacherClass.kindergarten.cardSlotNap'), [t]);

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

  return (
    <div className="relative pb-28 sm:pb-32">
      <div className="rounded-3xl bg-gradient-to-br from-teal-50/90 via-sky-50/80 to-amber-50/70 p-4 shadow-inner dark:from-teal-950/40 dark:via-sky-950/30 dark:to-amber-950/25 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-logo text-xl font-bold tracking-tight text-teal-950 dark:text-teal-50 sm:text-2xl">
              {t('teacherClass.kindergarten.title')}
            </h2>
            <p className="mt-1 max-w-xl text-sm font-medium leading-snug text-teal-900/80 dark:text-teal-100/80">
              {t('teacherClass.kindergarten.subtitleV2')}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-xs font-bold text-teal-800 dark:text-teal-200">
              <span className="mb-0.5">{t('teacherClass.kindergarten.date')}</span>
              <input
                type="date"
                value={kgDate}
                onChange={(e) => setKgDate(e.target.value)}
                className={`${kidsInputClass} min-h-10 rounded-xl border-teal-200/80 bg-white/90 text-sm dark:border-teal-800/60 dark:bg-gray-900/80`}
              />
            </label>
            <KidsSecondaryButton
              type="button"
              disabled={kgLoading}
              className="min-h-10 rounded-xl border-teal-300 bg-white/90 text-teal-900 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-100"
              onClick={() => onRefresh()}
            >
              {kgLoading ? t('common.loading') : t('teacherClass.kindergarten.refresh')}
            </KidsSecondaryButton>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-teal-800/90 dark:text-teal-200/85">{t('teacherClass.kindergarten.boardHintV2')}</p>
      </div>

      <details className="mt-5 overflow-hidden rounded-2xl border border-sky-200/70 bg-sky-50/40 dark:border-sky-900/50 dark:bg-sky-950/20">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-sky-900 dark:text-sky-100 [&::-webkit-details-marker]:hidden">
          <span className="mr-2">📋</span>
          {t('teacherClass.kindergarten.planSummaryToggle')}
        </summary>
        <div className="border-t border-sky-200/60 px-4 pb-4 pt-3 dark:border-sky-900/40">
          <textarea
            value={kgPlanDraft}
            onChange={(e) => setKgPlanDraft(e.target.value)}
            rows={3}
            className={`${kidsTextareaClass} rounded-xl border-sky-200/80 bg-white/90 text-sm dark:border-sky-800/60`}
            placeholder={t('teacherClass.kindergarten.planPlaceholder')}
          />
          <KidsPrimaryButton
            type="button"
            disabled={kgSavingPlan}
            className="mt-2 rounded-xl bg-sky-500 hover:bg-sky-600"
            onClick={() => onSavePlan()}
          >
            {kgSavingPlan ? t('profile.saving') : t('teacherClass.kindergarten.savePlan')}
          </KidsPrimaryButton>
        </div>
      </details>

      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-teal-200/60 bg-white/60 p-3 dark:border-teal-900/40 dark:bg-gray-900/40">
        <span className="w-full text-xs font-bold text-teal-900 dark:text-teal-100 sm:w-auto">{t('teacherClass.kindergarten.chipsTarget')}</span>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setKgBulkTarget('all_enrolled')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              kgBulkTarget === 'all_enrolled'
                ? 'bg-teal-500 text-white shadow'
                : 'bg-white text-teal-800 ring-1 ring-teal-200 dark:bg-gray-800 dark:text-teal-200 dark:ring-teal-800'
            }`}
          >
            {t('teacherClass.kindergarten.chipsTargetAll')}
          </button>
          <button
            type="button"
            onClick={() => setKgBulkTarget('present_only')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              kgBulkTarget === 'present_only'
                ? 'bg-teal-500 text-white shadow'
                : 'bg-white text-teal-800 ring-1 ring-teal-200 dark:bg-gray-800 dark:text-teal-200 dark:ring-teal-800'
            }`}
          >
            {t('teacherClass.kindergarten.chipsTargetPresent')}
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      <details className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/15">
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

      {kgLoading && !kgBoard ? (
        <p className="mt-8 text-center text-sm font-semibold text-teal-800 dark:text-teal-200">{t('common.loading')}</p>
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
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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

            const presentCls =
              present === true
                ? 'border-emerald-400 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-50'
                : present === false
                  ? 'border-rose-400 bg-rose-100 text-rose-900 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-50'
                  : 'border-slate-200 bg-white text-slate-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300';

            const mealCls =
              meal === true
                ? 'border-lime-400 bg-lime-100 text-lime-900 dark:border-lime-500 dark:bg-lime-950/50 dark:text-lime-50'
                : meal === false
                  ? 'border-rose-400 bg-rose-100 text-rose-900 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-50'
                  : 'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-50';

            const napCls =
              nap === true
                ? 'border-sky-400 bg-sky-100 text-sky-900 dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-50'
                : nap === false
                  ? 'border-orange-400 bg-orange-100 text-orange-950 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-50'
                  : 'border-slate-200 bg-white text-slate-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300';

            return (
              <li
                key={st.id}
                className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-teal-100/90 bg-white/95 shadow-sm transition dark:border-teal-900/50 dark:bg-gray-900/70 ${
                  absent ? 'opacity-50' : ''
                }`}
              >
                <div className="flex flex-col items-center gap-2 px-3 pb-2 pt-3 text-center">
                  <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-100 to-sky-100 ring-2 ring-white dark:from-teal-900/50 dark:to-sky-900/50 dark:ring-gray-800 sm:h-16 sm:w-16">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xl font-black text-teal-700 dark:text-teal-200">
                        {(st.first_name?.[0] || '?').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 min-h-10 w-full text-xs font-bold leading-tight text-slate-900 dark:text-white">{name}</p>
                  {rec?.digest_sent_at ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ {t('teacherClass.kindergarten.cardDigestSent')}</span>
                  ) : null}
                </div>
                <div className="mt-auto grid w-full grid-cols-2 gap-x-2 gap-y-2.5 border-t border-teal-100/90 bg-gradient-to-b from-teal-50/60 to-sky-50/40 px-2 py-3 dark:border-teal-900/50 dark:from-teal-950/40 dark:to-sky-950/25 md:grid-cols-4 md:gap-2">
                  <StatusIconButton
                    label={t('teacherClass.kindergarten.cardPresentHint')}
                    disabled={busy}
                    onClick={() => void kgPatchField(st.id, { present: cycleTri(present) })}
                    className={`justify-self-center ${presentCls}`}
                  >
                    {present === true ? '✓' : present === false ? '✗' : '○'}
                  </StatusIconButton>
                  <StatusIconButton
                    label={t('teacherClass.kindergarten.cardMealHint')}
                    disabled={busy}
                    onClick={() =>
                      void kgPatchField(st.id, {
                        meal_slots: nextMealSlots(rec, mealLabel, cycleTri(meal)),
                      })
                    }
                    className={`justify-self-center ${mealCls}`}
                  >
                    🍽
                  </StatusIconButton>
                  <StatusIconButton
                    label={t('teacherClass.kindergarten.cardNapHint')}
                    disabled={busy}
                    onClick={() =>
                      void kgPatchField(st.id, {
                        nap_slots: nextNapSlots(rec, napLabel, cycleTri(nap)),
                      })
                    }
                    className={`justify-self-center ${napCls}`}
                  >
                    😴
                  </StatusIconButton>
                  <button
                    type="button"
                    title={t('teacherClass.kindergarten.cardNoteOpen')}
                    aria-label={t('teacherClass.kindergarten.cardNoteOpen')}
                    disabled={busy}
                    onClick={() =>
                      setNoteForStudent({
                        id: st.id,
                        name,
                        draft: rec?.teacher_day_note ?? '',
                      })
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center justify-self-center rounded-xl border-2 border-amber-200 bg-amber-50 text-base text-amber-900 transition active:scale-95 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 sm:h-11 sm:w-11 sm:rounded-2xl sm:text-lg"
                  >
                    📝
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {endDayModalOpen ? (
        <KidsCenteredModal
          title={t('teacherClass.kindergarten.fabEndDayModalTitle')}
          onClose={() => setEndDayModalOpen(false)}
          maxWidthClass="max-w-md"
          panelClassName="bg-gradient-to-b from-teal-50/90 via-white to-sky-50/50 dark:from-teal-950/80 dark:via-gray-900 dark:to-sky-950/40"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <KidsSecondaryButton
                type="button"
                className="rounded-xl border-teal-200 dark:border-teal-800"
                disabled={kgBulkBusy}
                onClick={() => setEndDayModalOpen(false)}
              >
                {t('common.cancel')}
              </KidsSecondaryButton>
              <KidsPrimaryButton
                type="button"
                className="rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 shadow-md hover:from-teal-600 hover:to-sky-600"
                disabled={kgBulkBusy || kgLoading}
                onClick={() => confirmEndDayAndSend()}
              >
                {kgBulkBusy ? t('teacherClass.kindergarten.bulkWorking') : t('teacherClass.kindergarten.fabEndDayModalConfirm')}
              </KidsPrimaryButton>
            </div>
          }
        >
          <p className="text-sm font-medium leading-relaxed text-teal-950 dark:text-teal-100/95">
            {t('teacherClass.kindergarten.fabEndDayConfirm')}
          </p>
          <p className="mt-3 text-xs font-semibold text-teal-800/80 dark:text-teal-200/80">
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
              <KidsPrimaryButton type="button" className="rounded-xl bg-teal-600 hover:bg-teal-500" onClick={() => void saveNote()}>
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

      {kgBoard && kgBoard.rows.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <div className="pointer-events-auto w-full max-w-md">
            <button
              type="button"
              disabled={kgBulkBusy || kgLoading}
              onClick={() => setEndDayModalOpen(true)}
              className="w-full rounded-2xl border-2 border-teal-300 bg-gradient-to-r from-teal-400 via-sky-400 to-cyan-400 py-3.5 text-sm font-black text-white shadow-lg shadow-teal-500/30 transition active:scale-[0.99] disabled:opacity-50 dark:border-teal-700 dark:from-teal-700 dark:via-sky-700 dark:to-cyan-700 dark:shadow-black/40"
            >
              {kgBulkBusy ? t('teacherClass.kindergarten.bulkWorking') : t('teacherClass.kindergarten.fabEndDay')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
