import { useState, useEffect, useRef } from 'react'

export default function AIAssistant({ context, onClose, onInsertText }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState('start') // 'start', 'interview', 'ready', 'writing'
  const [gatheredContent, setGatheredContent] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }])
  }

  const callAI = async (endpoint, body) => {
    const res = await fetch(`/api/ai/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
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
    }
  }

  // Signal we have enough content
  const markReady = () => {
    setPhase('ready')
    addMessage('assistant', "Great! You've shared some wonderful details. When you're ready, click 'Write My Story' and I'll turn all of this into a beautifully written section of your autobiography.")
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-xl sm:rounded-xl w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-t-xl flex-shrink-0">
          <div className="min-w-0 flex-1 mr-2">
            <h3 className="font-bold text-base sm:text-lg">AI Story Writer</h3>
            <p className="text-sm text-white/80 truncate">
              {phase === 'start' && 'Ready to help you tell your story'}
              {phase === 'interview' && 'Gathering your memories...'}
              {phase === 'ready' && 'Ready to write your story!'}
              {phase === 'writing' && 'Crafting your narrative...'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-white/20 active:bg-white/30 transition flex-shrink-0"
          >
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Context Preview */}
        <div className="p-3 bg-gray-50 border-b flex-shrink-0">
          <p className="text-sm text-sepia line-clamp-2">
            <strong>Question:</strong> {context.question.question}
          </p>
        </div>

        {/* Start Screen */}
        {phase === 'start' && (
          <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center text-center overflow-y-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 flex-shrink-0">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-ink mb-2">Let's Write Your Story Together</h3>
            <p className="text-sepia mb-6 max-w-md text-sm sm:text-base">
              I'll ask you questions to help draw out the details of your memory.
              Once we've gathered enough, I'll turn it into a beautifully written section of your autobiography.
            </p>
            <button
              onClick={startInterview}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-4 sm:py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 active:bg-purple-700 transition font-medium"
            >
              Start the Conversation
            </button>

            {context.answer && context.answer.trim() && (
              <p className="text-sm text-sepia/60 mt-4">
                I'll build on what you've already written.
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
                  className={`max-w-[90%] sm:max-w-[85%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-purple-100 text-ink'
                      : 'bg-gray-100 text-ink'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        {phase !== 'start' && (
          <div className="p-3 sm:p-4 border-t space-y-3 flex-shrink-0 pb-safe">
            {/* Action Buttons */}
            {phase === 'interview' && gatheredContent.length >= 2 && !loading && (
              <button
                onClick={markReady}
                className="w-full py-3 sm:py-2 text-sm text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 active:bg-purple-100 transition"
              >
                I've shared enough - write my story now
              </button>
            )}

            {phase === 'ready' && !loading && (
              <button
                onClick={writeStory}
                className="w-full py-4 sm:py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 active:scale-[0.98] transition font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Write My Story
              </button>
            )}

            {phase === 'writing' && messages.length > 0 && !loading && (
              <button
                onClick={insertStory}
                className="w-full py-4 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 active:scale-[0.98] transition font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Use This Story
              </button>
            )}

            {/* Text Input */}
            {(phase === 'interview' || phase === 'ready') && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUserResponse()}
                  placeholder="Share more details..."
                  className="flex-1 px-4 py-3 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 text-base"
                  disabled={loading}
                />
                <button
                  onClick={handleUserResponse}
                  disabled={loading || !input.trim()}
                  className="px-5 sm:px-4 py-3 sm:py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 active:bg-purple-700 transition disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
