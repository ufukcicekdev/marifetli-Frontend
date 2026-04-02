'use client';

import { shift } from '@floating-ui/react';
import {
  forwardRef,
  useMemo,
  useRef,
  type ReactNode,
  type InputHTMLAttributes,
  type MutableRefObject,
  type Ref,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { Calendar } from 'lucide-react';
import { tr } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import './kids-react-datepicker.css';

registerLocale('tr', tr);

/** `kidsInputClass`’tan daha sıkı: tarih satırı diğer alanlardan daha kısa görünsün (sağ boşluk ikon/temizle için ayrı verilir) */
const kidsDateTimeInputClass =
  'w-full rounded-xl border-2 border-violet-200/80 bg-white py-2 pl-3 text-sm leading-tight text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-400/25 dark:border-violet-800/60 dark:bg-gray-800/90 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-violet-400 dark:focus:ring-violet-500/20';

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach((r) => {
      if (r == null) return;
      if (typeof r === 'function') r(node);
      else (r as MutableRefObject<T | null>).current = node;
    });
  };
}

function localStringToDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  if (![y, mo, d, h, mi].every(Number.isFinite)) return null;
  if (mo < 0 || mo > 11 || d < 1 || h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  const dt = new Date(y, mo, d, h, mi);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

function dateToLocalString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

type KidsDatePickerInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Popper konumu: tüm satır yerine gerçek input kutusuna göre hizala */
  popperAnchorRef?: RefObject<HTMLInputElement | null>;
  /** Temizle (×) sağda; ikon ve metin çakışmasın */
  reserveClearSpace?: boolean;
};

const KidsDatePickerInput = forwardRef<HTMLInputElement, KidsDatePickerInputProps>(
  function KidsDatePickerInput(props, ref) {
    const { className, popperAnchorRef, reserveClearSpace, ...rest } = props;
    /* Sağ boşluk + ikon `right`: Tailwind şablon birleşiminde sınıflar bazen üretilmiyor; inline style güvenli. */
    const paddingRight = reserveClearSpace ? '4.25rem' : '2.75rem';
    const iconRight = reserveClearSpace ? '2.25rem' : '0.75rem';
    return (
      <div className="relative w-full min-w-0 overflow-visible">
        <input
          ref={mergeRefs(ref, popperAnchorRef)}
          {...rest}
          readOnly
          style={{ paddingRight }}
          className={`${kidsDateTimeInputClass} min-h-0 cursor-pointer ${className ?? ''}`}
        />
        <Calendar
          className="pointer-events-none absolute top-1/2 z-1 size-4.5 -translate-y-1/2 text-violet-600 opacity-90 dark:text-violet-300"
          style={{ right: iconRight }}
          strokeWidth={2}
          aria-hidden
        />
      </div>
    );
  },
);

type KidsDateTimeFieldProps = {
  id: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * react-datepicker: takvim + saat listesi. Değer `YYYY-MM-DDTHH:mm` (`kidsDatetimeLocalToIso` ile uyumlu).
 */
export function KidsDateTimeField({
  id,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = 'Tarih ve saat seç',
}: KidsDateTimeFieldProps) {
  const selected = useMemo(() => localStringToDate(value), [value]);
  const popperAnchorRef = useRef<HTMLInputElement | null>(null);
  const insideDialog = Boolean(popperAnchorRef.current?.closest('dialog[open]'));
  const popperContainer = useMemo(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    if (insideDialog) return undefined;
    return ({ children }: { children?: ReactNode }): ReactNode => createPortal(children ?? null, document.body);
  }, [insideDialog]);

  return (
    <DatePicker
      id={id}
      selected={selected}
      onChange={(date: Date | null) => {
        if (date == null) {
          onChange('');
          return;
        }
        onChange(dateToLocalString(date));
      }}
      customInput={
        <KidsDatePickerInput popperAnchorRef={popperAnchorRef} reserveClearSpace={!required} />
      }
      disabled={disabled}
      placeholderText={placeholder}
      required={required}
      locale="tr"
      calendarStartDay={1}
      dateFormat="d MMMM yyyy, HH:mm"
      showTimeSelect
      timeIntervals={1}
      timeCaption="Saat"
      shouldCloseOnSelect={false}
      isClearable={!required}
      todayButton="Bugün"
      popperClassName="kids-dp-popper"
      wrapperClassName="kids-dp-wrapper w-full"
      autoComplete="off"
      popperPlacement="bottom-start"
      popperTargetRef={popperAnchorRef}
      showPopperArrow={false}
      popperProps={{ strategy: 'fixed' }}
      popperContainer={popperContainer}
      popperModifiers={[shift({ padding: 12 })]}
    />
  );
}
