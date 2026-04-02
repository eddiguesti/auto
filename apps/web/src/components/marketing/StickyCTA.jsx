import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

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
      <div className="bg-heritage-cream/95 backdrop-blur-md border-t border-heritage-sepia-light/40 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <p className="font-serif text-sm sm:text-base text-heritage-ink hidden sm:block">
            Ready to preserve your story?
          </p>
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto font-sans text-sm sm:text-base bg-heritage-cta text-white px-6 py-3 rounded-full hover:bg-heritage-cta-hover transition-colors shadow-md shadow-heritage-cta/20 font-medium"
          >
            Start Your Free Memoir
          </button>
        </div>
      </div>
    </div>
  )
}
