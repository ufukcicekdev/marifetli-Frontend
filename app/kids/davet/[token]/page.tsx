'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowRight, Plus, Smile, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { kidsApiUrl } from '@/src/lib/kids-config';
import {
  fetchKidsInvitePreview,
  type KidsInvitePreview,
} from '@/src/lib/kids-invite-public';
import { applyKidsSessionFromAuthResponse } from '@/src/lib/kids-session-storage';
import { marifetliKidsLegalPathOnKidsPortal } from '@/src/lib/marifetli-kids-legal-paths';
import { reconcileAuthStoreWithAccessToken } from '@/src/stores/auth-store';
import { trPhoneDigitsFromInput, trPhoneInputChange } from '@/src/lib/tr-phone-input';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

function needsParentEmailInForm(p: KidsInvitePreview): boolean {
  return Boolean(p.requires_parent_email ?? p.requires_student_email);
}

const pillParent =
  'w-full rounded-full bg-slate-100 px-4 py-3.5 text-sm text-slate-900 shadow-none placeholder:text-slate-400 outline-none ring-1 ring-slate-300/90 transition-[background-color,box-shadow] focus:bg-white focus:ring-2 focus:ring-violet-500 focus:ring-offset-0 dark:bg-slate-800 dark:text-white dark:ring-slate-600 dark:placeholder:text-slate-500 dark:focus:bg-slate-900 dark:focus:ring-violet-400';

const pillChild =
  'w-full rounded-full bg-slate-50 px-4 py-3.5 text-sm text-slate-900 shadow-none placeholder:text-slate-400 outline-none ring-1 ring-slate-300/90 transition-[background-color,box-shadow] focus:bg-white focus:ring-2 focus:ring-violet-500 focus:ring-offset-0 dark:bg-slate-950 dark:text-white dark:ring-slate-600 dark:placeholder:text-slate-500 dark:focus:ring-violet-400';

function fieldLabel(className?: string) {
  return `mb-1.5 block text-sm font-bold text-slate-800 dark:text-slate-100 ${className ?? ''}`;
}

type ChildFormRow = {
  id: string;
  first_name: string;
  last_name: string;
  password: string;
};

