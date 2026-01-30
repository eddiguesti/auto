import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { chapters } from '../data/chapters'
import StyleSelector from '../components/StyleSelector'
import StylePreviewModal from '../components/StylePreviewModal'
import { IconArrowLeft, IconLoader2, IconCheck, IconRotate, IconSparkles, IconAlertTriangle } from '@tabler/icons-react'

export default function PreviewStyle() {
  const { user, authFetch } = useAuth()
  const [stories, setStories] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Style selections
  const [selectedTones, setSelectedTones] = useState([])
  const [selectedNarrative, setSelectedNarrative] = useState(null)
  const [selectedAuthor, setSelectedAuthor] = useState(null)

  // Preview modal
  const [showPreview, setShowPreview] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [previewOriginal, setPreviewOriginal] = useState('')
  const [previewTransformed, setPreviewTransformed] = useState('')
  const [selectedStoryId, setSelectedStoryId] = useState(null)

  // Apply all state
  const [applying, setApplying] = useState(false)
  const [applyProgress, setApplyProgress] = useState(null)
  const [showRevertConfirm, setShowRevertConfirm] = useState(false)
  const [reverting, setReverting] = useState(false)

  // Current chapter being viewed
  const [activeChapter, setActiveChapter] = useState(null)

  useEffect(() => {
    fetchAllStories()
    fetchStylePreferences()
  }, [])

  const fetchAllStories = async () => {
    try {
      setError(null)
      const res = await authFetch('/api/stories/all')
      if (!res.ok) throw new Error('Failed to load stories')

      const storiesData = await res.json()
      const organized = {}
      storiesData.forEach(story => {
        if (!organized[story.chapter_id]) {
          organized[story.chapter_id] = {}
        }
        organized[story.chapter_id][story.question_id] = story
      })
      setStories(organized)

      // Set first chapter with content as active
      for (const chapter of chapters) {
        if (organized[chapter.id] && Object.values(organized[chapter.id]).some(s => s.answer?.trim())) {
          setActiveChapter(chapter.id)
          break
        }
      }
    } catch (err) {
      console.error('Error fetching stories:', err)
      setError('Unable to load your stories. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  const fetchStylePreferences = async () => {
    try {
      const res = await authFetch('/api/style/preferences')
      if (res.ok) {
        const prefs = await res.json()
        setSelectedTones(prefs.tones || [])
        setSelectedNarrative(prefs.narrative || null)
        setSelectedAuthor(prefs.authorStyle || null)
      }
    } catch (err) {
      console.error('Error fetching style preferences:', err)
    }
  }

  const savePreferences = async (tones, narrative, authorStyle) => {
    try {
      await authFetch('/api/style/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tones, narrative, authorStyle })
      })
    } catch (err) {
      console.error('Error saving preferences:', err)
    }
  }

  const handleTonesChange = (tones) => {
    setSelectedTones(tones)
    savePreferences(tones, selectedNarrative, selectedAuthor)
  }

  const handleNarrativeChange = (narrative) => {
    setSelectedNarrative(narrative)
    savePreferences(selectedTones, narrative, selectedAuthor)
  }

  const handleAuthorChange = (author) => {
    setSelectedAuthor(author)
    savePreferences(selectedTones, selectedNarrative, author)
  }

  const getFirstStoryWithContent = () => {
    for (const chapter of chapters) {
      const chapterStories = stories[chapter.id]
      if (chapterStories) {
        for (const story of Object.values(chapterStories)) {
          if (story.answer?.trim()) {
            return story
          }
        }
      }
    }
    return null
  }

  const handlePreviewSample = async () => {
    const story = getFirstStoryWithContent()
    if (!story) {
      setPreviewError('No stories with content found')
      return
    }

    setSelectedStoryId(story.id)
    setShowPreview(true)
    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewOriginal(story.original_answer || story.answer)
    setPreviewTransformed('')

    try {
      const res = await authFetch('/api/style/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          tones: selectedTones,
          narrative: selectedNarrative,
          authorStyle: selectedAuthor
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Preview failed')
      }

      const data = await res.json()
      setPreviewOriginal(data.original)
      setPreviewTransformed(data.transformed)
    } catch (err) {
      console.error('Preview error:', err)
      setPreviewError(err.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleApplyAll = async () => {
    setApplying(true)
    setApplyProgress({ current: 0, total: 0 })

    try {
      const res = await authFetch('/api/style/apply-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tones: selectedTones,
          narrative: selectedNarrative,
          authorStyle: selectedAuthor
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to apply style')
      }

      const data = await res.json()
      setApplyProgress({
        current: data.transformedCount,
        total: data.totalStories,
        complete: true
      })

      // Refresh stories
      await fetchAllStories()
      setShowPreview(false)
    } catch (err) {
      console.error('Apply all error:', err)
      setError(err.message)
    } finally {
      setApplying(false)
    }
  }

  const handleRevert = async () => {
    setReverting(true)
    try {
      const res = await authFetch('/api/style/revert', {
        method: 'POST'
      })

      if (!res.ok) throw new Error('Failed to revert')

      await fetchAllStories()
      setShowRevertConfirm(false)
    } catch (err) {
      console.error('Revert error:', err)
      setError(err.message)
    } finally {
      setReverting(false)
    }
  }

  const getStyleDescription = () => {
    const parts = []
    if (selectedTones.length > 0) parts.push(selectedTones.join(', '))
    if (selectedNarrative) parts.push(selectedNarrative)
    if (selectedAuthor) parts.push(selectedAuthor)
    return parts.join(' + ') || 'No style selected'
  }

  const hasStyleApplied = () => {
    for (const chapterStories of Object.values(stories)) {
      for (const story of Object.values(chapterStories)) {
        if (story.style_applied) return true
      }
    }
    return false
  }

  const hasSelections = selectedTones.length > 0 || selectedNarrative || selectedAuthor

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <IconLoader2 size={32} className="text-accent animate-spin" />
      </div>
    )
  }

  const hasContent = Object.keys(stories).length > 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 page-enter">
      {/* Header */}
      <header className="mb-6">
        <Link to="/home" className="text-sepia hover:text-ink transition inline-flex items-center gap-1 mb-4">
          <IconArrowLeft size={16} />
          Back to Chapters
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink flex items-center gap-2">
              <IconSparkles size={28} className="text-accent" />
              Style Your Memoir
            </h1>
            <p className="text-sepia text-sm sm:text-base">Choose a writing style and see your story transformed</p>
          </div>

          {hasStyleApplied() && (
            <button
              onClick={() => setShowRevertConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-sepia/30 text-sepia rounded-lg hover:bg-sepia/10 transition"
            >
              <IconRotate size={18} />
              Revert to Original
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3">
          <IconAlertTriangle size={20} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            Dismiss
          </button>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Style Selector */}
          <div className="bg-white rounded-2xl shadow-sm p-6 order-2 lg:order-1">
            <StyleSelector
              selectedTones={selectedTones}
              selectedNarrative={selectedNarrative}
              selectedAuthor={selectedAuthor}
              onTonesChange={handleTonesChange}
              onNarrativeChange={handleNarrativeChange}
              onAuthorChange={handleAuthorChange}
              onPreviewSample={hasSelections ? handlePreviewSample : null}
            />

            {/* Apply All Button */}
            {hasSelections && (
              <div className="mt-6 pt-6 border-t border-sepia/10">
                <button
                  onClick={handleApplyAll}
                  disabled={applying}
                  className="w-full py-4 bg-ink hover:bg-ink/90 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {applying ? (
                    <>
                      <IconLoader2 size={20} className="animate-spin" />
                      Transforming Stories...
                    </>
                  ) : (
                    <>
                      <IconCheck size={20} />
                      Apply Style to All Stories
                    </>
                  )}
                </button>
                <p className="text-xs text-sepia/50 text-center mt-2">
                  This will transform all your stories. Original versions are saved and can be reverted.
                </p>
              </div>
            )}
          </div>

          {/* Right: Memoir Reader */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden order-1 lg:order-2">
            {/* Chapter tabs */}
            <div className="border-b border-sepia/10 overflow-x-auto">
              <div className="flex">
                {chapters.map(chapter => {
                  const chapterStories = stories[chapter.id]
                  const hasStories = chapterStories && Object.values(chapterStories).some(s => s.answer?.trim())
                  if (!hasStories) return null

                  return (
                    <button
                      key={chapter.id}
                      onClick={() => setActiveChapter(chapter.id)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                        activeChapter === chapter.id
                          ? 'text-accent border-b-2 border-accent bg-accent/5'
                          : 'text-sepia/60 hover:text-sepia hover:bg-sepia/5'
                      }`}
                    >
                      {chapter.title}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Stories content */}
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {activeChapter && stories[activeChapter] ? (
                <div className="space-y-8">
                  {Object.values(stories[activeChapter])
                    .filter(story => story.answer?.trim())
                    .sort((a, b) => a.question_id.localeCompare(b.question_id))
                    .map(story => (
                      <div key={story.id} className="relative">
                        {story.style_applied && (
                          <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full">
                            Styled
                          </div>
                        )}
                        <div className="prose prose-sepia max-w-none">
                          <p className="whitespace-pre-wrap leading-relaxed text-sepia">
                            {story.answer}
                          </p>
                        </div>
                        {story !== Object.values(stories[activeChapter]).slice(-1)[0] && (
                          <hr className="mt-8 border-sepia/10" />
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center text-sepia/50 py-8">Select a chapter to view</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <StylePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        originalText={previewOriginal}
        transformedText={previewTransformed}
        isLoading={previewLoading}
        error={previewError}
        styleDescription={getStyleDescription()}
        onApply={handleApplyAll}
        onRetry={handlePreviewSample}
      />

      {/* Apply Progress Overlay */}
      {applying && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <IconLoader2 size={48} className="text-accent animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-ink mb-2">Transforming Your Stories</h3>
            <p className="text-sm text-sepia/60 mb-4">
              Please wait while we apply your selected style to all stories...
            </p>
            {applyProgress && applyProgress.total > 0 && (
              <div className="w-full bg-sepia/10 rounded-full h-2 mb-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all"
                  style={{ width: `${(applyProgress.current / applyProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revert Confirmation */}
      {showRevertConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-ink mb-2">Revert to Original?</h3>
            <p className="text-sm text-sepia/70 mb-6">
              This will restore all your stories to their original versions before any style was applied.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRevertConfirm(false)}
                className="flex-1 py-3 border border-sepia/20 text-sepia rounded-xl hover:bg-sepia/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRevert}
                disabled={reverting}
                className="flex-1 py-3 bg-sepia text-white rounded-xl hover:bg-sepia/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reverting ? (
                  <>
                    <IconLoader2 size={18} className="animate-spin" />
                    Reverting...
                  </>
                ) : (
                  <>
                    <IconRotate size={18} />
                    Revert All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
