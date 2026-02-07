import { Link, useNavigate } from 'react-router-dom'
import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

// All 25 blog posts - SEO optimized for memoir writing keywords
const blogPosts = [
  {
    id: 1,
    slug: 'how-to-write-memoir-complete-guide',
    title: 'How to Write a Memoir: The Complete 2026 Guide',
    excerpt:
      'Everything you need to know about transforming your life experiences into a compelling narrative that readers will treasure.',
    date: 'January 29, 2026',
    category: 'Guide',
    readTime: '15 min read',
    featured: true
  },
  {
    id: 2,
    slug: 'memoir-vs-autobiography-difference',
    title: 'Memoir vs Autobiography: Understanding the Key Differences',
    excerpt:
      'Learn the crucial distinctions between memoir and autobiography to decide which format best suits your story.',
    date: 'January 28, 2026',
    category: 'Education',
    readTime: '8 min read',
    featured: false
  },
  {
    id: 3,
    slug: 'therapeutic-benefits-writing-life-story',
    title: 'The Healing Power of Writing Your Life Story',
    excerpt:
      'Discover the scientifically-proven therapeutic benefits of writing about your life experiences and transforming pain into wisdom.',
    date: 'January 27, 2026',
    category: 'Wellness',
    readTime: '10 min read',
    featured: false
  },
  {
    id: 4,
    slug: 'writing-prompts-unlock-memories',
    title: '50 Powerful Writing Prompts to Unlock Your Memories',
    excerpt:
      'Use these carefully crafted prompts to unlock forgotten memories and discover stories worth telling.',
    date: 'January 26, 2026',
    category: 'Tips & Guides',
    readTime: '12 min read',
    featured: false
  },
  {
    id: 5,
    slug: 'interview-parents-grandparents-guide',
    title: 'How to Interview Your Parents and Grandparents',
    excerpt:
      "A step-by-step guide to conducting meaningful interviews that preserve your family's priceless stories.",
    date: 'January 25, 2026',
    category: 'Family',
    readTime: '11 min read',
    featured: false
  },
  {
    id: 6,
    slug: 'memoir-writing-seniors-guide',
    title: 'Memoir Writing for Seniors: Never Too Late to Share Your Story',
    excerpt:
      "You have decades of wisdom and perspective. Here's how to transform that into a meaningful memoir.",
    date: 'January 24, 2026',
    category: 'Seniors',
    readTime: '9 min read',
    featured: false
  },
  {
    id: 7,
    slug: 'common-memoir-mistakes-avoid',
    title: '10 Common Memoir Mistakes (And How to Avoid Them)',
    excerpt:
      "First-time memoir writers often make the same mistakes. Here's how to sidestep them and write better.",
    date: 'January 23, 2026',
    category: 'Tips & Guides',
    readTime: '10 min read',
    featured: false
  },
  {
    id: 8,
    slug: 'memoir-structure-outline-guide',
    title: 'How to Structure Your Memoir: A Complete Guide',
    excerpt: 'From chaotic memories to organized narrative—the outlining process demystified.',
    date: 'January 22, 2026',
    category: 'Guide',
    readTime: '12 min read',
    featured: false
  },
  {
    id: 9,
    slug: 'finding-your-authentic-voice',
    title: 'Finding Your Authentic Voice in Memoir Writing',
    excerpt:
      "Your unique voice is your memoir's greatest asset. Here's how to discover and develop it.",
    date: 'January 21, 2026',
    category: 'Craft',
    readTime: '9 min read',
    featured: false
  },
  {
    id: 10,
    slug: 'writing-dialogue-memoir',
    title: "How to Write Dialogue in Memoir When You Can't Remember Exact Words",
    excerpt: "You can't remember every word. Here's how to write authentic dialogue anyway.",
    date: 'January 20, 2026',
    category: 'Craft',
    readTime: '8 min read',
    featured: false
  },
  {
    id: 11,
    slug: 'best-memoirs-read-inspiration',
    title: 'The 15 Best Memoirs to Read for Inspiration',
    excerpt:
      "Learn from the masters of the genre. These celebrated memoirs show what's possible when life meets craft.",
    date: 'January 19, 2026',
    category: 'Inspiration',
    readTime: '10 min read',
    featured: false
  },
  {
    id: 12,
    slug: 'ethical-writing-about-family',
    title: 'The Ethics of Writing About Family Members',
    excerpt:
      'How to tell your truth while respecting others—a guide to the thorniest memoir challenge.',
    date: 'January 18, 2026',
    category: 'Ethics',
    readTime: '11 min read',
    featured: false
  },
  {
    id: 13,
    slug: 'gift-memoir-parents-grandparents',
    title: 'The Perfect Gift: Helping Parents or Grandparents Write Their Memoir',
    excerpt: 'Why helping someone write their life story is the most meaningful gift you can give.',
    date: 'January 17, 2026',
    category: 'Gift Ideas',
    readTime: '7 min read',
    featured: false
  },
  {
    id: 14,
    slug: 'using-photos-memoir',
    title: 'How to Use Photos to Enhance Your Memoir',
    excerpt:
      "Photographs can unlock memories and enrich your memoir. Here's how to use them effectively.",
    date: 'January 16, 2026',
    category: 'Tips & Guides',
    readTime: '8 min read',
    featured: false
  },
  {
    id: 15,
    slug: 'ai-memoir-writing-future',
    title: 'How AI is Transforming Memoir Writing',
    excerpt: "AI isn't replacing human storytelling—it's making it accessible to everyone.",
    date: 'January 15, 2026',
    category: 'Technology',
    readTime: '9 min read',
    featured: false
  },
  {
    id: 16,
    slug: 'overcoming-writers-block-memoir',
    title: "Overcoming Writer's Block in Memoir Writing",
    excerpt: "Every memoir writer faces stuck points. Here's how to push through and keep writing.",
    date: 'January 14, 2026',
    category: 'Tips & Guides',
    readTime: '8 min read',
    featured: false
  },
  {
    id: 17,
    slug: 'self-publishing-memoir-guide',
    title: 'Self-Publishing Your Memoir: A Complete Guide',
    excerpt:
      'From finished manuscript to printed book—everything you need to know about self-publishing.',
    date: 'January 13, 2026',
    category: 'Publishing',
    readTime: '11 min read',
    featured: false
  },
  {
    id: 18,
    slug: 'writing-about-trauma-responsibly',
    title: 'Writing About Trauma: A Guide to Doing It Responsibly',
    excerpt: 'How to share painful experiences without retraumatizing yourself or your readers.',
    date: 'January 12, 2026',
    category: 'Wellness',
    readTime: '10 min read',
    featured: false
  },
  {
    id: 19,
    slug: 'memoir-life-chapters-approach',
    title: 'The Life Chapters Approach to Memoir Writing',
    excerpt:
      'Breaking your life into manageable, meaningful segments makes memoir writing less overwhelming.',
    date: 'January 11, 2026',
    category: 'Guide',
    readTime: '8 min read',
    featured: false
  },
  {
    id: 20,
    slug: 'preserving-family-stories',
    title: 'Preserving Family Stories for Future Generations',
    excerpt:
      'Your memories are their heritage. Why documenting family history matters—and how to do it.',
    date: 'January 10, 2026',
    category: 'Family',
    readTime: '9 min read',
    featured: false
  },
  {
    id: 21,
    slug: 'memoir-book-design-tips',
    title: 'Designing Your Memoir Book: Cover and Interior Tips',
    excerpt:
      "Your memoir deserves a design that honors its contents. Here's how to make it beautiful.",
    date: 'January 9, 2026',
    category: 'Publishing',
    readTime: '8 min read',
    featured: false
  },
  {
    id: 22,
    slug: 'short-memoir-vs-full-book',
    title: 'Short Memoir vs Full Book: Which Is Right for You?',
    excerpt:
      'Not every life story needs 300 pages. Sometimes a focused, shorter memoir is more powerful.',
    date: 'January 8, 2026',
    category: 'Guide',
    readTime: '7 min read',
    featured: false
  },
  {
    id: 23,
    slug: 'legacy-letters-alternative-memoir',
    title: 'Legacy Letters: An Alternative to Traditional Memoir',
    excerpt: 'Direct messages to future generations—a meaningful alternative to narrative memoir.',
    date: 'January 7, 2026',
    category: 'Alternatives',
    readTime: '7 min read',
    featured: false
  },
  {
    id: 24,
    slug: 'memoir-questions-family-ask',
    title: '100 Questions to Ask Your Family for Their Memoirs',
    excerpt:
      "Conversation starters that unlock a lifetime of stories your family members didn't know they had.",
    date: 'January 6, 2026',
    category: 'Family',
    readTime: '14 min read',
    featured: false
  },
  {
    id: 25,
    slug: 'why-your-story-matters',
    title: 'Why Your Story Matters (Yes, Yours)',
    excerpt:
      "You don't need to be famous to have a story worth telling. Ordinary lives hold extraordinary meaning.",
    date: 'January 5, 2026',
    category: 'Inspiration',
    featured: true,
    readTime: '8 min read'
  }
]

