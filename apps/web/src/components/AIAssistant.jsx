import { useState, useEffect, useRef } from 'react'
import { IconCheck, IconFeather, IconLoader2, IconPencil, IconX } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { Button, Input } from './ui'

export default function AIAssistant({ context, onClose, onInsertText }) {
  const { authFetch } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState('start') // 'start', 'interview', 'ready', 'writing', 'review'
  const [gatheredContent, setGatheredContent] = useState([])
  const [closing, setClosing] = useState(false)
  const [editableStory, setEditableStory] = useState('') // Editable version of generated story
  const messagesEndRef = useRef(null)
  const storyTextareaRef = useRef(null)

  // Storage key for this specific question
  const storageKey = `ai-chat-${context.chapterId}-${context.question.id}`

  // Load saved chat state on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const {
          messages: savedMessages,
          phase: savedPhase,
          gatheredContent: savedContent
        } = JSON.parse(saved)
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
      const messagesToSave = messages.slice(-50)
      localStorage.setItem(
        storageKey,
        JSON.stringify({ messages: messagesToSave, phase, gatheredContent })
      )
    }
  }, [messages, phase, gatheredContent, storageKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }])
  }

  const callAI = async (endpoint, body) => {
    const res = await authFetch(`/api/v1/ai/${endpoint}`, {
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
      addMessage(
        'assistant',
        "Let's start exploring this memory together. What's the first thing that comes to mind when you think about this?"
      )
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
      addMessage(
        'assistant',
        "That's great detail! Tell me more - what else do you remember about this?"
      )
    } finally {
      setLoading(false)
    }
  }

  // Generate the polished story
  const writeStory = async () => {
    setPhase('writing')
    setLoading(true)
    addMessage(
      'assistant',
      "Now I'll weave everything you've shared into a beautifully written section of your story..."
    )

    try {
      const data = await callAI('write-story', {
        question: context.question.question,
        prompt: context.question.prompt,
        existingAnswer: context.answer || '',
        gatheredContent,
        conversationHistory: messages
      })

      addMessage('assistant', data.story)
      // Move to review phase with editable story
      setEditableStory(data.story)
      setPhase('review')
    } catch (err) {
      addMessage('assistant', 'I had trouble generating the story. Please try again.')
      setPhase('ready')
    } finally {
      setLoading(false)
    }
  }

  // Insert the final story (from editable review)
  const insertStory = () => {
    if (editableStory.trim()) {
      onInsertText(editableStory.trim(), true) // true = replace instead of append
      localStorage.removeItem(storageKey)
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-surface shadow-modal animate-scale-in rounded-t-3xl sm:rounded-3xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-sepia-100 flex justify-between items-start gap-4 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl text-ink flex items-center gap-2">
              <IconFeather size={20} stroke={1.75} className="text-bronze-600 shrink-0" />
              Writing Assistant
            </h3>
            <p className="text-sm text-sepia-500 truncate mt-0.5">
              {closing && 'Saving your draft...'}
              {!closing && phase === 'start' && 'Ready to help craft your story'}
              {!closing && phase === 'interview' && 'Gathering your memories...'}
              {!closing && phase === 'ready' && 'Ready to compose your narrative'}
              {!closing && phase === 'writing' && 'Crafting your story...'}
              {!closing && phase === 'review' && 'Review and edit before saving'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={closing}
            aria-label="Close"
            className="shrink-0 -mr-2 -mt-1 p-2 rounded-full text-sepia-400 hover:text-ink hover:bg-sepia-100/70 transition-colors disabled:opacity-50"
          >
            {closing ? (
              <IconLoader2 size={20} stroke={1.75} className="animate-spin" />
            ) : (
              <IconX size={20} stroke={1.75} />
            )}
          </button>
        </div>

        {/* Context Preview */}
        <div className="px-6 py-3 border-b border-sepia-100 bg-cream/50 flex-shrink-0">
          <p className="text-sm text-sepia-600 line-clamp-2 font-serif italic">
            "{context.question.question}"
          </p>
        </div>

        {/* Start Screen */}
        {phase === 'start' && (
          <div className="flex-1 p-6 sm:p-8 flex flex-col items-center justify-center text-center overflow-y-auto">
            <div className="w-14 h-14 bg-bronze-100 text-bronze-600 rounded-2xl flex items-center justify-center mb-5">
              <IconFeather size={24} stroke={1.5} />
            </div>
            <h3 className="font-display text-2xl text-ink mb-2">Let's Write Your Story Together</h3>
            <p className="text-sepia-600 mb-8 max-w-md text-base leading-relaxed">
              I'll ask questions to draw out the details of your memory. Once we've gathered enough,
              I'll compose it into a beautifully written passage for your autobiography.
            </p>
            <Button size="lg" onClick={startInterview} disabled={loading} loading={loading}>
              Begin Conversation
            </Button>

            {context.answer && context.answer.trim() && (
              <p className="text-sm text-sepia-500 mt-4">
                I'll build upon what you've already written.
              </p>
            )}
          </div>
        )}

        {/* Chat Messages */}
        {phase !== 'start' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4 min-h-0">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[85%] px-4 py-3 rounded-2xl ${
                    msg.role === 'user' ? 'bg-sepia-100 text-ink' : 'bg-cream text-ink-soft'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed text-base">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-cream px-4 py-3 rounded-2xl">
                  <div className="flex gap-1.5">
                    <span
                      className="w-2 h-2 bg-sepia-300 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-sepia-300 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-sepia-300 rounded-full animate-bounce"
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
          <div className="p-4 sm:p-5 border-t border-sepia-100 space-y-3 flex-shrink-0 pb-safe bg-cream/40">
            {/* Action Buttons */}
            {phase === 'interview' && gatheredContent.length >= 2 && !loading && (
              <Button variant="secondary" size="xl" onClick={markReady}>
                I've shared enough — compose my story
              </Button>
            )}

            {phase === 'ready' && !loading && (
              <Button size="xl" onClick={writeStory} icon={<IconFeather size={20} stroke={1.75} />}>
                Compose My Story
              </Button>
            )}

            {(phase === 'writing' || phase === 'review') && !loading && editableStory && (
              <div className="space-y-3">
                {/* Editable story review */}
                <div className="bg-surface rounded-2xl border border-sepia-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-bronze-50 border-b border-bronze-200/50 flex items-center gap-2">
                    <IconPencil size={16} stroke={1.75} className="text-bronze-600 shrink-0" />
                    <span className="text-sm text-bronze-700 font-medium">
                      Review & edit before saving
                    </span>
                    <span className="text-xs text-bronze-600 ml-auto">
                      Fix any names, dates or details
                    </span>
                  </div>
                  <textarea
                    ref={storyTextareaRef}
                    value={editableStory}
                    onChange={e => setEditableStory(e.target.value)}
                    className="w-full p-4 bg-surface font-serif text-ink leading-relaxed text-base resize-none focus:outline-none min-h-[120px] max-h-[200px]"
                    style={{
                      height:
                        Math.min(200, Math.max(120, editableStory.split('\n').length * 24)) + 'px'
                    }}
                  />
                </div>

                <Button
                  size="xl"
                  onClick={insertStory}
                  icon={<IconCheck size={20} stroke={1.75} />}
                >
                  Save to My Story
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setPhase('ready')
                      setEditableStory('')
                    }}
                  >
                    Regenerate
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      localStorage.removeItem(storageKey)
                      setMessages([])
                      setGatheredContent([])
                      setEditableStory('')
                      setPhase('start')
                    }}
                  >
                    Start over
                  </Button>
                </div>
              </div>
            )}

            {/* Text Input - hidden during review */}
            {(phase === 'interview' || phase === 'ready') && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUserResponse()}
                    placeholder="Share more details..."
                    className="flex-1"
                    disabled={loading || closing}
                  />
                  <Button
                    variant="secondary"
                    onClick={handleUserResponse}
                    disabled={loading || closing || !input.trim()}
                    className="shrink-0"
                  >
                    Send
                  </Button>
                </div>
                {messages.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(storageKey)
                      setMessages([])
                      setGatheredContent([])
                      setPhase('start')
                    }}
                    className="text-xs text-sepia-500 hover:text-sepia-700 transition-colors"
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
