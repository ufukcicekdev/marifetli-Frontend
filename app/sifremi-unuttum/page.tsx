'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Şifre sıfırlama:', email);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Şifrenizi mi unuttunuz?</h2>
        <p className="text-gray-600 mb-6">
          E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
        </p>

        {submitted ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-md">
            E-posta adresinize şifre sıfırlama bağlantısı gönderildi.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-posta Adresi
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
            >
              Bağlantı Gönder
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/giris" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
