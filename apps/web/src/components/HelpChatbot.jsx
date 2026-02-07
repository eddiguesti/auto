import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

// Quick help topics with better icons
const QUICK_TOPICS = [
  { id: 'login', label: 'Login issues', icon: '🔐', color: 'from-violet-500 to-purple-600' },
  { id: 'export', label: 'Export my book', icon: '📖', color: 'from-emerald-500 to-teal-600' },
  { id: 'cover', label: 'Cover design', icon: '🎨', color: 'from-pink-500 to-rose-600' },
  { id: 'voice', label: 'Voice features', icon: '🎤', color: 'from-amber-500 to-orange-600' },
  { id: 'pricing', label: 'Pricing info', icon: '💰', color: 'from-green-500 to-emerald-600' },
  { id: 'order', label: 'Order status', icon: '📦', color: 'from-blue-500 to-indigo-600' }
]

export default function HelpChatbot() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm here to help with your memoir. What can I assist you with today?",
      quick: true
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Abort in-flight requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const sendMessage = async text => {
    if (!text.trim() || loading) return

    const userMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setIsTyping(true)

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userEmail: user?.email,
          userName: user?.name,
          conversationHistory: messages.slice(-6)
        }),
        signal: abortControllerRef.current.signal
      })

      const data = await res.json()

      // Simulate typing delay for more natural feel
      await new Promise(resolve => setTimeout(resolve, 500))

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          escalated: data.escalated
        }
      ])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            "Sorry, I'm having trouble connecting. Please try again or email us at support@easymemoir.co.uk"
        }
      ])
    } finally {
      setLoading(false)
      setIsTyping(false)
    }
  }

  const handleQuickTopic = topic => {
    const questions = {
      login: "I'm having trouble logging in",
      export: 'How do I export my memoir as a book?',
      cover: 'How do I design my book cover?',
      voice: 'How do I use the voice feature?',
      pricing: 'What are the book pricing options?',
      order: 'Where is my order?'
    }
    sendMessage(questions[topic] || topic)
  }

  const handleSubmit = e => {
    e.preventDefault()
    sendMessage(input)
  }

  const requestHumanSupport = () => {
    sendMessage("I'd like to speak to a real person please")
  }

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 group transition-all duration-500 ${
          isOpen ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
        }`}
        aria-label="Open help chat"
      >
        {/* Pulse rings */}
        <span className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
        <span className="absolute inset-[-4px] rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 animate-pulse" />

        {/* Main button */}
        <span className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full shadow-lg shadow-amber-500/30 group-hover:shadow-xl group-hover:shadow-amber-500/40 group-hover:scale-105 transition-all">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>

          {/* Status dot */}
          <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
          </span>
        </span>

        {/* Tooltip */}
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-ink text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none">
          Need help?
          <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-ink" />
        </span>
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-80px)] z-50 transition-all duration-500 ease-out ${
          isOpen
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-90 opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="h-full bg-white rounded-3xl shadow-2xl shadow-ink/20 flex flex-col overflow-hidden border border-sepia/10">
          {/* Header */}
          <div className="relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600" />

            {/* Decorative shapes */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            {/* Content */}
            <div className="relative px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
                    <span className="text-2xl">💬</span>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-amber-500" />
                </div>

                <div className="text-white">
                  <h3 className="font-display text-lg">Hi there!</h3>
                  <p className="text-sm text-white/80 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Usually replies instantly
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition-all hover:rotate-90"
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
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-amber-50/50 to-white">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeSlideUp`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Assistant avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mr-2 flex-shrink-0 shadow-sm">
                    <span className="text-sm">✨</span>
                  </div>
                )}

                <div
                  className={`max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl rounded-br-md shadow-md shadow-amber-500/20'
                      : 'bg-white text-ink rounded-2xl rounded-bl-md shadow-md border border-sepia/5'
                  } px-4 py-3`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  {msg.escalated && (
                    <p className="text-xs mt-2 opacity-80 flex items-center gap-1.5 pt-2 border-t border-white/20">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      Support team notified
                    </p>
                  )}
                </div>

                {/* User avatar */}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-sepia/10 flex items-center justify-center ml-2 flex-shrink-0">
                    <span className="text-sm">👤</span>
                  </div>
                )}
              </div>
            ))}

            {/* Quick topics - Show in a nicer grid */}
            {messages.length === 1 && messages[0].quick && (
              <div className="pt-2">
                <p className="text-xs text-warmgray mb-3 font-medium">Popular topics</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_TOPICS.map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => handleQuickTopic(topic.id)}
                      className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-sepia/10 hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/10 transition-all text-left"
                    >
                      <span
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${topic.color} flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform`}
                      >
                        {topic.icon}
                      </span>
                      <span className="text-sm text-ink font-medium">{topic.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start animate-fadeSlideUp">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mr-2 flex-shrink-0 shadow-sm">
                  <span className="text-sm">✨</span>
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md shadow-md border border-sepia/5 px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-sepia/10">
            <form onSubmit={handleSubmit} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your question..."
                className="w-full pl-5 pr-14 py-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:bg-white border border-transparent focus:border-amber-500/30 transition-all"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl flex items-center justify-center hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:hover:from-amber-500 disabled:hover:to-amber-600 transition-all shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 disabled:shadow-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </form>

            {/* Human support link */}
            <button
              onClick={requestHumanSupport}
              className="w-full mt-3 py-2 text-sm text-warmgray hover:text-amber-600 flex items-center justify-center gap-2 transition-colors group"
            >
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Talk to a real person
            </button>
          </div>
        </div>
      </div>

      {/* Custom animation styles */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeSlideUp {
          animation: fadeSlideUp 0.3s ease-out forwards;
        }
      `}</style>
    </>
  )
}
