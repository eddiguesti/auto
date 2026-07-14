import { Link, useNavigate } from 'react-router-dom'
import { useState, useRef } from 'react'
import { IconBook2, IconArrowRight, IconChevronRight, IconMail } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { API_URL } from '../../config'
import SEO, { breadcrumbSchema } from '../../components/SEO'
import { Button, Card, Badge } from '../../components/ui'

// All 25 blog posts - SEO optimized for memoir writing keywords
export const blogPosts = [
  {
    id: 1,
    slug: 'how-to-write-memoir-complete-guide',
    title: 'How to Write a Memoir: The Complete 2026 Guide',
    excerpt:
      'Everything you need to know about transforming your life experiences into a compelling narrative that readers will treasure.',
    date: 'January 29, 2026',
    isoDate: '2026-01-29',
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
    isoDate: '2026-01-28',
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
    isoDate: '2026-01-27',
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
    isoDate: '2026-01-26',
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
    isoDate: '2026-01-25',
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
    isoDate: '2026-01-24',
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
    isoDate: '2026-01-23',
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
    isoDate: '2026-01-22',
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
    isoDate: '2026-01-21',
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
    isoDate: '2026-01-20',
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
    isoDate: '2026-01-19',
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
    isoDate: '2026-01-18',
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
    isoDate: '2026-01-17',
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
    isoDate: '2026-01-16',
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
    isoDate: '2026-01-15',
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
    isoDate: '2026-01-14',
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
    isoDate: '2026-01-13',
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
    isoDate: '2026-01-12',
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
    isoDate: '2026-01-11',
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
    isoDate: '2026-01-10',
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
    isoDate: '2026-01-09',
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
    isoDate: '2026-01-08',
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
    isoDate: '2026-01-07',
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
    isoDate: '2026-01-06',
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
    isoDate: '2026-01-05',
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

// Category-based fallback tints — all within the Keepsake surface/bronze ramps
const gradients = {
  Guide: 'from-sepia-200 to-sepia-300',
  'Tips & Guides': 'from-cream to-sepia-200',
  Family: 'from-bronze-100 to-bronze-200',
  Inspiration: 'from-sepia-100 to-sepia-200',
  Wellness: 'from-cream to-sepia-100',
  Craft: 'from-sepia-200 to-sepia-300',
  Publishing: 'from-sepia-100 to-sepia-200',
  Technology: 'from-cream to-sepia-200',
  Education: 'from-sepia-200 to-sepia-300',
  Ethics: 'from-sepia-100 to-sepia-200',
  'Gift Ideas': 'from-bronze-100 to-bronze-200',
  Seniors: 'from-cream to-sepia-100',
  Alternatives: 'from-sepia-100 to-sepia-200'
}

// Blog post image component — loads static images from /blog-images/, falls back to tinted panel
export function BlogImage({ slug, category, className = '', aspect = 'aspect-[16/9]' }) {
  const [loaded, setLoaded] = useState(false)
  const [hasImage, setHasImage] = useState(true)
  const imageSrc = `/blog-images/${slug}.jpg`

  const grad = gradients[category] || gradients.Guide

  return (
    <div className={`${aspect} ${className} overflow-hidden relative bg-gradient-to-br ${grad}`}>
      {/* Tinted fallback (always rendered behind) */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-surface/60 flex items-center justify-center">
            <IconBook2 size={28} stroke={1.5} className="text-sepia-500" />
          </div>
        </div>
      )}
      {/* Actual image (loads on top when available) */}
      {hasImage && (
        <img
          src={imageSrc}
          alt={`Illustration for article: ${slug.replace(/-/g, ' ')}`}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          width="800"
          height="450"
          onLoad={() => setLoaded(true)}
          onError={() => setHasImage(false)}
        />
      )}
    </div>
  )
}

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const { user } = useAuth()
  const navigate = useNavigate()

  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState({ type: '', message: '' })
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [newsletterHoneypot, setNewsletterHoneypot] = useState('')
  const newsletterLoadTime = useRef(Date.now())

  const handleNewsletterSubmit = async e => {
    e.preventDefault()
    setNewsletterStatus({ type: '', message: '' })
    if (newsletterHoneypot) {
      setNewsletterStatus({ type: 'error', message: 'Subscription failed' })
      return
    }
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
      if (!res.ok) throw new Error(data.error || 'Subscription failed')
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

  const blogListSchema = {
    '@type': 'CollectionPage',
    name: 'The Memoir Chronicle - Memoir Writing Blog',
    description: 'Expert guides, tips, and inspiration for writing your life story.',
    url: 'https://easymemoir.co.uk/blog',
    isPartOf: { '@id': 'https://easymemoir.co.uk/#website' },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: blogPosts.map((post, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://easymemoir.co.uk/blog/${post.slug}`,
        name: post.title
      }))
    }
  }

  return (
    <div className="min-h-screen bg-parchment">
      <SEO
        title="Memoir Writing Blog - Tips, Guides & Inspiration"
        description="Expert guides, writing prompts, and inspiration for crafting your autobiography. Learn memoir writing techniques, interview tips, and how to preserve family stories for generations."
        path="/blog"
        jsonLd={[
          blogListSchema,
          breadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Blog', url: '/blog' }
          ])
        ]}
      />

      {/* Header */}
      <header className="bg-ink text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <Link
              to="/"
              className="font-display text-lg text-white hover:text-bronze-300 transition-colors"
            >
              Easy<span className="text-bronze-300">Memoir</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-6 text-sm">
              <Link to="/how-it-works" className="text-white/70 hover:text-white transition-colors">
                How It Works
              </Link>
              <Link to="/pricing" className="text-white/70 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link to="/gift" className="text-white/70 hover:text-white transition-colors">
                Gift
              </Link>
            </nav>
            <Button to={user ? '/home' : '/register'} variant="secondary" size="sm">
              {user ? 'My Stories' : 'Start Writing Free'}
            </Button>
          </div>

          <div className="py-12 sm:py-16 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-12 bg-bronze-400" />
              <p className="text-xs tracking-caps uppercase font-semibold text-bronze-300">
                The Memoir Chronicle
              </p>
              <div className="h-px w-12 bg-bronze-400" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-white mb-4">
              Write Your Story,
              <br />
              <span className="text-bronze-300">Beautifully</span>
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Expert guides, writing prompts, and inspiration for preserving your life story and
              creating a memoir your family will treasure.
            </p>
          </div>
        </div>
      </header>

      {/* Featured Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-10">
        <div className="grid lg:grid-cols-5 gap-6">
          {featuredPosts[0] && (
            <Card
              interactive
              to={`/blog/${featuredPosts[0].slug}`}
              padding="none"
              className="group lg:col-span-3 overflow-hidden"
            >
              <BlogImage
                slug={featuredPosts[0].slug}
                category={featuredPosts[0].category}
                aspect="aspect-[16/10]"
              />
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="bronze">Featured</Badge>
                  <span className="text-sm text-sepia-500">{featuredPosts[0].readTime}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-ink group-hover:text-bronze-700 transition-colors mb-3">
                  {featuredPosts[0].title}
                </h2>
                <p className="text-sepia-600 line-clamp-2">{featuredPosts[0].excerpt}</p>
                <div className="flex items-center gap-2 mt-5 text-sm text-bronze-600 font-medium">
                  Read article
                  <IconArrowRight
                    size={16}
                    stroke={2}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </div>
            </Card>
          )}

          <div className="lg:col-span-2 flex flex-col gap-6">
            {featuredPosts[1] && (
              <Card
                interactive
                to={`/blog/${featuredPosts[1].slug}`}
                padding="none"
                className="group overflow-hidden flex-1"
              >
                <BlogImage
                  slug={featuredPosts[1].slug}
                  category={featuredPosts[1].category}
                  aspect="aspect-[16/9]"
                />
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge>{featuredPosts[1].category}</Badge>
                    <span className="text-xs text-sepia-500">{featuredPosts[1].readTime}</span>
                  </div>
                  <h3 className="font-display text-xl text-ink group-hover:text-bronze-700 transition-colors mb-2">
                    {featuredPosts[1].title}
                  </h3>
                  <p className="text-sm text-sepia-600 line-clamp-2">{featuredPosts[1].excerpt}</p>
                </div>
              </Card>
            )}

            <div className="bg-ink rounded-2xl p-6 text-white">
              <h3 className="font-display text-xl text-white mb-2">Ready to Write Your Story?</h3>
              <p className="text-sm text-white/60 mb-5">
                Just talk about your memories. Our AI transforms your words into a beautiful memoir.
              </p>
              <Button
                variant="accent"
                size="xl"
                onClick={() => navigate(user ? '/voice' : '/register')}
              >
                {user ? 'Continue Your Memoir' : 'Start Free — No Card Required'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-ink text-white shadow-button'
                  : 'bg-surface text-sepia-600 border border-sepia-200 hover:border-sepia-300 hover:text-ink'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Articles Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-2xl text-ink">
            {selectedCategory === 'All' ? 'All Articles' : selectedCategory}
          </h2>
          <span className="text-sm text-sepia-500">{filteredPosts.length} articles</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
            <Card
              key={post.id}
              interactive
              to={`/blog/${post.slug}`}
              padding="none"
              className="group overflow-hidden flex flex-col"
            >
              <BlogImage slug={post.slug} category={post.category} aspect="aspect-[16/10]" />
              <article className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Badge>{post.category}</Badge>
                  <span className="text-xs text-sepia-500">{post.readTime}</span>
                </div>
                <h3 className="font-display text-lg text-ink group-hover:text-bronze-700 transition-colors mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm text-sepia-600 line-clamp-3 flex-1">{post.excerpt}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-sepia-100">
                  <time className="text-xs text-sepia-500" dateTime={post.isoDate}>
                    {post.date}
                  </time>
                  <span className="text-xs text-bronze-600 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Read more
                    <IconChevronRight size={12} stroke={2} />
                  </span>
                </div>
              </article>
            </Card>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sepia-500">No articles in this category yet.</p>
            <button
              onClick={() => setSelectedCategory('All')}
              className="mt-4 text-bronze-600 hover:text-bronze-700 hover:underline text-sm font-medium transition-colors"
            >
              View all articles
            </button>
          </div>
        )}
      </section>

      {/* Newsletter */}
      <section className="bg-ink py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-bronze-500/20 flex items-center justify-center mx-auto mb-6">
            <IconMail size={24} stroke={1.5} className="text-bronze-300" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl text-white mb-4">
            Subscribe to The Chronicle
          </h2>
          <p className="text-white/60 mb-8">
            Get weekly tips on memoir writing, inspiring stories, and exclusive content delivered to
            your inbox.
          </p>
          <form
            onSubmit={handleNewsletterSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
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
              className="flex-1 px-5 py-3.5 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-bronze-400 focus:border-transparent"
              required
              aria-label="Email address for newsletter"
            />
            <Button type="submit" variant="accent" size="lg" loading={newsletterLoading}>
              {newsletterLoading ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
          {newsletterStatus.message && (
            <p
              className={`text-sm mt-4 ${newsletterStatus.type === 'success' ? 'text-success-soft' : 'text-error-soft'}`}
            >
              {newsletterStatus.message}
            </p>
          )}
          <p className="text-xs text-white/30 mt-5">
            No spam, unsubscribe anytime. Read our{' '}
            <Link to="/privacy" className="underline hover:text-white/50 transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 px-4 bg-cream">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-5xl text-ink mb-6">
            Your Life Story Deserves
            <br />
            to Be Told
          </h2>
          <p className="text-lg text-sepia-600 mb-10 max-w-2xl mx-auto">
            Don't let your memories fade away. Easy Memoir makes it simple to transform your
            experiences into a beautiful book your family will treasure forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate(user ? '/voice' : '/register')}>
              {user ? 'Continue Your Memoir' : 'Start Your Free Memoir'}
            </Button>
            <Button to="/sample" variant="secondary" size="lg">
              See a Sample
            </Button>
          </div>
          <p className="text-sm text-sepia-500 mt-6">
            Free to start &bull; No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div className="lg:col-span-2">
              <div className="font-display text-2xl mb-4">
                Easy<span className="text-bronze-300">Memoir</span>
              </div>
              <p className="text-sm text-white/50 max-w-sm">
                Helping families preserve their stories for future generations through AI-powered
                memoir writing.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white/80">Product</h4>
              <ul className="space-y-3 text-sm text-white/50">
                <li>
                  <Link to="/how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/sample" className="hover:text-white transition-colors">
                    Sample Memoir
                  </Link>
                </li>
                <li>
                  <Link to="/gift" className="hover:text-white transition-colors">
                    Gift a Memoir
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white/80">Company</h4>
              <ul className="space-y-3 text-sm text-white/50">
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-white transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="hover:text-white transition-colors">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/30">
              &copy; 2026 Easy Memoir Ltd. All rights reserved.
            </p>
            <p className="text-xs text-white/20">Made with care in the United Kingdom</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
