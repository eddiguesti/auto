import { useState, useRef, useEffect } from 'react'
import {
  IconMessageCircle,
  IconX,
  IconSend,
  IconHeadset,
  IconLock,
  IconBook2,
  IconPalette,
  IconMicrophone,
  IconCurrencyPound,
  IconPackage
} from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { Button, Input } from './ui'

// Quick help topics
const QUICK_TOPICS = [
  { id: 'login', label: 'Login issues', icon: IconLock },
  { id: 'export', label: 'Export my book', icon: IconBook2 },
  { id: 'cover', label: 'Cover design', icon: IconPalette },
  { id: 'voice', label: 'Voice features', icon: IconMicrophone },
  { id: 'pricing', label: 'Pricing info', icon: IconCurrencyPound },
  { id: 'order', label: 'Order status', icon: IconPackage }
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

      const res = await fetch('/api/v1/support/chat', {
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
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 group transition-all duration-300 ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
        aria-label="Open help chat"
      >
        {/* Main button */}
        <span className="relative flex items-center justify-center w-14 h-14 bg-ink text-white rounded-full shadow-lifted group-hover:scale-105 transition-transform duration-200">
          <IconMessageCircle size={24} stroke={1.5} />

          {/* Status dot */}
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-success rounded-full border-2 border-surface" />
        </span>

        {/* Tooltip */}
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-ink text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lifted pointer-events-none">
          Need help?
          <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-ink" />
        </span>
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-80px)] z-50 transition-all duration-300 ease-out ${
          isOpen
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-95 opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="h-full bg-surface border border-sepia-200/70 rounded-2xl shadow-modal flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-sepia-200/70">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-bronze-100 text-bronze-700 flex items-center justify-center">
                <IconMessageCircle size={24} stroke={1.5} />
              </div>

              <div>
                <h3 className="font-display text-lg text-ink">Hi there!</h3>
                <p className="text-sm text-sepia-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-success rounded-full" />
                  Usually replies instantly
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close help chat"
              className="shrink-0 p-2 rounded-full text-sepia-400 hover:text-ink hover:bg-sepia-100/70 transition-colors"
            >
              <IconX size={20} stroke={1.75} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-cream/60">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeSlideUp`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-ink text-white rounded-2xl rounded-br-md'
                      : 'bg-sepia-100 text-ink rounded-2xl rounded-bl-md'
                  }`}
                >
                  <p className="text-base leading-relaxed">{msg.content}</p>
                  {msg.escalated && (
                    <p className="text-xs mt-2 text-sepia-600 flex items-center gap-1.5 pt-2 border-t border-ink/10">
                      <IconHeadset size={16} stroke={1.75} />
                      Support team notified
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Quick topics */}
            {messages.length === 1 && messages[0].quick && (
              <div className="pt-2">
                <p className="eyebrow mb-3">Popular topics</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_TOPICS.map(topic => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => handleQuickTopic(topic.id)}
                      className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-sepia-200 hover:border-sepia-300 hover:shadow-soft transition-all text-left"
                    >
                      <span className="w-10 h-10 rounded-xl bg-sepia-100 text-sepia-600 flex items-center justify-center shrink-0">
                        <topic.icon size={20} stroke={1.75} />
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
                <div className="bg-sepia-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 bg-sepia-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-sepia-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-sepia-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-sepia-200/70">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your question..."
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="!p-3 shrink-0"
                icon={<IconSend size={20} stroke={1.75} />}
              />
            </form>

            {/* Human support link */}
            <Button
              variant="ghost"
              size="sm"
              onClick={requestHumanSupport}
              className="w-full mt-2"
              icon={<IconHeadset size={16} stroke={1.75} />}
            >
              Talk to a real person
            </Button>
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
