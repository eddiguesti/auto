import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AIAssistant({ context, onClose, onInsertText }) {
  const { authFetch } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState('start') // 'start', 'interview', 'ready', 'writing'
  const [gatheredContent, setGatheredContent] = useState([])
  const [closing, setClosing] = useState(false)
  const messagesEndRef = useRef(null)

  // Storage key for this specific question
  const storageKey = `ai-chat-${context.chapterId}-${context.question.id}`

  // Load saved chat state on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const { messages: savedMessages, phase: savedPhase, gatheredContent: savedContent } = JSON.parse(saved)
        if (savedMessages?.length > 0) {
          setMessages(savedMessages)
          setPhase(savedPhase || 'interview')
          setGatheredContent(savedContent || [])
        }
      } catch (e) {
        console.error('Failed to load saved chat:', e)
      }
    }
  }, [storageKey])

  // Save chat state whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify({ messages, phase, gatheredContent }))
    }
  }, [messages, phase, gatheredContent, storageKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }])
  }

  const callAI = async (endpoint, body) => {
    const res = await authFetch(`/api/ai/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      throw new Error('AI request failed')
    }
    return res.json()
  }

  // Start the interview process
  const startInterview = async () => {
    setPhase('interview')
    setLoading(true)

    // Check if they already have some content
    const hasContent = context.answer && context.answer.trim().length > 50

    try {
      const data = await callAI('interview', {
        question: context.question.question,
        prompt: context.question.prompt,
        existingAnswer: context.answer || '',
        action: 'start'
      })

      addMessage('assistant', data.response)

      if (hasContent) {
        // They have some content, add it to gathered
        setGatheredContent([{ type: 'existing', content: context.answer }])
      }
    } catch (err) {
      addMessage('assistant', "Let's start exploring this memory together. What's the first thing that comes to mind when you think about this?")
    } finally {
      setLoading(false)
    }
  }

  // Handle user response during interview
  const handleUserResponse = async () => {
    if (!input.trim() || loading) return

    const userInput = input.trim()
    setInput('')
    addMessage('user', userInput)
    setGatheredContent(prev => [...prev, { type: 'response', content: userInput }])
    setLoading(true)

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

      addMessage('assistant', data.response)

      // Check if we have enough content (AI will signal this)
      if (data.readyToWrite) {
        setPhase('ready')
      }
    } catch (err) {
      addMessage('assistant', "That's great detail! Tell me more - what else do you remember about this?")
    } finally {
      setLoading(false)
    }
  }

  // Generate the polished story
  const writeStory = async () => {
    setPhase('writing')
    setLoading(true)
    addMessage('assistant', "Now I'll weave everything you've shared into a beautifully written section of your story...")

    try {
      const data = await callAI('write-story', {
        question: context.question.question,
        prompt: context.question.prompt,
        existingAnswer: context.answer || '',
        gatheredContent,
        conversationHistory: messages
      })

      addMessage('assistant', data.story)
    } catch (err) {
      addMessage('assistant', "I had trouble generating the story. Please try again.")
      setPhase('ready')
    } finally {
      setLoading(false)
    }
  }

  // Insert the final story
  const insertStory = () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
    if (lastAssistant) {
      // Replace the existing answer with the polished story
      onInsertText(lastAssistant.content, true) // true = replace instead of append
      // Clear saved chat since they used the story
      localStorage.removeItem(storageKey)
    }
  }

  // Signal we have enough content
  const markReady = () => {
    setPhase('ready')
    addMessage('assistant', "Got enough to work with. Click 'Compose My Story' when ready, or keep adding more.")
  }

  // Handle closing - auto-generate draft if there's content
  const handleClose = async () => {
    // If we have gathered content but haven't written a story yet, generate a draft
    const userResponses = gatheredContent.filter(g => g.type === 'response')
    if (userResponses.length > 0 && phase !== 'writing') {
      setClosing(true)
      try {
        const data = await callAI('write-story', {
          question: context.question.question,
          prompt: context.question.prompt,
          existingAnswer: context.answer || '',
          gatheredContent,
          conversationHistory: messages
        })
        // Insert draft and close
        if (data.story) {
          onInsertText(data.story, true)
          localStorage.removeItem(storageKey)
          return
        }
      } catch (err) {
        console.error('Failed to generate draft:', err)
      }
      setClosing(false)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-[#faf8f3] rounded-t-xl sm:rounded-lg w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl border border-sepia/20">
        {/* Header */}
        <div className="p-4 border-b border-sepia/20 flex justify-between items-center rounded-t-xl sm:rounded-t-lg flex-shrink-0 bg-sepia/5">
          <div className="min-w-0 flex-1 mr-2">
            <h3 className="font-medium text-base sm:text-lg text-ink">✒️ Writing Assistant</h3>
            <p className="text-sm text-sepia/70 truncate italic">
              {closing && 'Saving your draft...'}
              {!closing && phase === 'start' && 'Ready to help craft your story'}
              {!closing && phase === 'interview' && 'Gathering your memories...'}
              {!closing && phase === 'ready' && 'Ready to compose your narrative'}
              {!closing && phase === 'writing' && 'Crafting your story...'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={closing}
            className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-sepia/10 active:bg-sepia/20 transition flex-shrink-0 text-sepia/60 hover:text-sepia disabled:opacity-50"
          >
            {closing ? (
              <span className="text-xs">...</span>
            ) : (
              <span className="text-xl">×</span>
            )}
          </button>
        </div>

        {/* Context Preview */}
        <div className="p-3 border-b border-sepia/10 flex-shrink-0">
          <p className="text-sm text-sepia/80 line-clamp-2 italic">
            "{context.question.question}"
          </p>
        </div>

        {/* Start Screen */}
        {phase === 'start' && (
          <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center text-center overflow-y-auto">
            <div className="w-14 h-14 bg-sepia/10 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl text-ink mb-2 font-medium">Let's Write Your Story Together</h3>
            <p className="text-sepia/70 mb-6 max-w-md text-sm sm:text-base leading-relaxed">
              I'll ask questions to draw out the details of your memory.
              Once we've gathered enough, I'll compose it into a beautifully written passage for your autobiography.
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
                  <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/70 p-3 rounded border border-sepia/10">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-sepia/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-sepia/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-sepia/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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

            {phase === 'writing' && messages.length > 0 && !loading && (
              <div className="space-y-2">
                <button
                  onClick={insertStory}
                  className="w-full py-4 sm:py-3 bg-sepia text-white rounded hover:bg-sepia/90 transition flex items-center justify-center gap-2"
                >
                  <span>✓</span>
                  <span>Use This Passage</span>
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem(storageKey)
                    setMessages([])
                    setGatheredContent([])
                    setPhase('start')
                  }}
                  className="w-full py-2 text-sm text-sepia/60 hover:text-sepia transition"
                >
                  Start over
                </button>
              </div>
            )}

            {/* Text Input */}
            {(phase === 'interview' || phase === 'ready') && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUserResponse()}
                    placeholder="Share more details..."
                    className="flex-1 px-4 py-3 sm:py-2.5 border border-sepia/20 rounded bg-white/70 focus:outline-none focus:ring-1 focus:ring-sepia/30 focus:border-sepia/40 text-base"
                    disabled={loading || closing}
                  />
                  <button
                    onClick={handleUserResponse}
                    disabled={loading || closing || !input.trim()}
                    className="px-5 sm:px-4 py-3 sm:py-2.5 bg-ink text-white/90 rounded hover:bg-ink/90 transition disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
                {messages.length > 2 && (
                  <button
                    onClick={() => {
                      localStorage.removeItem(storageKey)
                      setMessages([])
                      setGatheredContent([])
                      setPhase('start')
                    }}
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