function createChildRow(): ChildFormRow {
  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `child-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    first_name: '',
    last_name: '',
    password: '',
  };
}

export default function KidsInviteAcceptPage() {
  const params = useParams();
  const pathname = usePathname();
  const token = typeof params.token === 'string' ? params.token : '';
  const { t, language } = useKidsI18n();

  const [preview, setPreview] = useState<KidsInvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [parentEmail, setParentEmail] = useState('');
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [children, setChildren] = useState<ChildFormRow[]>(() => [createChildRow()]);
  const [loading, setLoading] = useState(false);

  const parentEmailId = useId();

  const pathPrefix = pathname.startsWith('/kids') ? '/kids' : '';
  const panelHref = `${pathPrefix}/veli/panel`;
  const termsHref = marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'terms');
  const privacyHref = marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'privacy');

  useEffect(() => {
    if (!token) {
      setPreviewError(t('invite.invalidLink'));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchKidsInvitePreview(token);
        if (!cancelled) {
          setPreview(p);
          setPreviewError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setPreviewError(e instanceof Error ? e.message : t('invite.notFound'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error(t('invite.invalid'));
      return;
    }
    if (!preview) return;
    const askEmail = needsParentEmailInForm(preview);
    if (askEmail && !parentEmail.trim()) {
      toast.error(t('invite.enterParentEmail'));
      return;
    }
    setLoading(true);
    try {
      const normalizedChildren = children
        .map((c) => ({
          first_name: c.first_name.trim(),
          last_name: c.last_name.trim(),
          password: c.password,
        }))
        .filter((c) => c.first_name && c.last_name && c.password);
      if (normalizedChildren.length === 0) {
        toast.error(t('invite.enterAtLeastOneChild'));
        return;
      }
      const body: Record<string, unknown> = {
        token,
        parent_first_name: parentFirstName.trim(),
        parent_last_name: parentLastName.trim(),
        parent_phone: trPhoneDigitsFromInput(parentPhone),
        parent_password: parentPassword,
        children: normalizedChildren.map((c) => ({
          first_name: c.first_name,
          last_name: c.last_name,
          password: c.password,
        })),
      };
      if (askEmail) {
        body.email = parentEmail.trim().toLowerCase();
      }
      const res = await fetch(kidsApiUrl('/auth/accept-invite/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { detail?: string }).detail || t('invite.registerFailed'));
        return;
      }
      const createdChildren = (data as { created_children?: Array<{ student_login_name?: string }> })
        .created_children;
      const firstLogin =
        createdChildren?.[0]?.student_login_name ||
        (data as { student_login_name?: string }).student_login_name;
      const tokenKind = (data as { token_kind?: string }).token_kind;
      applyKidsSessionFromAuthResponse({
        access: (data as { access?: string }).access,
        refresh: (data as { refresh?: string }).refresh,
        token_kind: tokenKind,
      });
      if (tokenKind === 'main_site') {
        await reconcileAuthStoreWithAccessToken();
      }
      if (firstLogin) {
        const count = Array.isArray(createdChildren) ? createdChildren.length : 1;
        toast.success(
          `${t('invite.welcome')} ${count} ${t('invite.childAdded')}. ${t('invite.firstLogin')}: ${firstLogin}`,
          { duration: 8000 },
        );
      } else {
        toast.success(t('invite.welcome'));
      }
      window.location.assign(panelHref);
    } catch {
      toast.error(t('invite.connectionError'));
    } finally {
      setLoading(false);
    }
  }

  const cardShell = 'mx-auto w-full max-w-xl rounded-[2.5rem] bg-white p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] sm:p-10 dark:bg-slate-900 dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] dark:ring-1 dark:ring-slate-700';

  if (previewError && !preview) {
    return (
      <div className={cardShell}>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('invite.unavailable')}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{previewError}</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className={`${cardShell} text-center text-slate-500 dark:text-slate-400`}>
        {t('common.loading')}
      </div>
    );
  }

  const exp = new Date(preview.expires_at);
  const askEmail = needsParentEmailInForm(preview);
  const classLine = t('invite.classSummaryLine')
    .replace('{teacher}', preview.teacher_display)
    .replace('{className}', preview.class_name);

  return (
    <div className={cardShell}>
      <header className="text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {t('invite.registrationTitle')}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('invite.registrationSubtitle')}</p>
        <p className="mt-3 text-sm font-semibold text-violet-700 dark:text-violet-300">{classLine}</p>
        {preview.school_name ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{preview.school_name}</p>
        ) : null}
        {preview.class_description ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {preview.class_description}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {t('invite.validUntil')} <span className="font-semibold text-slate-600 dark:text-slate-300">{exp.toLocaleDateString(language)}</span>
        </p>
      </header>

      <form className="mt-8 space-y-8" onSubmit={onSubmit}>
        <section>
          <div className="mb-4 flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
              aria-hidden
            >
              <User className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('invite.parentSectionTitle')}</h2>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabel()} htmlFor="pfn">
                  {t('invite.labelFirstName')} <span className="font-bold text-rose-500">*</span>
                </label>
                <input
                  id="pfn"
                  required
                  autoComplete="given-name"
                  value={parentFirstName}
                  onChange={(e) => setParentFirstName(e.target.value)}
                  placeholder={t('invite.placeholderParentFirstName')}
                  className={pillParent}
                />
              </div>
              <div>
                <label className={fieldLabel()} htmlFor="pln">
                  {t('invite.labelLastName')} <span className="font-bold text-rose-500">*</span>
                </label>
                <input
                  id="pln"
                  required
                  autoComplete="family-name"
                  value={parentLastName}
                  onChange={(e) => setParentLastName(e.target.value)}
                  placeholder={t('invite.placeholderParentLastName')}
                  className={pillParent}
                />
              </div>
            </div>

            {askEmail ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label className={fieldLabel()} htmlFor={parentEmailId}>
                    {t('invite.labelEmail')} <span className="font-bold text-rose-500">*</span>
                  </label>
                  <input
                    id={parentEmailId}
                    type="email"
                    required
                    autoComplete="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder={t('invite.placeholderEmail')}
                    className={pillParent}
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t('invite.parentEmailHint')}</p>
                </div>
                <div className="sm:col-span-1">
                  <label className={fieldLabel()} htmlFor="pph">
                    {t('invite.labelPhone')}
                  </label>
                  <input
                    id="pph"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={14}
                    value={parentPhone}
                    onChange={(e) => setParentPhone(trPhoneInputChange(e.target.value))}
                    placeholder={t('invite.placeholderPhone')}
                    className={`${pillParent} font-mono tabular-nums`}
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t('invite.phoneHint')}</p>
                </div>
              </div>
            ) : (
              <>
                <p className="rounded-full bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                  {t('invite.emailLockedHint')}
                </p>
                <div>
                  <label className={fieldLabel()} htmlFor="pph">
                    {t('invite.labelPhone')}
                  </label>
                  <input
                    id="pph"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={14}
                    value={parentPhone}
                    onChange={(e) => setParentPhone(trPhoneInputChange(e.target.value))}
                    placeholder={t('invite.placeholderPhone')}
                    className={`${pillParent} font-mono tabular-nums`}
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t('invite.phoneHint')}</p>
                </div>
              </>
            )}

            <div>
              <label className={fieldLabel()} htmlFor="ppw">
                {t('invite.createPasswordLabel')} <span className="font-bold text-rose-500">*</span>
              </label>
              <input
                id="ppw"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
                value={parentPassword}
                onChange={(e) => setParentPassword(e.target.value)}
                placeholder="········"
                className={pillParent}
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t('invite.min8')}</p>
            </div>
          </div>
        </section>

        <div className="border-t border-slate-200 dark:border-slate-700" />

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
                aria-hidden
              >
                <Smile className="h-5 w-5" strokeWidth={2} />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('invite.childSectionTitle')}</h2>
            </div>
            <button
              type="button"
              onClick={() =>
                setChildren((prev) => (prev.length >= 10 ? prev : [...prev, createChildRow()]))
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-200/80 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-900/50"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {t('invite.addAnotherChild')}
            </button>
          </div>

          <div className="rounded-3xl bg-slate-100 p-4 sm:p-5 dark:bg-slate-800/80">
            <div className="flex flex-col gap-4">
              {children.map((child, idx) => (
                <div
                  key={child.id}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/90 dark:bg-slate-900 dark:ring-slate-600"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {t('invite.child')} {idx + 1}
                    </p>
                    {children.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setChildren((prev) => prev.filter((c) => c.id !== child.id))}
                        className="shrink-0 text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
                      >
                        {t('invite.removeChild')}
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={fieldLabel()}>
                        {t('invite.childName')} <span className="font-bold text-rose-500">*</span>
                      </label>
                      <input
                        required
                        autoComplete="off"
                        value={child.first_name}
                        onChange={(e) =>
                          setChildren((prev) =>
                            prev.map((c) =>
                              c.id === child.id ? { ...c, first_name: e.target.value } : c,
                            ),
                          )
                        }
                        placeholder={t('invite.placeholderChildFirstName')}
                        className={pillChild}
                      />
                    </div>
                    <div>
                      <label className={fieldLabel()}>
                        {t('invite.childLastName')} <span className="font-bold text-rose-500">*</span>
                      </label>
                      <input
                        required
                        autoComplete="off"
                        value={child.last_name}
                        onChange={(e) =>
                          setChildren((prev) =>
                            prev.map((c) =>
                              c.id === child.id ? { ...c, last_name: e.target.value } : c,
                            ),
                          )
                        }
                        placeholder={t('invite.placeholderChildLastName')}
                        className={pillChild}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className={fieldLabel()}>
                      {t('invite.childLoginPasswordLabel')} <span className="font-bold text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      required
                      value={child.password}
                      onChange={(e) =>
                        setChildren((prev) =>
                          prev.map((c) =>
                            c.id === child.id ? { ...c, password: e.target.value } : c,
                          ),
                        )
                      }
                      placeholder={t('invite.placeholderChildPassword')}
                      className={pillChild}
                    />
                    <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
                      {t('invite.childPasswordHelper')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('invite.multipleChildrenHint')}</p>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-violet-600 via-violet-500 to-purple-400 py-4 text-sm font-semibold text-white shadow-[0_12px_28px_-8px_rgba(109,40,217,0.55)] transition-[filter,opacity] hover:brightness-105 disabled:opacity-60 dark:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.45)]"
        >
          {loading ? (
            t('profile.saving')
          ) : (
            <>
              {t('invite.submitCta')}
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
            </>
          )}
        </button>

        <p className="text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {t('invite.termsBeforeLinks')}
          <Link href={termsHref} className="font-medium text-violet-600 underline-offset-2 hover:underline dark:text-violet-400">
            {t('sidebar.legal.terms')}
          </Link>
          {t('invite.termsBetweenLinks')}
          <Link href={privacyHref} className="font-medium text-violet-600 underline-offset-2 hover:underline dark:text-violet-400">
            {t('sidebar.legal.privacy')}
          </Link>
          {t('invite.termsAfterLinks')}
        </p>
      </form>
    </div>
  );
}
