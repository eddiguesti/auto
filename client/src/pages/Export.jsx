import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { chapters } from '../data/chapters'
import BookOrder from '../components/BookOrder'
import { useAuth } from '../context/AuthContext'

export default function Export() {
  const { user, authFetch } = useAuth()
  const [searchParams] = useSearchParams()
  const [stories, setStories] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showBookOrder, setShowBookOrder] = useState(false)
  const [pageCount, setPageCount] = useState(50)
  const [exportStatus, setExportStatus] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(searchParams.get('success') === 'true')

  useEffect(() => {
    fetchAllStories()
    fetchExportStatus()
  }, [])

  useEffect(() => {
    // Refresh export status after successful payment
    if (paymentSuccess) {
      fetchExportStatus()
    }
  }, [paymentSuccess])

  const fetchAllStories = async () => {
    try {
      setError(null)
      const storiesRes = await authFetch('/api/stories/all')
      if (!storiesRes.ok) {
        throw new Error('Failed to load stories')
      }
      const storiesData = await storiesRes.json()

      // Organize by chapter and question
      const organized = {}
      storiesData.forEach(story => {
        if (!organized[story.chapter_id]) {
          organized[story.chapter_id] = {}
        }
        organized[story.chapter_id][story.question_id] = story
      })
      setStories(organized)
    } catch (err) {
      console.error('Error fetching stories:', err)
      setError('Unable to load your stories. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  const fetchExportStatus = async () => {
    try {
      const res = await authFetch('/api/export/status')
      if (res.ok) {
        const data = await res.json()
        setExportStatus(data)
      }
    } catch (err) {
      console.error('Error fetching export status:', err)
    }
  }

  const handleDownloadEpub = async () => {
    if (!exportStatus?.canExport) {
      // Redirect to payment
      handlePayment('export_ebook')
      return
    }

    setDownloading(true)
    try {
      const res = await authFetch('/api/export/epub')
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${user?.name || 'My'}_Life_Story.epub`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download eBook. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handlePayment = async (productId) => {
    try {
      const res = await authFetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          successUrl: `${window.location.origin}/export?success=true`,
          cancelUrl: `${window.location.origin}/export?cancelled=true`
        })
      })

      if (!res.ok) throw new Error('Payment setup failed')

      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      console.error('Payment error:', err)
      setError('Failed to start payment. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-sepia">Loading your story...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-center">
          {error}
        </div>
        <div className="text-center mt-4">
          <Link to="/" className="text-sepia hover:text-ink underline">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const hasContent = Object.keys(stories).length > 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      {/* Success Message */}
      {paymentSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 print:hidden">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-green-900">Payment successful!</p>
            <p className="text-sm text-green-700">You can now download your eBook anytime.</p>
          </div>
          <button
            onClick={() => setPaymentSuccess(false)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Early Adopter Badge */}
      {exportStatus?.isEarlyAdopter && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 print:hidden">
          <span className="text-2xl">🎁</span>
          <div>
            <p className="font-medium text-amber-900">Early Adopter Bonus!</p>
            <p className="text-sm text-amber-700">You're one of our first 100 users - enjoy free eBook exports forever!</p>
          </div>
        </div>
      )}

      {/* Header - hidden in print */}
      <header className="mb-8 print:hidden">
        <Link to="/home" className="text-sepia hover:text-ink transition inline-flex items-center gap-1 mb-4">
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
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadEpub}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 disabled:opacity-50 transition tap-bounce"
              >
                {downloading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {exportStatus?.canExport ? 'Download eBook' : 'Download eBook (£7.99)'}
              </button>
              <button
                onClick={() => setShowBookOrder(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white rounded-lg hover:bg-ink/80 transition tap-bounce"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Order Printed Book
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Export Options Cards */}
      {hasContent && (
        <div className="grid md:grid-cols-2 gap-6 mb-12 print:hidden">
          {/* eBook Card */}
          <div className="bg-white rounded-2xl p-6 border border-sepia/10 shadow-sm">
            <div className="w-12 h-12 bg-sepia/10 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-display text-xl text-ink mb-2">eBook (EPUB)</h3>
            <p className="text-sm text-warmgray mb-4">
              Download as an eBook for Kindle, iPad, or any e-reader. Perfect for sharing digitally.
            </p>
            <div className="flex items-baseline gap-2 mb-4">
              {exportStatus?.canExport ? (
                <span className="text-2xl font-medium text-green-600">Free</span>
              ) : (
                <>
                  <span className="text-2xl font-medium text-ink">£7.99</span>
                  <span className="text-sm text-warmgray">one-time</span>
                </>
              )}
            </div>
            <button
              onClick={handleDownloadEpub}
              disabled={downloading}
              className="w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 disabled:opacity-50 transition font-medium"
            >
              {downloading ? 'Downloading...' : exportStatus?.canExport ? 'Download Now' : 'Buy & Download'}
            </button>
          </div>

          {/* Printed Book Card */}
          <div className="bg-white rounded-2xl p-6 border-2 border-sepia shadow-md relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sepia text-white text-xs px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div className="w-12 h-12 bg-sepia/10 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <h3 className="font-display text-xl text-ink mb-2">Printed Book</h3>
            <p className="text-sm text-warmgray mb-4">
              A beautiful hardcover or paperback book delivered to your door. The perfect gift.
            </p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-medium text-ink">£99</span>
              <span className="text-sm text-warmgray">includes shipping</span>
            </div>
            <button
              onClick={() => setShowBookOrder(true)}
              className="w-full py-3 bg-ink text-white rounded-lg hover:bg-ink/90 transition font-medium"
            >
              Order Your Book
            </button>
          </div>

        </div>
      )}

      {!hasContent ? (
        <div className="text-center py-16 bg-white rounded-xl">
          <p className="text-sepia text-lg mb-4">No stories written yet</p>
          <Link to="/home" className="text-ink underline">
            Start writing your story
          </Link>
        </div>
      ) : (
        /* Book Summary - No content preview to protect from screenshots */
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-sepia/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-3xl font-display text-ink mb-2">{user?.name || 'My'}'s Life Story</h2>
            <p className="text-sepia mb-8">Your memoir is ready to export</p>

            {/* Stats */}
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-3xl font-display text-ink">
                  {Object.keys(stories).length}
                </p>
                <p className="text-sm text-warmgray">Chapters</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-display text-ink">
                  {Object.values(stories).reduce((acc, chapter) =>
                    acc + Object.values(chapter).filter(s => s.answer?.trim()).length, 0
                  )}
                </p>
                <p className="text-sm text-warmgray">Stories</p>
              </div>
            </div>

            {/* Chapter list - just titles, no content */}
            <div className="max-w-md mx-auto text-left">
              <p className="text-sm text-warmgray mb-3 font-medium">Chapters included:</p>
              <ul className="space-y-2">
                {chapters.map(chapter => {
                  const chapterStories = stories[chapter.id]
                  const storyCount = chapterStories
                    ? Object.values(chapterStories).filter(s => s.answer?.trim()).length
                    : 0
                  if (storyCount === 0) return null
                  return (
                    <li key={chapter.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink">{chapter.title}</span>
                      <span className="text-warmgray">{storyCount} {storyCount === 1 ? 'story' : 'stories'}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <p className="text-xs text-warmgray/60 mt-8">
              Your full story content is securely stored and will be included in your export.
            </p>
          </div>
        </div>
      )}

      {/* Book Order Modal */}
      {showBookOrder && (
        <BookOrder
          userName={user?.name || 'My'}
          pageCount={pageCount}
          onClose={() => setShowBookOrder(false)}
        />
      )}
    </div>
  )
}
