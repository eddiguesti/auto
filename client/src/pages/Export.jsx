import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { chapters } from '../data/chapters'
import BookOrder from '../components/BookOrder'

export default function Export() {
  const [stories, setStories] = useState({})
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showBookOrder, setShowBookOrder] = useState(false)
  const [pageCount, setPageCount] = useState(50)

  useEffect(() => {
    fetchAllStories()
  }, [])

  const fetchAllStories = async () => {
    try {
      const [storiesRes, settingsRes] = await Promise.all([
        fetch('/api/stories/all'),
        fetch('/api/stories/settings')
      ])
      const storiesData = await storiesRes.json()
      const settingsData = await settingsRes.json()

      // Organize by chapter and question
      const organized = {}
      storiesData.forEach(story => {
        if (!organized[story.chapter_id]) {
          organized[story.chapter_id] = {}
        }
        organized[story.chapter_id][story.question_id] = story
      })
      setStories(organized)
      setUserName(settingsData.name || 'My')
    } catch (err) {
      console.error('Error fetching stories:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-sepia">Loading your story...</p>
      </div>
    )
  }

  const hasContent = Object.keys(stories).length > 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      {/* Header - hidden in print */}
      <header className="mb-8 print:hidden">
        <Link to="/" className="text-sepia hover:text-ink transition inline-flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Chapters
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-ink">Preview Your Story</h1>
            <p className="text-sepia">Review and print your autobiography</p>
          </div>
          {hasContent && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowBookOrder(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition tap-bounce"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Order Printed Book
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white rounded-lg hover:bg-ink/80 transition tap-bounce"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Save as PDF
              </button>
            </div>
          )}
        </div>
      </header>

      {!hasContent ? (
        <div className="text-center py-16 bg-white rounded-xl">
          <p className="text-sepia text-lg mb-4">No stories written yet</p>
          <Link to="/" className="text-ink underline">
            Start writing your story
          </Link>
        </div>
      ) : (
        /* Story Content */
        <div className="bg-white rounded-xl shadow-sm p-8 print:shadow-none print:p-0">
          {/* Title Page */}
          <div className="text-center mb-16 pb-16 border-b print:border-none print:page-break-after-always">
            <h1 className="text-5xl font-bold text-ink mb-4">
              {userName}'s Life Story
            </h1>
            <p className="text-xl text-sepia">An Autobiography</p>
            <p className="text-sepia/60 mt-8">
              {new Date().toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long'
              })}
            </p>
          </div>

          {/* Chapters */}
          {chapters.map(chapter => {
            const chapterStories = stories[chapter.id]
            if (!chapterStories) return null

            const hasAnswers = Object.values(chapterStories).some(s => s.answer?.trim())
            if (!hasAnswers) return null

            return (
              <div key={chapter.id} className="mb-16 print:page-break-before-always">
                {/* Chapter Title */}
                <div className="text-center mb-8 pb-4 border-b">
                  <span className="text-4xl print:hidden">{chapter.icon}</span>
                  <h2 className="text-3xl font-bold text-ink mt-2">{chapter.title}</h2>
                  <p className="text-sepia">{chapter.subtitle}</p>
                </div>

                {/* Questions and Answers */}
                <div className="space-y-8">
                  {chapter.questions.map(question => {
                    const story = chapterStories[question.id]
                    if (!story?.answer?.trim()) return null

                    return (
                      <div key={question.id} className="prose max-w-none">
                        <h3 className="text-lg font-semibold text-ink mb-2">
                          {question.question}
                        </h3>
                        <div className="text-ink/80 whitespace-pre-wrap leading-relaxed">
                          {story.answer}
                        </div>
                        {story.photos && story.photos.length > 0 && (
                          <div className="flex flex-wrap gap-4 mt-4 print:block">
                            {story.photos.map(photo => (
                              <img
                                key={photo.id}
                                src={`/api/photos/file/${photo.filename}`}
                                alt={photo.caption || ''}
                                className="max-w-xs rounded-lg print:max-w-full print:my-4"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* End Note */}
          <div className="text-center pt-16 border-t print:page-break-before-always">
            <p className="text-sepia italic">
              "Every life is a story worth telling."
            </p>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:page-break-after-always {
            page-break-after: always;
          }
          .print\\:page-break-before-always {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Book Order Modal */}
      {showBookOrder && (
        <BookOrder
          userName={userName}
          pageCount={pageCount}
          onClose={() => setShowBookOrder(false)}
        />
      )}
    </div>
  )
}
