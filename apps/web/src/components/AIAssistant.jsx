import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const UNAVAILABLE =
  'The writing assistant is unavailable. Your notes are still here. You can keep writing or review your notes without AI.'

function restoreDraft(storageKey, legacyKey, ownerId) {
  try {
    localStorage.removeItem(legacyKey)
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (
      saved?.version === 2 &&
      saved.ownerId === ownerId &&
      Array.isArray(saved.messages) &&
      saved.messages.every(
        item => ['user', 'assistant'].includes(item.role) && typeof item.content === 'string'
      ) &&
      Array.isArray(saved.gatheredContent) &&
      saved.gatheredContent.every(
        item => ['existing', 'response'].includes(item.type) && typeof item.content === 'string'
      )
    )
      return saved
  } catch {
    /* An unavailable or malformed browser draft is never another owner's draft. */
  }
  return {}
}

export default function AIAssistant(props) {
  const { user, authFetch, isCurrentSession } = useAuth()
  if (user?.id == null) return null
  const ownerId = String(user.id)
  // A different author or question gets fresh state immediately, without first
  // rendering or persisting the previous author's conversation.
  return (
    <AssistantSession
      key={JSON.stringify([ownerId, props.context.chapterId, props.context.question.id])}
      {...props}
      ownerId={ownerId}
      authFetch={authFetch}
      isCurrentSession={isCurrentSession}
    />
  )
}

