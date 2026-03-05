'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/src/lib/api';

const SOCIAL_ICONS: Record<string, { icon: string; label: string }> = {
  facebook: { icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z', label: 'Facebook' },
  twitter: { icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z', label: 'X' },
  instagram: { icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z', label: 'Instagram' },
  youtube: { icon: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z', label: 'YouTube' },
  linkedin: { icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z', label: 'LinkedIn' },
  tiktok: { icon: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 2.16-.04 4.32-.05 6.48-.18 1.16-.64 2.32-1.32 3.27-.7.98-1.71 1.81-2.74 2.23-1.37.56-2.97.76-4.5.67-.17-.01-.33-.07-.49-.12-.01-.02-.02-.04-.03-.05v-4.03c.02.01.04.02.05.03.09.06.18.12.27.17 1.21.8 2.76 1.02 4.18.62 1.12-.31 2.15-.96 2.9-1.87.75-.9 1.23-2.06 1.32-3.26.1-1.2-.15-2.41-.68-3.41-.52-1-1.36-1.85-2.32-2.32-1.14-.55-2.45-.82-3.76-.77-.18 0-.36.02-.54.04-.01 0-.02.01-.03.01v-4.07z', label: 'TikTok' },
  other: { icon: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1 17v-4H8v-2h3V9h2v2h3v2h-3v4h-2zm1-9a1 1 0 11-2 1 1 0 012 0z', label: 'Link' },
};

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data } = await api.getSiteSettings();
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: { name: string; email: string; subject: string; message: string }) =>
      api.submitContactForm(data),
    onSuccess: (_, variables) => {
      toast.success('Mesajınız alındı, en kısa sürede size dönüş yapacağız.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const msg = err?.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Gönderilemedi. Lütfen tekrar deneyin.');
    },
  });

  const contact = settings?.contact;
  const socialLinks = settings?.social_links ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-indigo-50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950">
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 dark:text-indigo-400">
              Bizimle iletişime geçin
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-50">
              Marifetli ekibi bir mesaj uzağınızda
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300 max-w-2xl">
              Destek, iş birliği, öneri veya geri bildirimleriniz için formu doldurabilir ya da
              doğrudan iletişim bilgilerimizi kullanabilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center rounded-full bg-white/80 dark:bg-gray-900/60 px-3 py-1 shadow-sm ring-1 ring-gray-200/70 dark:ring-gray-700/80">
              <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Genellikle 24 saat içinde dönüş
            </span>
          </div>
        </div>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/80 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Bize Ulaşın</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                {contact?.description || 'Marifetli platformu ile ilgili sorularınız, önerileriniz veya destek talepleriniz için bizimle iletişime geçebilirsiniz.'}
              </p>
              <div className="space-y-4">
                {contact?.email && (
                  <div className="flex items-start">
                    <div className="shrink-0 bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">E-posta</h3>
                      <a href={`mailto:${contact.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{contact.email}</a>
                    </div>
                  </div>
                )}
                {contact?.phone && (
                  <div className="flex items-start">
                    <div className="shrink-0 bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Telefon</h3>
                      <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="text-gray-600 dark:text-gray-400">{contact.phone}</a>
                    </div>
                  </div>
                )}
                {contact?.address && (
                  <div className="flex items-start">
                    <div className="shrink-0 bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243C4.678 15.009 4 13.368 4 11.669V7a1 1 0 011-1h5a1 1 0 011 1v4a1 1 0 001 1h4a1 1 0 001-1V6.414a1 1 0 011.707-.707L19 8.586V12a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Adres</h3>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{contact.address}</p>
                    </div>
                  </div>
                )}
                {socialLinks.length > 0 && (
                  <div className="pt-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Sosyal medya</h3>
                    <div className="flex flex-wrap gap-3">
                      {socialLinks.map((link) => {
                        const info = SOCIAL_ICONS[link.platform] || SOCIAL_ICONS.other;
                        return (
                          <a
                            key={`${link.platform}-${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title={link.label || info.label}
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d={info.icon} />
                            </svg>
                            <span className="text-sm font-medium">{link.label || info.label}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
                {!contact?.email && !contact?.phone && !contact?.address && socialLinks.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400">İletişim bilgileri admin panelden eklenebilir.</p>
                )}
              </div>
            </div>
            <div className="bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/80 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Mesaj Gönderin</h2>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adınız</label>
                  <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Adınızı girin" required />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-posta</label>
                  <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="eposta@ornek.com" required />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konu</label>
                  <input type="text" id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Mesajınızın konusunu girin" required />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mesaj</label>
                  <textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Mesajınızı buraya yazın..." required />
                </div>
                <button type="submit" disabled={submitMutation.isPending} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitMutation.isPending ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
