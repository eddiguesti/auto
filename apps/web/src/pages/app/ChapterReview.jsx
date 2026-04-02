import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { chapters } from '../../data/chapters'
import { useAuth } from '../../context/AuthContext'
import { usePremium } from '../../hooks/usePremium'
import { useToast } from '../../components/Toast'

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
      const res = await authFetch(`/api/chapter-review/${chapterId}`)
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
      const res = await authFetch(`/api/chapter-review/${chapterId}/rewrite`, { method: 'POST' })
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
      const res = await authFetch(`/api/chapter-review/${chapterId}/clio-edit`, {
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
          const res = await authFetch(`/api/chapter-review/${chapterId}/save`, {
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
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <p className="text-warm-brown">Chapter not found.</p>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-sepia/30 border-t-sepia rounded-full mx-auto mb-3" />
          <p className="text-warm-brown/70 text-sm">Loading chapter review...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-parchment/95 backdrop-blur border-b border-sepia/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={`/chapter/${chapterId}`}
              className="text-sepia/60 hover:text-sepia transition flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-warm-brown text-lg truncate">
                {chapter.icon} {chapter.title}
              </h1>
              <p className="text-sepia/50 text-xs">Chapter Review</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Save status */}
            {saveStatus === 'saving' && (
              <span className="text-xs text-sepia/50 flex items-center gap-1">
                <span className="animate-pulse">Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Saved
              </span>
            )}
            {saveStatus === 'error' && <span className="text-xs text-red-500">Save failed</span>}

            {/* Toggle Clio panel */}
            <button
              onClick={() => setShowClioPanel(p => !p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                showClioPanel ? 'bg-sepia text-white' : 'bg-sepia/10 text-sepia hover:bg-sepia/20'
              }`}
            >
              Ask Clio
            </button>
          </div>
        </div>
      </header>

      {/* Changed answers banner */}
      {hasChangedSincePolish && hasReview && (
        <div className="max-w-7xl mx-auto px-4 mt-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-amber-800 text-sm">
              Your original answers have changed since this was last polished.
            </p>
            <button
              onClick={handleRewrite}
              disabled={rewriting}
              className="text-sm font-medium text-amber-700 hover:text-amber-900 underline flex-shrink-0"
            >
              Rewrite from latest
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!hasReview ? (
          /* Landing state — no review yet */
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="w-16 h-16 bg-sepia/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-sepia"
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
            <h2 className="font-display text-2xl text-warm-brown mb-3">Polish Your Chapter</h2>
            <p className="text-sepia/70 mb-2 max-w-md mx-auto">
              Transform your {answeredCount} answers into a beautifully written chapter in polished
              British English — ready for your memoir.
            </p>
            <p className="text-sepia/50 text-sm mb-8 max-w-md mx-auto">
              You can edit the result yourself or ask Clio to make changes for you.
            </p>
            <button
              onClick={handleRewrite}
              disabled={rewriting || answeredCount === 0}
              className="px-8 py-3 bg-gradient-to-r from-sepia to-amber-700 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rewriting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Polishing your chapter...
                </span>
              ) : (
                'Polish This Chapter'
              )}
            </button>
            {answeredCount === 0 && (
              <p className="text-red-500/70 text-sm mt-3">
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
          <div className={`flex gap-6 ${showClioPanel ? '' : ''}`}>
            {/* Editor panel */}
            <div className={`flex-1 min-w-0 ${showClioPanel ? 'lg:max-w-[65%]' : ''}`}>
              {rewriting ? (
                <div className="flex items-center justify-center py-32">
                  <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-2 border-sepia/30 border-t-sepia rounded-full mx-auto mb-4" />
                    <p className="text-warm-brown font-medium">Clio is polishing your chapter...</p>
                    <p className="text-sepia/50 text-sm mt-1">This may take a moment</p>
                  </div>
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={polishedText}
                  onChange={e => handleTextChange(e.target.value)}
                  placeholder="Your polished chapter will appear here..."
                  className="w-full min-h-[600px] p-8 sm:p-10 rounded-lg border border-sepia/15 focus:border-sepia/30 focus:ring-2 focus:ring-sepia/10 outline-none resize-y transition"
                  style={{
                    fontFamily: "'Lora', Georgia, 'Times New Roman', serif",
                    fontSize: '1.05rem',
                    lineHeight: '1.85',
                    color: '#3d352c',
                    background: '#faf6f1',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)'
                  }}
                />
              )}

              {/* Action bar */}
              <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRewrite}
                    disabled={rewriting}
                    className="px-4 py-2 text-sm font-medium text-sepia border border-sepia/20 rounded-lg hover:bg-sepia/5 transition disabled:opacity-50"
                  >
                    Rewrite Chapter
                  </button>
                  <Link
                    to={`/chapter/${chapterId}`}
                    className="px-4 py-2 text-sm text-sepia/60 hover:text-sepia transition"
                  >
                    Back to Questions
                  </Link>
                </div>
                <p className="text-sepia/40 text-xs">
                  {polishedText.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>
            </div>

            {/* Clio panel */}
            {showClioPanel && (
              <div className="hidden lg:flex lg:w-[35%] flex-col bg-white/70 border border-sepia/10 rounded-lg overflow-hidden max-h-[calc(100vh-120px)] sticky top-[73px]">
                {/* Panel header */}
                <div className="px-4 py-3 border-b border-sepia/10 bg-white/50">
                  <h3 className="font-display text-warm-brown text-sm font-medium">Ask Clio</h3>
                  <p className="text-sepia/50 text-xs mt-0.5">Tell Clio what changes you'd like</p>
                </div>

                {/* Chat history */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {clioHistory.length === 0 && !clioLoading && (
                    <div className="text-center py-8">
                      <p className="text-sepia/40 text-sm">Try something like:</p>
                      <div className="mt-3 space-y-2">
                        {[
                          'Make the opening more vivid',
                          'Add more detail about the garden',
                          'Make the tone warmer',
                          'Shorten the third paragraph'
                        ].map(suggestion => (
                          <button
                            key={suggestion}
                            onClick={() => {
                              setClioInput(suggestion)
                            }}
                            className="block w-full text-left px-3 py-2 text-xs text-sepia/60 bg-sepia/5 rounded-lg hover:bg-sepia/10 transition"
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
                        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-sepia/10 text-warm-brown'
                            : 'bg-white border border-sepia/10 text-sepia/80'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {clioLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-sepia/10 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 bg-sepia/40 rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-sepia/40 rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-sepia/40 rounded-full animate-bounce"
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
                  className="border-t border-sepia/10 px-3 py-3 bg-white/50"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clioInput}
                      onChange={e => setClioInput(e.target.value)}
                      placeholder="Ask Clio to make changes..."
                      disabled={clioLoading || rewriting}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-sepia/15 bg-white focus:border-sepia/30 focus:ring-1 focus:ring-sepia/10 outline-none disabled:opacity-50 placeholder:text-sepia/30"
                    />
                    <button
                      type="submit"
                      disabled={!clioInput.trim() || clioLoading || rewriting}
                      className="px-3 py-2 bg-sepia text-white rounded-lg text-sm font-medium hover:bg-sepia/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Clio panel (bottom sheet) */}
      {showClioPanel && hasReview && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-sepia/15 shadow-lg rounded-t-2xl max-h-[60vh] flex flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-sepia/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-4 py-2 border-b border-sepia/10 flex items-center justify-between">
            <div>
              <h3 className="font-display text-warm-brown text-sm font-medium">Ask Clio</h3>
            </div>
            <button
              onClick={() => setShowClioPanel(false)}
              className="text-sepia/40 hover:text-sepia p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {clioHistory.length === 0 && !clioLoading && (
              <p className="text-sepia/40 text-sm text-center py-4">
                Tell Clio what changes you'd like to your chapter.
              </p>
            )}
            {clioHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-sepia/10 text-warm-brown'
                      : 'bg-white border border-sepia/10 text-sepia/80'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {clioLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-sepia/10 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 bg-sepia/40 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-sepia/40 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-sepia/40 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={clioEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleClioSubmit} className="border-t border-sepia/10 px-3 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={clioInput}
                onChange={e => setClioInput(e.target.value)}
                placeholder="Ask Clio to make changes..."
                disabled={clioLoading || rewriting}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-sepia/15 bg-white focus:border-sepia/30 focus:ring-1 focus:ring-sepia/10 outline-none disabled:opacity-50 placeholder:text-sepia/30"
              />
              <button
                type="submit"
                disabled={!clioInput.trim() || clioLoading || rewriting}
                className="px-3 py-2 bg-sepia text-white rounded-lg text-sm font-medium hover:bg-sepia/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
