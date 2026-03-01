'use client';

export default function BildirimlerPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Bildirimler</h1>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Henüz bildiriminiz yok.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Etkinlikler olduğunda burada görünecek.</p>
        </div>
      </main>
    </div>
  );
}
