import Link from 'next/link';

const slugLabels: Record<string, string> = {
  populer: "Popüler",
  tum: "Tümü",
  orgu: "Örgü",
  dikis: "Dikiş",
  nakis: "Nakış",
  "taki-tasarim": "Takı Tasarımı",
  "el-sanatlari": "El Sanatları",
  dekorasyon: "Dekorasyon",
  "tig-isi": "Tığ İşi",
  amigurumi: "Amigurumi",
  dantel: "Dantel",
  makrome: "Makrome",
  kece: "Keçe",
};

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const label = slugLabels[slug] || slug;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {label} - Sorular
          </h1>
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <p className="text-gray-600">
              Bu kategorideki sorular burada listelenecek.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