function AssistantSession({
  context,
  onClose,
  onInsertText,
  ownerId,
  authFetch,
  isCurrentSession
}) {
  const storageKey = `ai-chat:v2:${encodeURIComponent(ownerId)}:${encodeURIComponent(context.chapterId)}:${encodeURIComponent(context.question.id)}`
  const [saved] = useState(() =>
    restoreDraft(storageKey, `ai-chat-${context.chapterId}-${context.question.id}`, ownerId)
  )
  const [messages, setMessages] = useState(saved.messages || [])
  const [input, setInput] = useState(typeof saved.input === 'string' ? saved.input : '')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState(
    ['start', 'interview', 'ready', 'review'].includes(saved.phase)
      ? saved.phase
      : saved.phase === 'writing'
        ? 'ready'
        : 'start'
  )
  const [gatheredContent, setGatheredContent] = useState(saved.gatheredContent || [])
  const [editableStory, setEditableStory] = useState(
    typeof saved.editableStory === 'string' ? saved.editableStory : ''
  )
  const [assistantError, setAssistantError] = useState(null)
  const [draftStorageError, setDraftStorageError] = useState(false)
  const messagesEndRef = useRef(null)
  const storyTextareaRef = useRef(null)
  const activeRef = useRef(false)
  const requestRef = useRef(null)
  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
      requestRef.current?.abort()
    }
  }, [isCurrentSession])

  // The session guard prevents a queued old effect from restoring a draft that
  // logout just removed, even before the old component has unmounted.
  useEffect(() => {
    if (!isCurrentSession()) return
    try {
      if (messages.length || gatheredContent.length || input || editableStory)
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            version: 2,
            ownerId,
            messages: messages.slice(-50),
            phase,
            gatheredContent,
            input,
            editableStory
          })
        )
      else localStorage.removeItem(storageKey)
      setDraftStorageError(false)
    } catch {
      setDraftStorageError(true)
    }
  }, [
    messages,
    phase,
    gatheredContent,
    input,
    editableStory,
    storageKey,
    ownerId,
    isCurrentSession
  ])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }])
  }

  const current = () => activeRef.current && isCurrentSession()
  const abortError = () => new DOMException('Writing session changed', 'AbortError')
  const callAI = async (endpoint, body) => {
    if (!current()) throw abortError()
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    try {
      const res = await authFetch(`/api/ai/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(body),
        signal: controller.signal
      })
      if (!current() || controller.signal.aborted || requestRef.current !== controller)
        throw abortError()
      if (!res.ok) throw new Error('AI request failed')
      const data = await res.json()
      if (!current() || controller.signal.aborted || requestRef.current !== controller)
        throw abortError()
      const text = endpoint === 'write-story' ? data?.story : data?.response
      if (typeof text !== 'string' || !text.trim()) throw new Error('Invalid AI response')
      return data
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  // Start the interview process
  const startInterview = async () => {
    if (loading || !current()) return
    setPhase('interview')
    setLoading(true)
    setAssistantError(null)

    // Check if they already have some content
    const hasContent = context.answer && context.answer.trim().length > 50
    if (hasContent) setGatheredContent([{ type: 'existing', content: context.answer }])

    try {
      const data = await callAI('interview', {
        question: context.question.question,
        prompt: context.question.prompt,
        existingAnswer: context.answer || '',
        action: 'start'
      })
      if (!current()) return
      addMessage('assistant', data.response)
    } catch (err) {
      if (current() && err.name !== 'AbortError') setAssistantError(UNAVAILABLE)
    } finally {
      if (current() && !requestRef.current) setLoading(false)
    }
  }

  // Handle user response during interview
  const handleUserResponse = async () => {
    if (!input.trim() || loading || !current()) return

    const userInput = input.trim()
    setInput('')
    addMessage('user', userInput)
    setGatheredContent(prev => [...prev, { type: 'response', content: userInput }])
    setLoading(true)
    setAssistantError(null)

    try {
      const data = await callAI('interview', {
        question: context.question.question,
        prompt: context.question.prompt,
        existingAnswer: context.answer || '',
        gatheredContent: [...gatheredContent, { type: 'response', content: userInput }],
        lastResponse: userInput,
        history: messages,
        action: 'continue'
      })
      if (!current()) return
      addMessage('assistant', data.response)

      // Check if we have enough content (AI will signal this)
      if (data.readyToWrite) {
        setPhase('ready')
      }
    } catch (err) {
      if (current() && err.name !== 'AbortError') setAssistantError(UNAVAILABLE)
    } finally {
      if (current() && !requestRef.current) setLoading(false)
    }
  }

  // Generate the polished story
  const writeStory = async () => {
    if (loading || !current()) return
    const failedPhase = editableStory.trim() ? 'review' : 'ready'
    setPhase('writing')
    setLoading(true)
    setAssistantError(null)

    try {
      const data = await callAI('write-story', {
        question: context.question.question,
        prompt: context.question.prompt,
        existingAnswer: context.answer || '',
        gatheredContent,
        conversationHistory: messages
      })
      if (!current()) return
      addMessage('assistant', data.story)
      // Move to review phase with editable story
      setEditableStory(data.story)
      setPhase('review')
    } catch (err) {
      if (current() && err.name !== 'AbortError') {
        setAssistantError(UNAVAILABLE)
        setPhase(failedPhase)
      }
    } finally {
      if (current() && !requestRef.current) setLoading(false)
    }
  }

  // Insert the final story (from editable review)
  const insertStory = () => {
    if (editableStory.trim() && current()) {
      onInsertText(editableStory.trim(), true) // true = replace instead of append
      try {
        localStorage.removeItem(storageKey)
      } catch {
        /* The server/editor save remains independent of browser storage. */
      }
    }
  }

  // Signal we have enough content
  const markReady = () => {
    setPhase('ready')
    addMessage(
      'assistant',
      "Got enough to work with. Click 'Compose My Story' when ready, or keep adding more."
    )
  }

  const ownNotes = [
    context.answer?.trim(),
    ...gatheredContent.filter(item => item.type === 'response').map(item => item.content),
    input.trim()
  ]
    .filter(Boolean)
    .join('\n\n')
  const reviewOwnNotes = () => {
    if (!current() || loading || (!editableStory.trim() && !ownNotes)) return
    setEditableStory(previous => (previous.trim() ? previous : ownNotes))
    setInput('')
    setPhase('review')
  }
  const resetDraft = () => {
    if (!current()) return
    requestRef.current?.abort()
    setMessages([])
    setGatheredContent([])
    setEditableStory('')
    setInput('')
    setAssistantError(null)
    setLoading(false)
    setPhase('start')
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-[#faf8f3] rounded-t-xl sm:rounded-lg w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl border border-sepia/20">
        {/* Header */}
        <div className="p-4 border-b border-sepia/20 flex justify-between items-center rounded-t-xl sm:rounded-t-lg flex-shrink-0 bg-sepia/5">
          <div className="min-w-0 flex-1 mr-2">
            <h3 className="font-medium text-base sm:text-lg text-ink">✒️ Writing Assistant</h3>
            <p className="text-sm text-sepia/70 truncate italic">
              {phase === 'start' && 'Ready to help craft your story'}
              {phase === 'interview' && 'Your memory notes'}
              {phase === 'ready' && 'Ready to compose your narrative'}
              {phase === 'writing' && 'Requesting a story draft...'}
              {phase === 'review' && 'Review and edit before saving'}
            </p>
          </div>
          <button
            onClick={() => {
              requestRef.current?.abort()
              onClose()
            }}
            aria-label="Close writing assistant"
            className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-sepia/10 active:bg-sepia/20 transition flex-shrink-0 text-sepia/60 hover:text-sepia disabled:opacity-50"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {assistantError && (
          <div role="alert" className="p-3 border-b border-amber-200 bg-amber-50 text-sm text-ink">
            <p>{assistantError}</p>
            {phase !== 'review' && (
              <button
                onClick={reviewOwnNotes}
                disabled={loading || (!editableStory.trim() && !ownNotes)}
                className="mt-2 underline disabled:opacity-40"
              >
                {editableStory.trim() ? 'Return to my draft' : 'Review my notes without AI'}
              </button>
            )}
          </div>
        )}
        {draftStorageError && (
          <p role="alert" className="p-3 text-sm text-ink">
            This browser could not keep your draft. Copy your notes before closing.
          </p>
        )}

        {/* Context Preview */}
        <div className="p-3 border-b border-sepia/10 flex-shrink-0">
          <p className="text-sm text-sepia/80 line-clamp-2 italic">"{context.question.question}"</p>
        </div>

        {/* Start Screen */}
        {phase === 'start' && (
          <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center text-center overflow-y-auto">
            <div className="w-14 h-14 bg-sepia/10 rounded-2xl flex items-center justify-center mb-4">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl text-ink mb-2 font-medium">
              Let's Write Your Story Together
            </h3>
            <p className="text-sepia/70 mb-6 max-w-md text-sm sm:text-base leading-relaxed">
              I'll ask questions to draw out the details of your memory. Once we've gathered enough,
              I'll compose it into a beautifully written passage for your autobiography.
            </p>
            <button
              onClick={startInterview}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-4 sm:py-3 bg-ink text-white/90 rounded hover:bg-ink/90 transition"
            >
              Begin Conversation
            </button>

            {context.answer && context.answer.trim() && (
              <p className="text-sm text-sepia/50 mt-4 italic">
                I'll build upon what you've already written.
              </p>
            )}
          </div>
        )}

        {/* Chat Messages */}
        {phase !== 'start' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[85%] p-3 sm:p-4 rounded ${
                    msg.role === 'user'
                      ? 'bg-sepia/10 text-ink border border-sepia/20'
                      : 'bg-white/70 text-ink border border-sepia/10'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/70 p-3 rounded border border-sepia/10">
                  <div className="flex gap-1.5">
                    <span
                      className="w-2 h-2 bg-sepia/40 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-sepia/40 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-sepia/40 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        {phase !== 'start' && (
          <div className="p-3 sm:p-4 border-t border-sepia/15 space-y-3 flex-shrink-0 pb-safe bg-sepia/5">
            {/* Action Buttons */}
            {phase === 'interview' && gatheredContent.length >= 2 && !loading && (
              <button
                onClick={markReady}
                className="w-full py-3 sm:py-2.5 text-sm text-sepia border border-sepia/30 rounded hover:bg-white/50 transition"
              >
                I've shared enough — compose my story
              </button>
            )}

            {phase === 'ready' && !loading && (
              <button
                onClick={writeStory}
                className="w-full py-4 sm:py-3 bg-ink text-white/90 rounded hover:bg-ink/90 transition flex items-center justify-center gap-2"
              >
                <span>✒️</span>
                <span>Compose My Story</span>
              </button>
            )}

            {(phase === 'writing' || phase === 'review') && !loading && editableStory && (
              <div className="space-y-3">
                {/* Editable story review */}
                <div className="bg-white rounded-lg border border-sepia/20 overflow-hidden">
                  <div className="px-3 py-2 bg-amber-50 border-b border-amber-200/50 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-amber-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    <span className="text-sm text-amber-800 font-medium">
                      Review & edit before saving
                    </span>
                    <span className="text-xs text-amber-600/70 ml-auto">
                      Fix any names, dates or details
                    </span>
                  </div>
                  <textarea
                    ref={storyTextareaRef}
                    aria-label="Story draft"
                    value={editableStory}
                    onChange={e => setEditableStory(e.target.value)}
                    className="w-full p-4 text-ink leading-relaxed text-sm sm:text-base resize-none focus:outline-none min-h-[120px] max-h-[200px]"
                    style={{
                      height:
                        Math.min(200, Math.max(120, editableStory.split('\n').length * 24)) + 'px'
                    }}
                  />
                </div>

                <button
                  onClick={insertStory}
                  className="w-full py-4 sm:py-3 bg-sepia text-white rounded hover:bg-sepia/90 transition flex items-center justify-center gap-2 font-medium"
                >
                  <span>✓</span>
                  <span>Save to My Story</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPhase('ready')
                    }}
                    className="flex-1 py-2 text-sm text-sepia/60 hover:text-sepia transition border border-sepia/15 rounded"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={resetDraft}
                    className="flex-1 py-2 text-sm text-sepia/60 hover:text-sepia transition border border-sepia/15 rounded"
                  >
                    Start over
                  </button>
                </div>
              </div>
            )}

            {/* Text Input - hidden during review */}
            {(phase === 'interview' || phase === 'ready') && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Your notes"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUserResponse()}
                    placeholder="Share more details..."
                    className="flex-1 px-4 py-3 sm:py-2.5 border border-sepia/20 rounded bg-white/70 focus:outline-none focus:ring-1 focus:ring-sepia/30 focus:border-sepia/40 text-base"
                    disabled={loading}
                  />
                  <button
                    onClick={handleUserResponse}
                    disabled={loading || !input.trim()}
                    className="px-5 sm:px-4 py-3 sm:py-2.5 bg-ink text-white/90 rounded hover:bg-ink/90 transition disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
                {messages.length > 2 && (
                  <button
                    onClick={resetDraft}
                    className="text-xs text-sepia/40 hover:text-sepia/60 transition"
                  >
                    Start over
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
