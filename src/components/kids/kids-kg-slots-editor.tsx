'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { KidsSecondaryButton, kidsInputClass } from '@/src/components/kids/kids-ui';
import type { KidsKindergartenSlotItem } from '@/src/lib/kids-api';

function normalizeSlots(raw: unknown): KidsKindergartenSlotItem[] {
  if (raw == null || !Array.isArray(raw)) return [];
  const out: KidsKindergartenSlotItem[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const label = String(o.label ?? '')
      .trim()
      .slice(0, 80);
    if (!label) continue;
    const okv = o.ok;
    const ok = okv === true || okv === false || okv === null ? okv : null;
    out.push({ label, ok });
  }
  return out.slice(0, 20);
}

function SlotTriToggle({
  value,
  disabled,
  onChange,
  labels,
}: {
  value: boolean | null;
  disabled?: boolean;
  onChange: (v: boolean | null) => void;
  labels: { unset: string; yes: string; no: string };
}) {
  const opts: [boolean | null, string][] = [
    [null, labels.unset],
    [true, labels.yes],
    [false, labels.no],
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {opts.map(([v, lab]) => (
        <button
          key={String(v)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(v)}
          className={`rounded-lg border-2 px-2 py-0.5 text-[10px] font-bold transition disabled:opacity-50 ${
            value === v
              ? 'border-violet-500 bg-violet-100 text-violet-900 dark:border-violet-400 dark:bg-violet-950/50 dark:text-violet-100'
              : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {lab}
        </button>
      ))}
    </div>
  );
}

export function KidsKgSlotsEditor({
  kind,
  initialSlots,
  syncKey,
  disabled,
  onCommit,
  t,
}: {
  kind: 'meal' | 'nap';
  /** Sunucudan gelen dizi; bilinçsizce `?? []` ile sarmalama — her render yeni referans olur. */
  initialSlots: unknown;
  syncKey: string;
  disabled?: boolean;
  onCommit: (slots: KidsKindergartenSlotItem[]) => void;
  t: (key: string) => string;
}) {
  const [items, setItems] = useState<KidsKindergartenSlotItem[]>(() => normalizeSlots(initialSlots));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setItems(normalizeSlots(initialSlots));
  }, [syncKey, initialSlots]);

  const flushTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleCommit = useCallback(
    (next: KidsKindergartenSlotItem[]) => {
      flushTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onCommit(next);
      }, 450);
    },
    [flushTimer, onCommit],
  );

  useEffect(
    () => () => {
      flushTimer();
    },
    [flushTimer],
  );

  const triLabels = {
    unset: t('teacherClass.kindergarten.triUnset'),
    yes: t('teacherClass.kindergarten.triYes'),
    no: t('teacherClass.kindergarten.triNo'),
  };

  const addLine = () => {
    const labelDefault =
      kind === 'meal' ? t('teacherClass.kindergarten.slotNewMeal') : t('teacherClass.kindergarten.slotNewNap');
    const next = [...items, { label: labelDefault, ok: null }];
    setItems(next);
    scheduleCommit(next);
  };

  const removeAt = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    scheduleCommit(next);
  };

  const setLabel = (idx: number, label: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, label: label.slice(0, 80) } : it));
    setItems(next);
    scheduleCommit(next);
  };

  const setOk = (idx: number, ok: boolean | null) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ok } : it));
    setItems(next);
    scheduleCommit(next);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-[10px] font-medium text-emerald-800/80 dark:text-emerald-200/75">
          {t('teacherClass.kindergarten.slotsEmptyHint')}
        </p>
      ) : null}
      {items.map((it, idx) => (
        <div
          key={`${syncKey}-${kind}-${idx}`}
          className="flex flex-col gap-1.5 rounded-lg border border-emerald-200/70 bg-white/70 p-2 dark:border-emerald-800/45 dark:bg-gray-900/35"
        >
          <div className="flex flex-wrap items-center gap-1">
            <input
              type="text"
              value={it.label}
              disabled={disabled}
              onChange={(e) => setLabel(idx, e.target.value)}
              className={`${kidsInputClass} min-h-0 min-w-24 flex-1 py-1.5 text-xs`}
              placeholder={t('teacherClass.kindergarten.slotLabelPh')}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAt(idx)}
              className="shrink-0 rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
            >
              {t('teacherClass.kindergarten.slotRemove')}
            </button>
          </div>
          <SlotTriToggle value={it.ok} disabled={disabled} labels={triLabels} onChange={(v) => setOk(idx, v)} />
        </div>
      ))}
      <KidsSecondaryButton type="button" className="w-full text-xs sm:w-auto" disabled={disabled} onClick={addLine}>
        {kind === 'meal' ? t('teacherClass.kindergarten.addMealSlot') : t('teacherClass.kindergarten.addNapSlot')}
      </KidsSecondaryButton>
    </div>
  );
}
