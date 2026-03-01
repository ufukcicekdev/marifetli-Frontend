import Link from 'next/link';

export default function QuestionDetailPage({ params }: { params: { id: string } }) {
  const question = {
    id: parseInt(params.id),
    title: "Bebek yeleği örmek için hangi ip kalınlığını kullanmalıyım?",
    content: "İlk kez bebek yeleği öreceğim. Hangi ip kalınlığı ve türü uygun olur? Pamuklu mu yoksa yün karışımlı mı tercih etmeliyim? Deneyimli ablalarımızın önerilerini bekliyorum.",
    author: "Ayşe",
    authorReputation: 2450,
    createdAt: "2 saat önce",
    tags: ["örgü", "bebek", "yelek"],
    views: 124,
    votes: 12,
    answers: [
      {
        id: 1,
        content: "Bebek cildi hassas olduğu için %100 pamuklu veya pamuklu-bambu karışımı iplik kullanmanı öneririm. Numara olarak 3 veya 4 ip kalınlığı bebek yeleği için ideal. Nako bebe veya olga gibi markalar çok güzel.",
        author: "Fatma H.",
        authorReputation: 1890,
        createdAt: "1 saat önce",
        votes: 8,
        isBest: true
      },
      {
        id: 2,
        content: "Ben de pamuklu kullanıyorum, 3.5 numara tığ ile çok güzel duruyor. Yün karışımlı bebekte kaşıntı yapabilir, özellikle yeni doğanlar için pamuk daha iyi.",
        author: "Zeynep K.",
        authorReputation: 3210,
        createdAt: "30 dakika önce",
        votes: 5,
        isBest: false
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-4 sm:p-6 mb-6 overflow-hidden">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="flex flex-col items-center shrink-0 text-gray-500 dark:text-gray-400">
              <span className="font-bold text-lg">{question.votes}</span>
              <span>oy</span>
              <button className="mt-2 text-gray-400 hover:text-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 break-words">{question.title}</h1>
              <div className="prose max-w-none text-gray-700 mb-6">
                <p>{question.content}</p>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {question.tags.map((tag, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center min-w-0">
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-8 h-8" />
                  <div className="ml-2">
                    <Link href={`/profil/${question.author}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                      {question.author}
                    </Link>
                    <p className="text-xs text-gray-500">{question.authorReputation} itibar</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                  <span>{question.views} görüntülenme • {question.createdAt}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-4 sm:p-6 mb-6 overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {question.answers.length} Cevap
          </h2>
          
          <div className="space-y-6">
            {question.answers.map((answer) => (
              <div key={answer.id} className={`p-4 rounded-lg ${answer.isBest ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                {answer.isBest && (
                  <div className="flex items-center mb-2">
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                      ✓ En İyi Cevap
                    </span>
                  </div>
                )}
                
                <div className="flex gap-3 sm:gap-4 min-w-0">
                  <div className="flex flex-col items-center mr-4 text-gray-500">
                    <span className="font-bold text-lg">{answer.votes}</span>
                    <span>oy</span>
                    <button className="mt-2 text-gray-400 hover:text-indigo-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <div className="prose max-w-none text-gray-700 mb-4">
                      <p>{answer.content}</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex items-center">
                        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-8 h-8" />
                        <div className="ml-2">
                          <Link href={`/profil/${answer.author}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                            {answer.author}
                          </Link>
                          <p className="text-xs text-gray-500">{answer.authorReputation} itibar</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {answer.createdAt}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-4 sm:p-6 overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Cevabınızı Yazın</h2>
          <form>
            <div className="mb-4">
              <textarea
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Cevabınızı buraya yazın..."
              ></textarea>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cevabı Gönder
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2026 Marifetli. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}