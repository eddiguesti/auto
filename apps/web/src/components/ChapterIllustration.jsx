import { useState, useEffect, useRef, useCallback } from 'react'
import AuthenticatedImage from './AuthenticatedImage'
import { watchChapterArtwork } from '../lib/chapterArtwork'
import { chapters } from '../data/chapters'
import { useAuth } from '../context/AuthContext'

// Chapter-specific gradient themes for placeholders
const chapterThemes = {
  childhood: {
    gradient: 'from-amber-100 via-orange-50 to-yellow-100',
    icon: '🏠',
    label: 'Childhood memories'
  },
  family: { gradient: 'from-rose-100 via-pink-50 to-red-100', icon: '👨‍👩‍👧', label: 'Family bonds' },
  education: {
    gradient: 'from-blue-100 via-indigo-50 to-purple-100',
    icon: '📚',
    label: 'Learning years'
  },
  career: {
    gradient: 'from-slate-100 via-gray-50 to-zinc-100',
    icon: '💼',
    label: 'Career journey'
  },
  love: { gradient: 'from-pink-100 via-rose-50 to-red-100', icon: '💕', label: 'Love story' },
  adventures: {
    gradient: 'from-emerald-100 via-teal-50 to-cyan-100',
    icon: '🌍',
    label: 'Adventures'
  },
  'key-people': {
    gradient: 'from-violet-100 via-purple-50 to-fuchsia-100',
    icon: '👥',
    label: 'Important people'
  },
  challenges: {
    gradient: 'from-amber-100 via-yellow-50 to-orange-100',
    icon: '⛰️',
    label: 'Life challenges'
  },
  'world-around-you': {
    gradient: 'from-sky-100 via-blue-50 to-indigo-100',
    icon: '🌎',
    label: 'World events'
  },
  'passions-beliefs': {
    gradient: 'from-amber-100 via-orange-50 to-red-100',
    icon: '✨',
    label: 'Passions & beliefs'
  },
  wisdom: {
    gradient: 'from-amber-100 via-yellow-50 to-orange-100',
    icon: '📖',
    label: 'Life wisdom'
  }
}

export default function ChapterIllustration(props) {
  const { user } = useAuth()
  return <ChapterArtwork key={`${user?.id}:${props.chapterId}`} {...props} />
}

function ChapterArtwork({ chapterId, stories = [], onGenerate }) {
  const { authFetch } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [checking, setChecking] = useState(true)
  const [imageUrl, setImageUrl] = useState(null)
  const [error, setError] = useState(null)
  const [lookupFailed, setLookupFailed] = useState(false)
  const watcher = useRef(null)
  const action = useRef(null)
  const generated = useRef(onGenerate)
  generated.current = onGenerate
  const theme = chapterThemes[chapterId] || chapterThemes.childhood
  const title =
    chapters.find(chapter => chapter.id === chapterId)?.title || chapterId.replaceAll('-', ' ')
  const hasStories = stories.some(story => story.answer?.trim())

  const checkArtwork = useCallback(
    async (notify = false) => {
      watcher.current?.abort()
      const controller = new AbortController()
      watcher.current = controller
      setChecking(true)
      setLookupFailed(false)
      setError(null)
      try {
        const result = await watchChapterArtwork(authFetch, chapterId, {
          signal: controller.signal,
          onUpdate: artwork => {
            setChecking(false)
            setImageUrl(artwork?.imageUrl || null)
            setIsGenerating(['pending', 'generating'].includes(artwork?.status))
            if (artwork?.status === 'failed')
              setError('The illustration could not be created. You can try again.')
          }
        })
        if (!controller.signal.aborted && notify && result?.status === 'completed')
          generated.current?.(result)
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message)
          setLookupFailed(true)
        }
      } finally {
        if (!controller.signal.aborted) {
          setChecking(false)
          setIsGenerating(false)
        }
      }
    },
    [authFetch, chapterId]
  )

  useEffect(() => {
    void checkArtwork()
    return () => {
      watcher.current?.abort()
      action.current?.abort()
    }
  }, [checkArtwork])

  const handleGenerate = async () => {
    if (checking || isGenerating) return
    setIsGenerating(true)
    setError(null)
    const controller = new AbortController()
    action.current = controller
    let rejected = false
    try {
      const response = await authFetch(
        `/api/chapter-images/generate/${encodeURIComponent(chapterId)}`,
        { method: 'POST', signal: controller.signal }
      )
      if (!response.ok) {
        rejected = true
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Could not start your illustration.')
      }
      if (!controller.signal.aborted) await checkArtwork(true)
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err.message)
        // A lost enqueue response may already have started paid generation.
        // Recover with an owner-scoped read before offering another purchase.
        setLookupFailed(!rejected)
      }
    } finally {
      if (!controller.signal.aborted) setIsGenerating(false)
    }
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-sepia/10"
      aria-label={`${title} illustration`}
    >
      <div
        className={`bg-gradient-to-br ${theme.gradient} aspect-[16/9] flex items-center justify-center`}
      >
        {imageUrl ? (
          <AuthenticatedImage
            src={imageUrl}
            alt={`Illustration for ${title}`}
            loading="eager"
            className="w-full h-full"
          />
        ) : (
          <div className="text-center">
            <span aria-hidden="true" className="text-5xl mb-3 block opacity-40">
              {theme.icon}
            </span>
            <p className="text-sepia/60 text-sm">{title}</p>
          </div>
        )}
      </div>
      <div className="bg-white p-3 text-center">
        {isGenerating ? (
          <p role="status" className="text-sm text-sepia">
            Creating your illustration. You can keep writing and return later.
          </p>
        ) : lookupFailed ? (
          <button
            type="button"
            onClick={() => checkArtwork()}
            className="px-4 py-2 rounded-lg text-sm bg-sepia/5 text-sepia"
          >
            Check illustration
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={checking || !hasStories}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-sepia/5 text-sepia disabled:opacity-50"
          >
            {checking
              ? 'Loading illustration...'
              : !hasStories
                ? 'Add a memory first'
                : imageUrl
                  ? 'Create a new illustration'
                  : 'Generate illustration'}
          </button>
        )}
        {error && (
          <p role="alert" className="mt-2 text-red-700 text-sm">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
