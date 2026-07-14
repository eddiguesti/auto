import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui'

const MARKETING_PATHS = ['/', '/how-it-works', '/blog']
const SCROLL_THRESHOLD = 600

/**
 * StickyCTA - Sticky bottom bar with CTA button.
 * Appears after scrolling past 600px, hides when footer is visible.
 * Only renders on marketing pages.
 */
export default function StickyCTA() {
  const [visible, setVisible] = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)
  const navigate = useNavigate()

  const isMarketingPage = MARKETING_PATHS.includes(window.location.pathname)

  const handleScroll = useCallback(() => {
    setVisible(window.scrollY > SCROLL_THRESHOLD)
  }, [])

  useEffect(() => {
    if (!isMarketingPage) return

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMarketingPage, handleScroll])

  useEffect(() => {
    if (!isMarketingPage) return

    const footer = document.querySelector('footer')
    if (!footer) return

    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), {
      threshold: 0.1
    })

    observer.observe(footer)
    return () => observer.disconnect()
  }, [isMarketingPage])

  if (!isMarketingPage) return null

  const shouldShow = visible && !footerVisible

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-500 ease-out ${
        shouldShow ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-surface/95 backdrop-blur-md border-t border-sepia-200/70 shadow-lifted">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 pb-safe flex items-center justify-between gap-4">
          <p className="text-sm sm:text-base text-ink font-medium hidden sm:block">
            Ready to preserve your story?
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto"
          >
            Start your free memoir
          </Button>
        </div>
      </div>
    </div>
  )
}