const categories = [
  'All',
  'Guide',
  'Tips & Guides',
  'Family',
  'Inspiration',
  'Wellness',
  'Craft',
  'Publishing',
  'Technology',
  'Education',
  'Ethics',
  'Gift Ideas',
  'Seniors',
  'Alternatives'
]

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const { user } = useAuth()
  const navigate = useNavigate()

  // Newsletter form state
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState({ type: '', message: '' })
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [newsletterHoneypot, setNewsletterHoneypot] = useState('')
  const newsletterLoadTime = useRef(Date.now())

  const handleNewsletterSubmit = async e => {
    e.preventDefault()
    setNewsletterStatus({ type: '', message: '' })

    // Bot protection: reject if honeypot is filled
    if (newsletterHoneypot) {
      setNewsletterStatus({ type: 'error', message: 'Subscription failed' })
      return
    }

    // Bot protection: reject if form submitted too quickly
    const timeOnPage = Date.now() - newsletterLoadTime.current
    if (timeOnPage < 3000) {
      setNewsletterStatus({ type: 'error', message: 'Please take your time' })
      return
    }

    if (!newsletterEmail.trim()) {
      setNewsletterStatus({ type: 'error', message: 'Please enter your email address' })
      return
    }

    setNewsletterLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newsletterEmail,
          _hp: newsletterHoneypot,
          _ts: newsletterLoadTime.current
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Subscription failed')
      }

      setNewsletterStatus({ type: 'success', message: data.message })
      setNewsletterEmail('')
    } catch (err) {
      setNewsletterStatus({ type: 'error', message: err.message })
    } finally {
      setNewsletterLoading(false)
    }
  }

  const featuredPosts = blogPosts.filter(p => p.featured)
  const filteredPosts =
    selectedCategory === 'All'
      ? blogPosts.filter(p => !p.featured)
      : blogPosts.filter(p => p.category === selectedCategory && !p.featured)

  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      {/* Newspaper Header */}
      <header className="bg-[#1a1a1a] text-white">
        <div className="max-w-6xl mx-auto px-4">
          {/* Top bar */}
          <div className="flex items-center justify-between py-2 border-b border-white/10 text-xs">
            <span className="font-sans tracking-wider uppercase">Est. 2026</span>
            <Link to="/" className="font-display text-lg">
              Easy<span className="text-[#c4a77d]">Memoir</span>
            </Link>
            <span className="font-sans tracking-wider uppercase">Vol. I, No. 1</span>
          </div>

          {/* Main masthead */}
          <div className="py-8 text-center border-b border-white/20">
            <h1
              className="font-display text-5xl sm:text-7xl tracking-wide"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              The Memoir Chronicle
            </h1>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="h-px flex-1 max-w-[100px] bg-white/30"></div>
              <p className="font-sans text-xs tracking-[0.3em] uppercase text-white/60">
                Preserving Lives, One Story at a Time
              </p>
              <div className="h-px flex-1 max-w-[100px] bg-white/30"></div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center justify-center gap-6 sm:gap-8 py-3 text-sm flex-wrap">
            <Link to="/" className="hover:text-[#c4a77d] transition">
              Home
            </Link>
            <Link to="/how-it-works" className="hover:text-[#c4a77d] transition">
              How It Works
            </Link>
            <Link
              to={user ? '/home' : '/register'}
              className="bg-[#c4a77d] text-[#1a1a1a] px-4 py-1.5 rounded hover:bg-[#b39669] transition"
            >
              {user ? 'My Stories' : 'Start Writing'}
            </Link>
          </nav>
        </div>
      </header>

      {/* Featured Section */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Main Featured */}
          {featuredPosts[0] && (
            <Link
              to={`/blog/${featuredPosts[0].slug}`}
              className="group relative bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-[#1a1a1a] to-[#3d3d3d] flex items-center justify-center">
                <div className="text-center text-white/80 p-8">
                  <span className="text-6xl mb-4 block" style={{ fontFamily: 'Georgia, serif' }}>
                    "
                  </span>
                  <p className="font-serif text-xl italic">Every life is a story worth telling</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-[#c4a77d] text-white text-xs font-medium rounded">
                    Featured
                  </span>
                  <span className="text-sm text-[#888]">{featuredPosts[0].readTime}</span>
                </div>
                <h2
                  className="font-display text-2xl sm:text-3xl text-[#1a1a1a] group-hover:text-[#8b7355] transition mb-3"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {featuredPosts[0].title}
                </h2>
                <p className="font-serif text-[#666] leading-relaxed">{featuredPosts[0].excerpt}</p>
                <p className="text-sm text-[#888] mt-4">{featuredPosts[0].date}</p>
              </div>
            </Link>
          )}

          {/* Secondary Featured + CTA */}
          <div className="flex flex-col gap-8">
            {featuredPosts[1] && (
              <Link
                to={`/blog/${featuredPosts[1].slug}`}
                className="group bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition flex-1"
              >
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-[#8b7355] text-white text-xs font-medium rounded">
                      {featuredPosts[1].category}
                    </span>
                    <span className="text-sm text-[#888]">{featuredPosts[1].readTime}</span>
                  </div>
                  <h3
                    className="font-display text-xl text-[#1a1a1a] group-hover:text-[#8b7355] transition mb-3"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {featuredPosts[1].title}
                  </h3>
                  <p className="font-serif text-[#666] text-sm leading-relaxed flex-1">
                    {featuredPosts[1].excerpt}
                  </p>
                  <p className="text-sm text-[#888] mt-4">{featuredPosts[1].date}</p>
                </div>
              </Link>
            )}

            {/* CTA Card */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-lg p-6 text-white">
              <h3 className="font-display text-xl mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                Ready to Write Your Story?
              </h3>
              <p className="font-serif text-sm text-white/70 mb-4">
                Just talk about your memories. Our AI transforms your words into a beautiful memoir.
              </p>
              <button
                onClick={() => navigate(user ? '/voice' : '/register')}
                className="w-full bg-[#c4a77d] text-[#1a1a1a] py-3 rounded font-sans font-medium hover:bg-[#b39669] transition"
              >
                {user ? 'Continue Your Memoir' : 'Start Free'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="flex flex-wrap gap-2 justify-center py-6 border-y-2 border-[#1a1a1a]">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-sans transition ${
                selectedCategory === cat
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-white text-[#666] hover:bg-[#eee] border border-[#ddd]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Articles Grid - Newspaper Style */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2
          className="font-display text-2xl text-[#1a1a1a] mb-8 text-center"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {selectedCategory === 'All' ? 'All Articles' : selectedCategory}
        </h2>

        {/* Multi-column newspaper layout */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, index) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className={`group bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition ${
                index === 0 ? 'md:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <article className="p-5 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-[#f0ebe3] text-[#8b7355] text-xs rounded">
                    {post.category}
                  </span>
                  <span className="text-xs text-[#999]">{post.readTime}</span>
                </div>
                <h3
                  className="font-display text-lg text-[#1a1a1a] group-hover:text-[#8b7355] transition mb-2 line-clamp-2"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {post.title}
                </h3>
                <p className="font-serif text-sm text-[#666] line-clamp-3 flex-1 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#eee]">
                  <span className="text-xs text-[#999]">{post.date}</span>
                  <span className="text-xs text-[#c4a77d] group-hover:translate-x-1 transition-transform">
                    Read more &rarr;
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="bg-[#1a1a1a] py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2
            className="font-display text-3xl text-white mb-4"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Subscribe to The Chronicle
          </h2>
          <p className="font-serif text-white/70 mb-8">
            Get weekly tips on memoir writing, inspiring stories, and exclusive content delivered to
            your inbox.
          </p>
          <form
            onSubmit={handleNewsletterSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            {/* Honeypot field - hidden from users */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <input
                type="text"
                name="website"
                value={newsletterHoneypot}
                onChange={e => setNewsletterHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <input
              type="email"
              placeholder="Your email address"
              value={newsletterEmail}
              onChange={e => setNewsletterEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#c4a77d]"
              required
            />
            <button
              type="submit"
              disabled={newsletterLoading}
              className="px-6 py-3 bg-[#c4a77d] text-[#1a1a1a] rounded font-sans font-medium hover:bg-[#b39669] transition disabled:opacity-50"
            >
              {newsletterLoading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
          {newsletterStatus.message && (
            <p
              className={`text-sm mt-4 ${newsletterStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}
            >
              {newsletterStatus.message}
            </p>
          )}
          <p className="text-xs text-white/40 mt-4">
            No spam, unsubscribe anytime. Read our{' '}
            <Link to="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-gradient-to-b from-[#f8f5f0] to-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="font-display text-3xl sm:text-4xl text-[#1a1a1a] mb-6"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Your Life Story Deserves to Be Told
          </h2>
          <p className="font-serif text-lg text-[#666] mb-8 leading-relaxed">
            Don't let your memories fade away. Easy Memoir makes it simple to transform your
            experiences into a beautiful book your family will treasure forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(user ? '/voice' : '/register')}
              className="bg-[#1a1a1a] text-white px-8 py-4 rounded-full font-sans hover:bg-[#333] transition"
            >
              {user ? 'Continue Your Memoir' : 'Start Your Free Memoir'}
            </button>
            <Link
              to="/how-it-works"
              className="border-2 border-[#1a1a1a] text-[#1a1a1a] px-8 py-4 rounded-full font-sans hover:bg-[#1a1a1a] hover:text-white transition"
            >
              See How It Works
            </Link>
          </div>
          <p className="text-sm text-[#999] mt-6">Free to start &bull; No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-white py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            <div className="sm:col-span-2">
              <div className="font-display text-xl mb-3">
                Easy<span className="text-[#c4a77d]">Memoir</span>
              </div>
              <p className="font-sans text-sm text-white/60 max-w-xs">
                Helping families preserve their stories for future generations through AI-powered
                memoir writing.
              </p>
            </div>
            <div>
              <h4 className="font-sans text-sm font-medium mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>
                  <Link to="/how-it-works" className="hover:text-white transition">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="hover:text-white transition">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-white transition">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-sans text-sm font-medium mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>
                  <Link to="/privacy" className="hover:text-white transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-white transition">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="hover:text-white transition">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-sans text-sm text-white/40">
              &copy; 2026 Easy Memoir Ltd. All rights reserved.
            </p>
            <p className="font-sans text-xs text-white/30">Made with care in the United Kingdom</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
