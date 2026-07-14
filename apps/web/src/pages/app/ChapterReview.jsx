import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  IconAlertCircle,
  IconBook2,
  IconCheck,
  IconLoader2,
  IconSend,
  IconX
} from '@tabler/icons-react'
import { chapters } from '../../data/chapters'
import { useAuth } from '../../context/AuthContext'
import { usePremium } from '../../hooks/usePremium'
import { useToast } from '../../components/Toast'
import AppShell from '../../components/layout/AppShell'
import { Button, Card, Input, Skeleton, EmptyState } from '../../components/ui'

export default function ChapterReview() {
  const { chapterId } = useParams()
  const navigate = useNavigate()
  const { authFetch } = useAuth()
  const { isChapterLocked } = usePremium()
  const toast = useToast()

  const [polishedText, setPolishedText] = useState('')
  const [originalPolishedText, setOriginalPolishedText] = useState('')
  const [clioHistory, setClioHistory] = useState([])
  const [clioInput, setClioInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [rewriting, setRewriting] = useState(false)
  const [clioLoading, setClioLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [hasReview, setHasReview] = useState(false)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [hasChangedSincePolish, setHasChangedSincePolish] = useState(false)
  const [showClioPanel, setShowClioPanel] = useState(true)

  const saveTimeoutRef = useRef(null)
  const abortControllerRef = useRef(null)
  const clioEndRef = useRef(null)
  const textareaRef = useRef(null)

  const chapter = useMemo(() => chapters.find(c => c.id === chapterId), [chapterId])

  // Redirect if locked
  useEffect(() => {
    if (chapter && isChapterLocked(chapterId)) {
      navigate('/home', { replace: true })
    }
  }, [chapterId, chapter, isChapterLocked, navigate])

  // Fetch existing review on mount
  useEffect(() => {
    fetchReview()
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [chapterId])

  // Scroll Clio panel to bottom on new messages
  useEffect(() => {
    if (clioEndRef.current) {
      clioEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [clioHistory])

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = e => {
      if (polishedText !== originalPolishedText) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [polishedText, originalPolishedText])

  const fetchReview = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/v1/chapter-review/${chapterId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.review) {
          setPolishedText(data.review.polishedText)
          setOriginalPolishedText(data.review.polishedText)
          setClioHistory(data.review.clioHistory || [])
          setHasReview(true)
        }
        setAnsweredCount(data.answeredCount)
        setHasChangedSincePolish(data.hasChangedSincePolish)
      }
    } catch (err) {
      console.error('Failed to fetch review:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRewrite = async () => {
    if (
      hasReview &&
      !confirm('This will replace the current polished text and clear Clio history. Continue?')
    )
      return
    setRewriting(true)
    try {
      const res = await authFetch(`/api/v1/chapter-review/${chapterId}/rewrite`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setPolishedText(data.polishedText)
        setOriginalPolishedText(data.polishedText)
        setClioHistory([])
        setHasReview(true)
        setHasChangedSincePolish(false)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message || err.error || 'Failed to polish chapter. Please try again.')
      }
    } catch (err) {
      console.error('Rewrite failed:', err)
      toast.error('Failed to polish chapter. Please try again.')
    } finally {
      setRewriting(false)
    }
  }

  const handleClioSubmit = async e => {
    e?.preventDefault()
    if (!clioInput.trim() || clioLoading) return
    const instruction = clioInput.trim()
    setClioInput('')
    setClioHistory(prev => [...prev, { role: 'user', content: instruction }])
    setClioLoading(true)

    try {
      const res = await authFetch(`/api/v1/chapter-review/${chapterId}/clio-edit`, {
        method: 'POST',
        body: JSON.stringify({
          instruction,
          currentText: polishedText,
          clioHistory
        })
      })
      if (res.ok) {
        const data = await res.json()
        setPolishedText(data.updatedText)
        setOriginalPolishedText(data.updatedText)
        setClioHistory(prev => [...prev, { role: 'assistant', content: data.clioMessage }])
      } else {
        const err = await res.json().catch(() => ({}))
        setClioHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            content: err.error || "Sorry, I couldn't process that. Please try again."
          }
        ])
      }
    } catch (err) {
      console.error('Clio edit failed:', err)
      setClioHistory(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' }
      ])
    } finally {
      setClioLoading(false)
    }
  }

  const handleTextChange = useCallback(
    newText => {
      setPolishedText(newText)
      setSaveStatus('saving')

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()

      saveTimeoutRef.current = setTimeout(async () => {
        const controller = new AbortController()
        abortControllerRef.current = controller
        try {
          const res = await authFetch(`/api/v1/chapter-review/${chapterId}/save`, {
            method: 'PUT',
            body: JSON.stringify({ polishedText: newText }),
            signal: controller.signal
          })
          if (res.ok) {
            setSaveStatus('saved')
            setOriginalPolishedText(newText)
            setTimeout(() => setSaveStatus(prev => (prev === 'saved' ? null : prev)), 2000)
          } else {
            setSaveStatus('error')
          }
        } catch (err) {
          if (err.name !== 'AbortError') setSaveStatus('error')
        }
      }, 1500)
    },
    [chapterId, authFetch]
  )

  if (!chapter) {
    return (
      <AppShell back="/home">
        <div className="py-8 page-enter">
          <EmptyState icon={<IconBook2 size={24} stroke={1.5} />} title="Chapter not found." />
        </div>
      </AppShell>
    )
  }

  // Loading state
  if (loading) {
    return (
      <AppShell back="/home" title={chapter.title} wide>
        <div className="py-8 page-enter" aria-busy="true">
          <Skeleton className="h-9 w-56 mb-6" />
          <Skeleton className="h-4 w-full max-w-lg mb-2" />
          <Skeleton className="h-4 w-2/3 max-w-md mb-8" />
          <Skeleton className="h-[480px] w-full" />
          <p className="text-sepia-500 text-sm text-center mt-4">Loading chapter review...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      back="/home"
      title={chapter.title}
      wide
      actions={
        <Button
          variant={showClioPanel ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setShowClioPanel(p => !p)}
        >
          Ask Clio
        </Button>
      }
    >
      <div className="py-8 page-enter">
        {/* Changed answers banner */}
        {hasChangedSincePolish && hasReview && (
          <div className="mb-6 p-4 bg-warning-soft rounded-xl flex items-center justify-between gap-3">
            <p className="text-warning-strong text-sm flex items-center gap-2 min-w-0">
              <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
              Your original answers have changed since this was last polished.
            </p>
            <button
              type="button"
              onClick={handleRewrite}
              disabled={rewriting}
              className="text-sm font-medium text-warning-strong underline hover:no-underline shrink-0 disabled:opacity-50"
            >
              Rewrite from latest
            </button>
          </div>
        )}

        {!hasReview ? (
          /* Landing state — no review yet */
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="w-14 h-14 bg-bronze-100 text-bronze-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <IconBook2 size={24} stroke={1.5} />
            </div>
            <h2 className="font-display text-3xl text-ink mb-3">Polish Your Chapter</h2>
            <p className="text-sepia-600 mb-2 max-w-md mx-auto">
              Transform your {answeredCount} answers into a beautifully written chapter in polished
              British English — ready for your memoir.
            </p>
            <p className="text-sepia-500 text-sm mb-8 max-w-md mx-auto">
              You can edit the result yourself or ask Clio to make changes for you.
            </p>
            <Button
              size="lg"
              onClick={handleRewrite}
              loading={rewriting}
              disabled={rewriting || answeredCount === 0}
            >
              {rewriting ? 'Polishing your chapter...' : 'Polish This Chapter'}
            </Button>
            {answeredCount === 0 && (
              <p className="text-error text-sm mt-3">
                No answers found.{' '}
                <Link to={`/chapter/${chapterId}`} className="underline">
                  Write some first
                </Link>
                .
              </p>
            )}
          </div>
        ) : (
          /* Review + Edit state */
          <div className="flex gap-6">
            {/* Editor panel */}
            <div className={`flex-1 min-w-0 ${showClioPanel ? 'lg:max-w-[65%]' : ''}`}>
              {rewriting ? (
                <Card padding="lg" className="min-h-[600px] flex flex-col justify-center">
                  <div className="max-w-md w-full mx-auto space-y-3" aria-hidden="true">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="text-center mt-8">
                    <p className="text-ink font-medium">Clio is polishing your chapter...</p>
                    <p className="text-sepia-500 text-sm mt-1">This may take a moment</p>
                  </div>
                </Card>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={polishedText}
                  onChange={e => handleTextChange(e.target.value)}
                  placeholder="Your polished chapter will appear here..."
                  className="prose-memoir max-w-none w-full min-h-[600px] p-8 sm:p-10 rounded-2xl bg-cream border border-sepia-200 placeholder:text-sepia-400 hover:border-sepia-300 focus:border-bronze-400 focus:ring-4 focus:ring-bronze-500/10 focus:outline-none resize-y transition-colors duration-150"
                />
              )}

              {/* Action bar */}
              <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRewrite}
                    disabled={rewriting}
                  >
                    Rewrite Chapter
                  </Button>
                  <Button variant="ghost" size="sm" to={`/chapter/${chapterId}`}>
                    Back to Questions
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  {/* Save status */}
                  {saveStatus === 'saving' && (
                    <span className="text-xs text-sepia-500 flex items-center gap-1.5">
                      <IconLoader2 size={12} stroke={2} className="animate-spin" />
                      Saving...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-xs text-success-strong flex items-center gap-1.5">
                      <IconCheck size={12} stroke={2.5} />
                      Saved
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-xs text-error-strong">Save failed</span>
                  )}
                  <p className="text-sepia-500 text-xs">
                    {polishedText.split(/\s+/).filter(Boolean).length} words
                  </p>
                </div>
              </div>
            </div>

            {/* Clio panel */}
            {showClioPanel && (
              <div className="hidden lg:flex lg:w-[35%] flex-col bg-surface border border-sepia-200/70 rounded-2xl shadow-soft overflow-hidden max-h-[calc(100vh-120px)] sticky top-[73px]">
                {/* Panel header */}
                <div className="px-4 py-3 border-b border-sepia-100 bg-cream/50">
                  <h3 className="font-display text-ink">Ask Clio</h3>
                  <p className="text-sepia-500 text-xs mt-0.5">Tell Clio what changes you'd like</p>
                </div>

                {/* Chat history */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {clioHistory.length === 0 && !clioLoading && (
                    <div className="text-center py-8">
                      <p className="text-sepia-500 text-sm">Try something like:</p>
                      <div className="mt-3 space-y-2">
                        {[
                          'Make the opening more vivid',
                          'Add more detail about the garden',
                          'Make the tone warmer',
                          'Shorten the third paragraph'
                        ].map(suggestion => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setClioInput(suggestion)
                            }}
                            className="block w-full text-left px-3 py-2 text-sm text-sepia-600 bg-sepia-50 rounded-xl hover:bg-sepia-100 transition-colors"
                          >
                            "{suggestion}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {clioHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                          msg.role === 'user' ? 'bg-sepia-100 text-ink' : 'bg-cream text-ink-soft'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {clioLoading && (
                    <div className="flex justify-start">
                      <div className="bg-cream px-3.5 py-2.5 rounded-2xl">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 bg-sepia-300 rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-sepia-300 rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-sepia-300 rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={clioEndRef} />
                </div>

                {/* Input area */}
                <form
                  onSubmit={handleClioSubmit}
                  className="border-t border-sepia-100 px-3 py-3 bg-cream/50"
                >
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={clioInput}
                      onChange={e => setClioInput(e.target.value)}
                      placeholder="Ask Clio to make changes..."
                      disabled={clioLoading || rewriting}
                      className="flex-1 text-sm"
                    />
                    <Button
                      type="submit"
                      disabled={!clioInput.trim() || clioLoading || rewriting}
                      aria-label="Send"
                      className="shrink-0"
                      icon={<IconSend size={20} stroke={1.75} />}
                    />
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Mobile Clio panel (bottom sheet) */}
        {showClioPanel && hasReview && (
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-surface border-t border-sepia-200 shadow-modal rounded-t-3xl max-h-[60vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-sepia-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-2 border-b border-sepia-100 flex items-center justify-between">
              <div>
                <h3 className="font-display text-ink">Ask Clio</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClioPanel(false)}
                aria-label="Close"
                className="p-2 rounded-full text-sepia-400 hover:text-ink hover:bg-sepia-100/70 transition-colors"
              >
                <IconX size={20} stroke={1.75} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {clioHistory.length === 0 && !clioLoading && (
                <p className="text-sepia-500 text-sm text-center py-4">
                  Tell Clio what changes you'd like to your chapter.
                </p>
              )}
              {clioHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.role === 'user' ? 'bg-sepia-100 text-ink' : 'bg-cream text-ink-soft'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {clioLoading && (
                <div className="flex justify-start">
                  <div className="bg-cream px-3.5 py-2.5 rounded-2xl">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 bg-sepia-300 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-sepia-300 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-sepia-300 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={clioEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleClioSubmit}
              className="border-t border-sepia-100 px-3 py-3 pb-safe"
            >
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={clioInput}
                  onChange={e => setClioInput(e.target.value)}
                  placeholder="Ask Clio to make changes..."
                  disabled={clioLoading || rewriting}
                  className="flex-1 text-sm"
                />
                <Button
                  type="submit"
                  disabled={!clioInput.trim() || clioLoading || rewriting}
                  aria-label="Send"
                  className="shrink-0"
                  icon={<IconSend size={20} stroke={1.75} />}
                />
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  )
}
