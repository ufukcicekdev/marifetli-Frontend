import Link from 'next/link';

export default function UsersPage() {
  const users = [
    { id: 1, name: "Ahmet Yılmaz", username: "ahmetyilmaz", reputation: 2450, bio: "Yazılım geliştirici", joinedDate: "Ocak 2026", answeredQuestions: 128, askedQuestions: 42 },
    { id: 2, name: "Ayşe Demir", username: "aysedemir", reputation: 1890, bio: "Frontend uzmanı", joinedDate: "Şubat 2026", answeredQuestions: 95, askedQuestions: 28 },
    { id: 3, name: "Mehmet Kaya", username: "mehmetkaya", reputation: 3210, bio: "Backend geliştirici", joinedDate: "Mart 2026", answeredQuestions: 187, askedQuestions: 63 },
    { id: 4, name: "Fatma Özkan", username: "fatmaozkan", reputation: 1560, bio: "Veri bilimi uzmanı", joinedDate: "Ocak 2026", answeredQuestions: 87, askedQuestions: 31 }
  ];

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Kullanıcılar</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                <div className="ml-4">
                  <h3 className="font-bold text-lg text-gray-900">{user.name}</h3>
                  <p className="text-gray-600">@{user.username}</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">{user.bio}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-blue-50 text-blue-800 px-2 py-1 rounded"><span className="font-semibold">{user.reputation}</span> itibar</div>
                <div className="bg-green-50 text-green-800 px-2 py-1 rounded"><span className="font-semibold">{user.answeredQuestions}</span> cevap</div>
                <div className="bg-purple-50 text-purple-800 px-2 py-1 rounded"><span className="font-semibold">{user.askedQuestions}</span> soru</div>
                <div className="bg-yellow-50 text-yellow-800 px-2 py-1 rounded">{user.joinedDate} katıldı</div>
              </div>
              <div className="mt-4">
                <Link href={`/profil/${user.username}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                  Profili Görüntüle →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <nav className="flex items-center space-x-2">
            <button className="px-3 py-1 rounded-md bg-indigo-600 text-white">1</button>
            <button className="px-3 py-1 rounded-md hover:bg-gray-200">2</button>
            <button className="px-3 py-1 rounded-md hover:bg-gray-200">3</button>
            <span className="px-2">...</span>
            <button className="px-3 py-1 rounded-md hover:bg-gray-200">10</button>
            <button className="px-3 py-1 rounded-md hover:bg-gray-200 ml-2">Sonraki →</button>
          </nav>
        </div>
      </main>
    </div>
  );
}
