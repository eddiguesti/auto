import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { useAuth } from '../context/AuthContext'
import ExportModal from '../components/ExportModal'
import ProgressCard from '../components/ProgressCard'
import BookPreview from '../components/BookPreview'
import CompletionCertificate from '../components/CompletionCertificate'
import TelegramLinkModal from '../components/TelegramLinkModal'
import OnboardingModal from '../components/OnboardingModal'
import ImageUnlockAnimation from '../components/ImageUnlockAnimation'
import TourOverlay from '../components/TourOverlay'

// Memoized chapter card to prevent re-renders when other chapters update
const ChapterCard = memo(function ChapterCard({
  chapter,
  chapterProgress,
  chapterImage,
  isImageRevealed,
  isAnimatingThis,
  onImageClick
}) {
  const isComplete = chapterProgress === 100
  const hasStarted = chapterProgress > 0
  const isImageGenerating = chapterImage?.status === 'generating'
  const rawImageUrl = chapterImage?.imageUrl?.replace(/^"|"$/g, '')
  const showImage =
    rawImageUrl && (isImageRevealed || (chapterImage?.status === 'completed' && !isAnimatingThis))
  const imageUrl = showImage ? rawImageUrl : null

  return (
    <div
      className={`relative overflow-hidden rounded-xl border transition-all hover:shadow-lg hover:-translate-y-1 stagger-item group ${
        isComplete ? 'border-green-300' : hasStarted ? 'border-sepia/30' : 'border-sepia/20'
      }`}
    >
      {/* Image Section */}
      <div className="relative h-40 sm:h-48 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={chapter.title}
            loading="lazy"
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              onImageClick(imageUrl, chapter.title)
            }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex flex-col items-center justify-center">
            <span className="text-4xl mb-2 grayscale opacity-50">{chapter.icon}</span>
            {!isComplete && !isImageGenerating && (
              <span className="text-stone-400 text-xs text-center px-4">
                Complete this chapter to unlock your personalized artwork
              </span>
            )}
          </div>
        )}

        {/* Shimmer for generating images */}
        {isImageGenerating && (
          <div className="absolute inset-0 bg-gradient-to-r from-sepia/10 via-sepia/30 to-sepia/10 animate-pulse flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-sepia/30 border-t-sepia rounded-full animate-spin mb-2" />
            <span className="text-sepia/60 text-sm">Creating your artwork...</span>
          </div>
        )}

        {/* Progress badge */}
        <div
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium ${
            isComplete
              ? 'bg-green-500 text-white'
              : hasStarted
                ? 'bg-white/90 text-sepia'
                : 'bg-white/80 text-sepia/60'
          }`}
        >
          {isComplete ? '✓ Complete' : `${chapterProgress}%`}
        </div>

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Chapter title overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-display text-lg leading-tight drop-shadow-lg">
            {chapter.title}
          </h3>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 bg-white">
        <p className="text-sepia/60 text-sm mb-3 line-clamp-2">{chapter.subtitle}</p>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-sepia/10 rounded-full mb-4 overflow-hidden">
          <div
            className={`h-full transition-all ${isComplete ? 'bg-green-400' : 'bg-sepia/50'}`}
            style={{ width: `${chapterProgress}%` }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Link
            to={`/chapter/${chapter.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-sepia/10 hover:bg-sepia/20 text-sepia rounded-lg transition text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            Write
          </Link>
          <Link
            to={`/voice?chapter=${chapter.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-sepia hover:bg-ink text-white rounded-lg transition text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            Talk
          </Link>
        </div>
      </div>
    </div>
  )
})

export default function Home() {
  const { user, authFetch, refreshUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showBookPreview, setShowBookPreview] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)
  const [showTelegramLink, setShowTelegramLink] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [chapterImages, setChapterImages] = useState({})
  const [lastWorkedOn, setLastWorkedOn] = useState(null)
  const [unlockAnimation, setUnlockAnimation] = useState(null) // { chapterId, imageUrl, chapterTitle }
  const [revealedImages, setRevealedImages] = useState(new Set()) // Track images that have been revealed via animation
  const [showTour, setShowTour] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null) // { imageUrl, title }
  const prevChapterImagesRef = useRef({})
  const showTourRef = useRef(false)
  const pendingUnlockRef = useRef(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [savingName, setSavingName] = useState(false)
  const titleInputRef = useRef(null)

  // Get first name for title
  const firstName = user?.name?.split(' ')[0] || 'Your'

  // Keep tour ref in sync so polling callback has current value
  useEffect(() => {
    showTourRef.current = showTour
  }, [showTour])

  useEffect(() => {
    fetchProgress()
    fetchChapterImages()
    checkOnboardingStatus()

    // Check for onboarding param
    if (searchParams.get('onboarding') === 'true') {
      setShowOnboarding(true)
      // Clear the param from URL
      setSearchParams({})
    }
  }, [])

  // Check if user needs onboarding
  const checkOnboardingStatus = async () => {
    try {
      const res = await authFetch('/api/onboarding/status')
      if (res.ok) {
        const data = await res.json()
        if (!data.completed) {
          setShowOnboarding(true)
        }
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err)
    }
  }

  // Fetch chapter images
  const fetchChapterImages = async () => {
    try {
      const res = await authFetch('/api/chapter-images')
      if (res.ok) {
        const data = await res.json()
        const newImages = data.images || {}

        // Check for newly completed images (transition from generating to completed)
        for (const [chapterId, imgData] of Object.entries(newImages)) {
          const prevStatus = prevChapterImagesRef.current[chapterId]?.status
          const newStatus = imgData?.status

          // Trigger animation when image goes from generating to completed
          if (prevStatus === 'generating' && newStatus === 'completed' && imgData?.imageUrl) {
            const chapter = chapters.find(c => c.id === chapterId)
            if (chapter) {
              const animData = {
                chapterId,
                imageUrl: imgData.imageUrl.replace(/^"|"$/g, ''),
                chapterTitle: chapter.title
              }
              // Defer award animation until after tour finishes
              if (showTourRef.current) {
                pendingUnlockRef.current = animData
              } else {
                setUnlockAnimation(animData)
              }
            }
          }
        }

        // Update ref with current state for next comparison
        prevChapterImagesRef.current = newImages

        setChapterImages(newImages)
      }
    } catch (err) {
      console.error('Error fetching chapter images:', err)
    }
  }

  // Poll for image updates if any are generating
  useEffect(() => {
    const hasGenerating = Object.values(chapterImages).some(img => img?.status === 'generating')
    if (hasGenerating) {
      const interval = setInterval(fetchChapterImages, 3000)
      return () => clearInterval(interval)
    }
  }, [chapterImages])

  const fetchProgress = async () => {
    try {
      setError(null)
      const res = await authFetch('/api/stories/progress')
      if (!res.ok) {
        throw new Error('Failed to load progress')
      }
      const data = await res.json()
      setProgress(data.progress || data)

      // Find the last chapter they worked on (for "continue" feature)
      if (data.lastWorkedOn) {
        setLastWorkedOn(data.lastWorkedOn)
      } else {
        // Find first chapter with progress but not complete
        const progressData = data.progress || data
        for (const chapter of chapters) {
          const answered = progressData[chapter.id] || 0
          if (answered > 0 && answered < chapter.questions.length) {
            setLastWorkedOn({
              chapterId: chapter.id,
              questionIndex: answered
            })
            break
          }
        }
      }
    } catch (err) {
      console.error('Error fetching progress:', err)
      setError('Unable to load your progress. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  // Memoize progress calculations to avoid recalculating on every render
  const chapterProgressMap = useMemo(() => {
    const map = {}
    for (const chapter of chapters) {
      const answered = progress[chapter.id] || 0
      map[chapter.id] =
        chapter.questions.length > 0 ? Math.round((answered / chapter.questions.length) * 100) : 0
    }
    return map
  }, [progress])

  const { totalQuestions, totalAnswered, totalProgress } = useMemo(() => {
    const total = chapters.reduce((sum, ch) => sum + ch.questions.length, 0)
    const answered = Object.values(progress).reduce((sum, count) => sum + count, 0)
    return {
      totalQuestions: total,
      totalAnswered: answered,
      totalProgress: Math.round((answered / total) * 100)
    }
  }, [progress])

  // Memoize next chapter calculation
  const nextChapter = useMemo(() => {
    for (const chapter of chapters) {
      const answered = progress[chapter.id] || 0
      if (answered < chapter.questions.length) {
        return chapter
      }
    }
    return chapters[0]
  }, [progress])

  // Memoize lightbox handler to keep ChapterCard props stable
  const handleImageClick = useCallback((imageUrl, title) => {
    setLightboxImage({ imageUrl, title })
  }, [])

  // Inline title edit
  const handleTitleEdit = () => {
    setEditName(user?.name || '')
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 50)
  }

  const handleTitleSave = async () => {
    if (!editName.trim() || editName.trim() === user?.name) {
      setEditingTitle(false)
      return
    }
    setSavingName(true)
    try {
      const res = await authFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: editName.trim() })
      })
      if (res.ok) {
        await refreshUser()
      }
    } catch (err) {
      console.error('Error saving name:', err)
    } finally {
      setSavingName(false)
      setEditingTitle(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 page-enter">
      {/* Header */}
      <header className="text-center mb-8 sm:mb-10 relative pt-2">
        {/* Settings link - positioned with better hitbox */}
        <Link
          to="/settings"
          className="absolute -top-2 -right-2 z-10 flex items-center gap-2 px-4 py-3 rounded-xl bg-sepia/10 hover:bg-sepia/20 text-sepia transition active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-sm font-medium hidden sm:inline">Settings</span>
        </Link>
        {/* Decorative flourish */}
        <div className="text-sepia/40 text-2xl mb-4 tracking-[0.5em] float">❧</div>

        {editingTitle ? (
          <div className="mb-3">
            <input
              ref={titleInputRef}
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTitleSave()
                if (e.key === 'Escape') setEditingTitle(false)
              }}
              onBlur={handleTitleSave}
              className="text-4xl sm:text-5xl md:text-6xl font-light text-ink tracking-wide text-center bg-transparent border-b-2 border-sepia/40 focus:border-sepia focus:outline-none w-full max-w-md mx-auto"
              placeholder="Your name"
              disabled={savingName}
            />
            <p className="text-sm text-sepia/50 mt-2">Press Enter to save, Escape to cancel</p>
          </div>
        ) : (
          <h1
            onClick={handleTitleEdit}
            className="text-4xl sm:text-5xl md:text-6xl font-light text-ink mb-3 tracking-wide cursor-pointer group"
            title="Click to edit your name"
          >
            {firstName}'s Life
            <span className="inline-block ml-2 opacity-0 group-hover:opacity-60 transition text-sepia text-xl align-middle">
              <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </span>
          </h1>
        )}

        <div className="w-24 h-px bg-sepia/30 mx-auto mb-4" />
        <p className="text-lg sm:text-xl text-sepia/80 italic">
          The Autobiography of {user?.name || 'You'}
        </p>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      {/* Progress Card */}
      <div id="progress-card">
        <ProgressCard
          totalProgress={totalProgress}
          totalQuestions={totalQuestions}
          totalAnswered={totalAnswered}
          onViewBook={() => setShowBookPreview(true)}
        />
      </div>

      {/* Continue Where You Left Off */}
      {lastWorkedOn && (
        <div className="mb-8 p-4 bg-gradient-to-r from-sepia/5 to-amber-50/50 rounded-xl border border-sepia/10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sepia/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-sepia"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-ink font-medium">Continue where you left off</p>
                <p className="text-sepia/70 text-sm">
                  {chapters.find(c => c.id === lastWorkedOn.chapterId)?.title || 'Your memoir'}
                </p>
              </div>
            </div>
            <Link
              to={`/chapter/${lastWorkedOn.chapterId}`}
              className="flex items-center gap-2 px-5 py-2.5 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition text-sm font-medium"
            >
              Continue
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div id="quick-actions" className="grid grid-cols-3 gap-3 mb-10">
        <Link
          to={`/chapter/${nextChapter.id}`}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-sepia/10 hover:border-sepia/30 hover:shadow-md transition"
        >
          <div className="w-10 h-10 bg-sepia/10 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-sepia"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>
          <div>
            <p className="text-ink font-medium">Write</p>
            <p className="text-sepia/60 text-xs">Type stories</p>
          </div>
        </Link>

        <Link
          to={`/voice?chapter=${nextChapter.id}`}
          className="flex items-center gap-3 p-4 bg-gradient-to-br from-sepia to-amber-700 text-white rounded-xl hover:shadow-lg transition"
        >
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium">Talk</p>
            <p className="text-white/80 text-xs">Voice mode</p>
          </div>
        </Link>

        <button
          onClick={() => setShowTelegramLink(true)}
          className="flex items-center gap-3 p-4 bg-[#0088cc]/10 rounded-xl border border-[#0088cc]/20 hover:border-[#0088cc]/40 hover:bg-[#0088cc]/15 transition"
        >
          <div className="w-10 h-10 bg-[#0088cc]/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          </div>
          <div>
            <p className="text-[#0088cc] font-medium">Telegram</p>
            <p className="text-[#0088cc]/60 text-xs">On the go</p>
          </div>
        </button>
      </div>

      {/* Chapters - Table of Contents */}
      <div className="mb-10 sm:mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sepia/60 text-sm uppercase tracking-[0.2em]">Table of Contents</h2>
          <button
            id="export-button"
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Export Book
          </button>
        </div>

        <div id="chapter-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map(chapter => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              chapterProgress={chapterProgressMap[chapter.id]}
              chapterImage={chapterImages[chapter.id]}
              isImageRevealed={revealedImages.has(chapter.id)}
              isAnimatingThis={unlockAnimation?.chapterId === chapter.id}
              onImageClick={handleImageClick}
            />
          ))}
        </div>
      </div>

      {/* Completion Celebration - 100% */}
      {totalProgress === 100 && (
        <div className="mb-10 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200/50 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="font-display text-2xl text-ink mb-2">Congratulations!</h3>
          <p className="text-green-800/70 mb-4">
            You've completed your memoir. {totalAnswered} stories preserved for future generations.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowCertificate(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              View Certificate
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-6 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Order Your Book
            </button>
          </div>
        </div>
      )}

      {/* Completion Prompt - 80-99% */}
      {totalProgress >= 80 && totalProgress < 100 && (
        <div className="mb-10 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/50 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h3 className="font-display text-xl text-ink mb-2">Your memoir is almost ready!</h3>
          <p className="text-amber-800/70 mb-4">
            Just {totalQuestions - totalAnswered} more{' '}
            {totalQuestions - totalAnswered === 1 ? 'question' : 'questions'} to complete your life
            story.
          </p>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition"
          >
            Preview & Order Your Book
          </button>
        </div>
      )}

      {/* Decorative End */}
      <div className="text-center">
        <div className="text-sepia/30 text-lg float">✦</div>
      </div>

      {/* Modals */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} userName={user?.name || 'Your'} />
      )}

      {showBookPreview && (
        <BookPreview
          userName={user?.name}
          totalProgress={totalProgress}
          onClose={() => setShowBookPreview(false)}
        />
      )}

      {showCertificate && (
        <CompletionCertificate
          userName={user?.name}
          completionDate={new Date()}
          totalStories={totalAnswered}
          onClose={() => setShowCertificate(false)}
        />
      )}

      {showTelegramLink && <TelegramLinkModal onClose={() => setShowTelegramLink(false)} />}

      {showOnboarding && (
        <OnboardingModal
          onClose={async options => {
            setShowOnboarding(false)
            // Refresh user data to pick up name from onboarding
            await refreshUser()
            // Refresh chapter images after onboarding - image generation started
            fetchChapterImages()
            // Show tour if user requested it
            if (options?.showTour) {
              setTimeout(() => setShowTour(true), 500)
            }
          }}
        />
      )}

      {/* Interactive Tour */}
      {showTour && (
        <TourOverlay
          onComplete={() => {
            setShowTour(false)
            // Show chapter 1 award if it completed during the tour
            if (pendingUnlockRef.current) {
              setTimeout(() => {
                setUnlockAnimation(pendingUnlockRef.current)
                pendingUnlockRef.current = null
              }, 600)
            }
          }}
          onSkip={() => {
            setShowTour(false)
            if (pendingUnlockRef.current) {
              setTimeout(() => {
                setUnlockAnimation(pendingUnlockRef.current)
                pendingUnlockRef.current = null
              }, 600)
            }
          }}
        />
      )}

      {/* Chapter Image Unlock Animation */}
      {unlockAnimation && (
        <ImageUnlockAnimation
          imageUrl={unlockAnimation.imageUrl}
          chapterTitle={unlockAnimation.chapterTitle}
          onComplete={() => {
            // Mark this image as revealed so it shows in the chapter card
            setRevealedImages(prev => new Set([...prev, unlockAnimation.chapterId]))
            setUnlockAnimation(null)
          }}
        />
      )}

      {/* Full-screen Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition p-2"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Image */}
          <div className="max-w-[90vw] max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxImage.imageUrl}
              alt={lightboxImage.title}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="text-white/80 text-center mt-4 text-lg font-display">
              {lightboxImage.title}
            </p>
          </div>

          {/* Hint */}
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-sm">
            Click anywhere to close
          </p>
        </div>
      )}
    </div>
  )
}
