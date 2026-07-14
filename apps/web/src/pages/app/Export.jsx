import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  IconSparkles,
  IconBook2,
  IconBooks,
  IconVolume,
  IconX,
  IconCircleCheck,
  IconChevronRight,
  IconAlertCircle
} from '@tabler/icons-react'
import { chapters } from '../../data/chapters'
import BookOrderWizard from '../../components/BookOrderWizard'
import VoiceSetupModal from '../../components/export/VoiceSetupModal'
import { useAuth } from '../../context/AuthContext'
import { useExport } from '../../hooks/useExport'
import AppShell from '../../components/layout/AppShell'
import { Button, Card, Badge, Skeleton, EmptyState } from '../../components/ui'

export default function Export() {
  const { user, authFetch } = useAuth()
  const [searchParams] = useSearchParams()
  const [stories, setStories] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showBookOrder, setShowBookOrder] = useState(false)
  const [showVoiceSetup, setShowVoiceSetup] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(searchParams.get('success') === 'true')

  const {
    exportStatus,
    audiobookStatus,
    downloading,
    generatingAudiobook,
    uploadingVoice,
    voiceConsent,
    setVoiceConsent,
    error: exportError,
    setError: setExportError,
    voice,
    handleDownloadEpub,
    handleGenerateAudiobook,
    uploadVoiceSample,
    deleteVoiceModel
  } = useExport({ userName: user?.name || 'My', successPath: '/export' })

  useEffect(() => {
    fetchAllStories()
  }, [])

  const fetchAllStories = async () => {
    try {
      const storiesRes = await authFetch('/api/stories/all')
      if (!storiesRes.ok) throw new Error('Failed to load stories')
      const storiesData = await storiesRes.json()
      const organized = {}
      storiesData.forEach(story => {
        if (!organized[story.chapter_id]) organized[story.chapter_id] = {}
        organized[story.chapter_id][story.question_id] = story
      })
      setStories(organized)
    } catch (err) {
      console.error('Error fetching stories:', err)
      setLoadError('Unable to load your stories. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceUpload = async () => {
    const ok = await uploadVoiceSample()
    if (ok) setShowVoiceSetup(false)
  }

  if (loading) {
    return (
      <AppShell back="/home" title="Your book" wide>
        <div className="py-8">
          <Skeleton className="h-10 w-64 mb-3" />
          <Skeleton className="h-5 w-80 mb-10" />
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-72" />
        </div>
      </AppShell>
    )
  }

  if (loadError) {
    return (
      <AppShell back="/home" title="Your book" wide>
        <div className="py-8 page-enter">
          <div className="p-4 bg-error-soft text-error-strong rounded-xl text-sm flex items-center gap-3">
            <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
            {loadError}
          </div>
          <div className="text-center mt-6">
            <Button variant="secondary" to="/">
              Back to Home
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  const hasContent = Object.keys(stories).length > 0

  return (
    <AppShell back="/home" title="Your book" wide>
      <div className="py-8 page-enter">
        {/* Action error banner */}
        {exportError && (
          <div className="mb-4 p-4 bg-error-soft text-error-strong rounded-xl text-sm flex justify-between items-center gap-3">
            <span>{exportError}</span>
            <button
              type="button"
              onClick={() => setExportError(null)}
              aria-label="Dismiss error"
              className="shrink-0 p-1 rounded-full text-error hover:text-error-strong transition-colors"
            >
              <IconX size={20} stroke={1.75} />
            </button>
          </div>
        )}

        {/* Success Message */}
        {paymentSuccess && (
          <div className="mb-6 p-4 bg-success-soft text-success-strong rounded-xl flex items-center gap-3 print:hidden">
            <IconCircleCheck size={24} stroke={1.75} className="shrink-0" />
            <div>
              <p className="font-medium">Payment successful!</p>
              <p className="text-sm">You can now download your eBook anytime.</p>
            </div>
            <button
              type="button"
              onClick={() => setPaymentSuccess(false)}
              aria-label="Dismiss"
              className="ml-auto shrink-0 p-1 rounded-full text-success hover:text-success-strong transition-colors"
            >
              <IconX size={20} stroke={1.75} />
            </button>
          </div>
        )}

        {/* Heading - hidden in print */}
        <header className="mb-10 print:hidden">
          <h1 className="text-3xl sm:text-4xl font-display text-ink">Preview Your Story</h1>
          <p className="text-sepia-600 mt-1">Review and print your autobiography</p>
        </header>

        {/* Style Your Memoir */}
        {hasContent && (
          <div className="mb-10 print:hidden">
            <Card interactive to="/preview-style" className="stagger-item">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-sepia-100 text-sepia-600 rounded-xl flex items-center justify-center shrink-0">
                  <IconSparkles size={24} stroke={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg text-ink">Style Your Memoir</h3>
                  <p className="text-sm text-sepia-600">
                    Transform your writing style - choose from Hemingway, Jane Austen, Maya Angelou
                    &amp; more
                  </p>
                </div>
                <IconChevronRight
                  size={20}
                  stroke={1.75}
                  className="hidden sm:block text-sepia-400 shrink-0"
                />
              </div>
            </Card>
          </div>
        )}

        {/* Export Options Cards */}
        {hasContent && (
          <div className="grid md:grid-cols-3 gap-6 mb-12 print:hidden">
            {/* eBook Card */}
            <Card className="stagger-item flex flex-col">
              <div className="w-11 h-11 bg-sepia-100 text-sepia-600 rounded-xl flex items-center justify-center mb-4">
                <IconBook2 size={24} stroke={1.5} />
              </div>
              <h3 className="font-display text-xl text-ink mb-2">eBook (EPUB)</h3>
              <p className="text-sm text-sepia-600 mb-4">
                Download as an eBook for Kindle, iPad, or any e-reader. Perfect for sharing
                digitally.
              </p>
              <div className="flex items-baseline gap-2 mb-4 mt-auto">
                {exportStatus?.canExport ? (
                  <span className="text-2xl font-medium text-success-strong">Free</span>
                ) : (
                  <>
                    <span className="text-2xl font-medium text-ink">£7.99</span>
                    <span className="text-sm text-sepia-500">one-time</span>
                  </>
                )}
              </div>
              <Button
                variant="secondary"
                size="xl"
                loading={downloading}
                disabled={downloading}
                onClick={handleDownloadEpub}
              >
                {downloading
                  ? 'Downloading...'
                  : exportStatus?.canExport
                    ? 'Download Now'
                    : 'Buy & Download'}
              </Button>
            </Card>

            {/* Printed Book Card — the recommended option */}
            <Card className="stagger-item relative flex flex-col !bg-bronze-50 !border-bronze-200">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <Badge variant="bronze">Most Popular</Badge>
              </span>
              <div className="w-11 h-11 bg-bronze-100 text-bronze-700 rounded-xl flex items-center justify-center mb-4">
                <IconBooks size={24} stroke={1.5} />
              </div>
              <h3 className="font-display text-xl text-ink mb-2">4 Printed Books</h3>
              <p className="text-sm text-sepia-600 mb-4">
                4 beautiful colour royal hardcover books in cloth delivered to your door. Includes
                audiobook and talk over the phone features.
              </p>
              <div className="flex items-baseline gap-2 mb-4 mt-auto">
                <span className="text-2xl font-medium text-ink">£299</span>
                <span className="text-sm text-sepia-500 line-through ml-1">£599</span>
                <span className="text-xs text-bronze-700 font-medium">50% off</span>
              </div>
              <Button size="xl" onClick={() => setShowBookOrder(true)}>
                Order Your Book
              </Button>
            </Card>

            {/* Audiobook Card */}
            <Card className="stagger-item relative flex flex-col">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <Badge variant="info">New</Badge>
              </span>
              <div className="w-11 h-11 bg-sepia-100 text-sepia-600 rounded-xl flex items-center justify-center mb-4">
                <IconVolume size={24} stroke={1.5} />
              </div>
              <h3 className="font-display text-xl text-ink mb-2">Audiobook (MP3)</h3>
              <p className="text-sm text-sepia-600 mb-4">
                Listen to your memoir narrated aloud. Option to use your own voice with AI cloning.
              </p>
              <div className="flex items-baseline gap-2 mb-4 mt-auto">
                {audiobookStatus?.canGenerate ? (
                  <span className="text-2xl font-medium text-success-strong">Free</span>
                ) : (
                  <>
                    <span className="text-2xl font-medium text-ink">£14.99</span>
                    <span className="text-sm text-sepia-500">one-time</span>
                  </>
                )}
              </div>

              {/* Voice status indicator */}
              {audiobookStatus?.hasVoiceModel && (
                <div className="mb-3 px-3 py-2 bg-sepia-50 rounded-xl flex items-center justify-between gap-2">
                  <span className="text-sm text-sepia-700">Your voice is set up</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-error hover:text-error-strong hover:bg-error-soft"
                    onClick={deleteVoiceModel}
                  >
                    Remove
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="xl"
                  disabled={generatingAudiobook}
                  onClick={() => handleGenerateAudiobook(false)}
                >
                  {generatingAudiobook
                    ? 'Generating...'
                    : audiobookStatus?.canGenerate
                      ? 'Generate Audiobook'
                      : 'Buy & Generate'}
                </Button>

                {audiobookStatus?.hasVoiceModel ? (
                  <Button
                    variant="ghost"
                    className="w-full"
                    disabled={generatingAudiobook}
                    onClick={() => handleGenerateAudiobook(true)}
                  >
                    Use My Voice
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowVoiceSetup(true)}
                  >
                    Set Up My Voice
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {!hasContent ? (
          <Card padding="lg">
            <EmptyState
              icon={<IconBook2 size={28} stroke={1.5} />}
              title="No stories written yet"
              action={
                <Button variant="secondary" to="/home">
                  Start writing your story
                </Button>
              }
            />
          </Card>
        ) : (
          /* Book Summary - No content preview to protect from screenshots */
          <Card padding="lg" className="stagger-item">
            <div className="text-center">
              <div className="w-16 h-16 bg-sepia-100 text-sepia-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <IconBook2 size={32} stroke={1.5} />
              </div>
              <h2 className="text-3xl font-display text-ink mb-2">
                {user?.name || 'My'}'s Life Story
              </h2>
              <p className="text-sepia-600 mb-8">Your memoir is ready to export</p>

              {/* Stats */}
              <div className="flex justify-center gap-8 mb-8">
                <div className="text-center">
                  <p className="text-3xl font-display text-ink">{Object.keys(stories).length}</p>
                  <p className="text-sm text-sepia-500">Chapters</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-display text-ink">
                    {Object.values(stories).reduce(
                      (acc, chapter) =>
                        acc + Object.values(chapter).filter(s => s.answer?.trim()).length,
                      0
                    )}
                  </p>
                  <p className="text-sm text-sepia-500">Stories</p>
                </div>
              </div>

              {/* Chapter list - just titles, no content */}
              <div className="max-w-md mx-auto text-left">
                <p className="text-sm text-sepia-600 mb-3 font-medium">Chapters included:</p>
                <ul className="space-y-2 divide-y divide-sepia-100">
                  {chapters.map(chapter => {
                    const chapterStories = stories[chapter.id]
                    const storyCount = chapterStories
                      ? Object.values(chapterStories).filter(s => s.answer?.trim()).length
                      : 0
                    if (storyCount === 0) return null
                    return (
                      <li
                        key={chapter.id}
                        className="flex items-center justify-between text-sm pt-2 first:pt-0"
                      >
                        <span className="text-ink">{chapter.title}</span>
                        <span className="text-sepia-500">
                          {storyCount} {storyCount === 1 ? 'story' : 'stories'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <p className="text-xs text-sepia-500 mt-8">
                Your full story content is securely stored and will be included in your export.
              </p>
            </div>
          </Card>
        )}

        {/* Voice Setup Modal */}
        {showVoiceSetup && (
          <VoiceSetupModal
            voice={voice}
            consent={voiceConsent}
            onConsentChange={setVoiceConsent}
            onUpload={handleVoiceUpload}
            uploading={uploadingVoice}
            onClose={() => setShowVoiceSetup(false)}
          />
        )}

        {/* Book Order Modal */}
        {showBookOrder && (
          <BookOrderWizard
            userName={user?.name || 'My'}
            pageCount={50}
            onClose={() => setShowBookOrder(false)}
          />
        )}
      </div>
    </AppShell>
  )
}
