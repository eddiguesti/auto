import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { IconMessageCircle, IconX, IconSend, IconLoader2, IconHeadset } from '@tabler/icons-react'

// Quick help topics
const QUICK_TOPICS = [
  { id: 'login', label: 'Login issues', icon: '🔐' },
  { id: 'export', label: 'Export my book', icon: '📖' },
  { id: 'cover', label: 'Cover design', icon: '🎨' },
  { id: 'voice', label: 'Voice features', icon: '🎤' },
  { id: 'pricing', label: 'Pricing info', icon: '💰' },
  { id: 'order', label: 'Order status', icon: '📦' }
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
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return

    const userMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userEmail: user?.email,
          userName: user?.name,
          conversationHistory: messages.slice(-6) // Last 6 messages for context
        })
      })

      const data = await res.json()

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
          content: "Sorry, I'm having trouble connecting. Please try again or email us at support@easymemoir.co.uk"
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickTopic = (topic) => {
    const questions = {
      login: "I'm having trouble logging in",
      export: "How do I export my memoir as a book?",
      cover: "How do I design my book cover?",
      voice: "How do I use the voice feature?",
      pricing: "What are the book pricing options?",
      order: "Where is my order?"
    }
    sendMessage(questions[topic] || topic)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const requestHumanSupport = () => {
    sendMessage("I'd like to speak to a real person please")
  }

  return (
    <>
      {/* Chat bubble button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-sepia hover:bg-sepia/90 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
        aria-label="Open help chat"
      >
        <IconMessageCircle size={26} />
        {/* Notification dot */}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full text-[10px] flex items-center justify-center text-amber-900 font-bold">
          ?
        </span>
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-100px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-sepia to-sepia/80 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <IconMessageCircle size={22} />
            </div>
            <div>
              <h3 className="font-medium">Help & Support</h3>
              <p className="text-xs text-white/70">We typically reply instantly</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center transition"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-sepia text-white rounded-br-sm'
                    : 'bg-white text-ink shadow-sm rounded-bl-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.escalated && (
                  <p className="text-xs mt-2 opacity-70 flex items-center gap-1">
                    <IconHeadset size={12} />
                    Support notified
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Quick topics (only show at start) */}
          {messages.length === 1 && messages[0].quick && (
            <div className="flex flex-wrap gap-2">
              {QUICK_TOPICS.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => handleQuickTopic(topic.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-sepia/20 rounded-full text-xs text-sepia hover:bg-sepia/5 transition"
                >
                  <span>{topic.icon}</span>
                  {topic.label}
                </button>
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <IconLoader2 size={18} className="animate-spin text-sepia" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-gray-100">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-sepia/30"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-sepia text-white rounded-full flex items-center justify-center hover:bg-sepia/90 disabled:opacity-40 transition"
            >
              <IconSend size={18} />
            </button>
          </form>

          {/* Human support button */}
          <button
            onClick={requestHumanSupport}
            className="w-full mt-2 text-xs text-sepia/60 hover:text-sepia flex items-center justify-center gap-1 py-1 transition"
          >
            <IconHeadset size={14} />
            Talk to a real person
          </button>
        </div>
      </div>
    </>
  )
}
