import { useState, useEffect } from 'react'
import {
  IconLoader2,
  IconCheck,
  IconRotate,
  IconSparkles,
  IconAlertCircle
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { chapters } from '../../data/chapters'
import StyleSelector from '../../components/StyleSelector'
import StylePreviewModal from '../../components/StylePreviewModal'
import AppShell from '../../components/layout/AppShell'
import { Button, Card, Badge, Modal, ProgressBar, Skeleton, EmptyState } from '../../components/ui'

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
      const res = await authFetch('/api/v1/stories/all')
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
        if (
          organized[chapter.id] &&
          Object.values(organized[chapter.id]).some(s => s.answer?.trim())
        ) {
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
      const res = await authFetch('/api/v1/style/preferences')
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
      await authFetch('/api/v1/style/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tones, narrative, authorStyle })
      })
    } catch (err) {
      console.error('Error saving preferences:', err)
    }
  }

  const handleTonesChange = tones => {
    setSelectedTones(tones)
    savePreferences(tones, selectedNarrative, selectedAuthor)
  }

  const handleNarrativeChange = narrative => {
    setSelectedNarrative(narrative)
    savePreferences(selectedTones, narrative, selectedAuthor)
  }

  const handleAuthorChange = author => {
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
      const res = await authFetch('/api/v1/style/preview', {
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
      const res = await authFetch('/api/v1/style/apply-all', {
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
      const res = await authFetch('/api/v1/style/revert', {
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
      <AppShell back="/home" title="Style your memoir" wide>
        <div className="py-8">
          <Skeleton className="h-10 w-72 mb-3" />
          <Skeleton className="h-5 w-96 max-w-full mb-10" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[420px]" />
            <Skeleton className="h-[420px]" />
          </div>
        </div>
      </AppShell>
    )
  }

  const hasContent = Object.keys(stories).length > 0

  return (
    <AppShell back="/home" title="Style your memoir" wide>
      <div className="py-8 page-enter">
        {/* Heading */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display text-ink">Style Your Memoir</h1>
            <p className="text-sepia-600 mt-1">
              Choose a writing style and see your story transformed
            </p>
          </div>

          {hasStyleApplied() && (
            <Button
              variant="secondary"
              icon={<IconRotate size={20} stroke={1.75} />}
              onClick={() => setShowRevertConfirm(true)}
              className="shrink-0"
            >
              Revert to Original
            </Button>
          )}
        </header>

        {error && (
          <div className="mb-6 p-4 bg-error-soft text-error-strong rounded-xl text-sm flex items-center gap-3">
            <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-error-strong"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {!hasContent ? (
          <Card padding="lg">
            <EmptyState
              icon={<IconSparkles size={28} stroke={1.5} />}
              title="No stories written yet"
              action={
                <Button variant="secondary" to="/home">
                  Start writing your story
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Style Selector */}
            <Card className="order-2 lg:order-1 stagger-item">
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
                <div className="mt-8 pt-6 border-t border-sepia-100">
                  <Button
                    size="xl"
                    loading={applying}
                    disabled={applying}
                    onClick={handleApplyAll}
                    icon={!applying ? <IconCheck size={20} stroke={1.75} /> : null}
                  >
                    {applying ? 'Transforming Stories...' : 'Apply Style to All Stories'}
                  </Button>
                  <p className="text-xs text-sepia-500 text-center mt-3">
                    This will transform all your stories. Original versions are saved and can be
                    reverted.
                  </p>
                </div>
              )}
            </Card>

            {/* Right: Memoir Reader */}
            <Card padding="none" className="order-1 lg:order-2 overflow-hidden stagger-item">
              {/* Chapter tabs */}
              <div className="border-b border-sepia-100 overflow-x-auto">
                <div className="flex">
                  {chapters.map(chapter => {
                    const chapterStories = stories[chapter.id]
                    const hasStories =
                      chapterStories && Object.values(chapterStories).some(s => s.answer?.trim())
                    if (!hasStories) return null

                    return (
                      <button
                        key={chapter.id}
                        type="button"
                        onClick={() => setActiveChapter(chapter.id)}
                        className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                          activeChapter === chapter.id
                            ? 'text-bronze-700 border-b-2 border-bronze-500 bg-bronze-50/60'
                            : 'text-sepia-500 hover:text-ink hover:bg-sepia-50'
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
                            <span className="absolute -top-2 -right-2">
                              <Badge variant="bronze">Styled</Badge>
                            </span>
                          )}
                          <p className="whitespace-pre-wrap leading-relaxed font-serif text-ink-soft">
                            {story.answer}
                          </p>
                          {story !== Object.values(stories[activeChapter]).slice(-1)[0] && (
                            <hr className="mt-8 border-sepia-100" />
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center text-sepia-500 py-8">Select a chapter to view</p>
                )}
              </div>
            </Card>
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
          <Modal dismissable={false} size="sm">
            <div className="text-center pt-2">
              <IconLoader2
                size={40}
                stroke={1.75}
                className="text-bronze-500 animate-spin mx-auto mb-4"
              />
              <h3 className="text-2xl font-display text-ink mb-2">Transforming Your Stories</h3>
              <p className="text-sm text-sepia-600 mb-5">
                Please wait while we apply your selected style to all stories...
              </p>
              {applyProgress && applyProgress.total > 0 && (
                <ProgressBar
                  value={(applyProgress.current / applyProgress.total) * 100}
                  label="Style transformation progress"
                />
              )}
            </div>
          </Modal>
        )}

        {/* Revert Confirmation */}
        {showRevertConfirm && (
          <Modal onClose={() => setShowRevertConfirm(false)} title="Revert to Original?" size="md">
            <p className="text-sepia-600 mb-6">
              This will restore all your stories to their original versions before any style was
              applied.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => setShowRevertConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                className="flex-1"
                loading={reverting}
                disabled={reverting}
                onClick={handleRevert}
                icon={!reverting ? <IconRotate size={20} stroke={1.75} /> : null}
              >
                {reverting ? 'Reverting...' : 'Revert All'}
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  )
}
