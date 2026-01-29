import { Link } from 'react-router-dom'

// Sample blog posts - in production these would come from a CMS or database
const blogPosts = [
  {
    id: 1,
    slug: 'why-write-your-life-story',
    title: 'Why Writing Your Life Story Matters More Than Ever',
    excerpt: 'In an age of fleeting social media posts, creating a lasting memoir for your family has never been more important. Discover why preserving your memories is a gift to future generations.',
    date: 'January 28, 2026',
    category: 'Inspiration',
    readTime: '5 min read',
    featured: true
  },
  {
    id: 2,
    slug: 'tips-for-unlocking-memories',
    title: '10 Tips for Unlocking Forgotten Memories',
    excerpt: 'Struggling to remember details from your past? These proven techniques will help you recall vivid memories you thought were lost forever.',
    date: 'January 25, 2026',
    category: 'Tips & Guides',
    readTime: '7 min read',
    featured: false
  },
  {
    id: 3,
    slug: 'gift-of-memoir',
    title: 'The Perfect Gift: Giving Someone Their Own Memoir',
    excerpt: "Looking for a meaningful gift for a parent or grandparent? Help them create their autobiography - a gift that truly lasts forever.",
    date: 'January 20, 2026',
    category: 'Gift Ideas',
    readTime: '4 min read',
    featured: false
  },
  {
    id: 4,
    slug: 'ai-meets-autobiography',
    title: 'How AI is Revolutionizing Autobiography Writing',
    excerpt: 'Modern AI can now help capture your authentic voice while polishing your prose. Learn how technology is making memoir writing accessible to everyone.',
    date: 'January 15, 2026',
    category: 'Technology',
    readTime: '6 min read',
    featured: false
  },
  {
    id: 5,
    slug: 'what-to-include-in-memoir',
    title: 'What Should You Include in Your Memoir?',
    excerpt: "Not sure what stories to tell? Here's a guide to choosing the moments, people, and experiences that make your autobiography meaningful.",
    date: 'January 10, 2026',
    category: 'Tips & Guides',
    readTime: '8 min read',
    featured: false
  },
  {
    id: 6,
    slug: 'easy-memoir-launch',
    title: 'Introducing Easy Memoir: Your Life Story, Beautifully Told',
    excerpt: "We're excited to launch Easy Memoir - an AI-powered platform that makes writing your autobiography as simple as having a conversation.",
    date: 'January 1, 2026',
    category: 'News',
    readTime: '3 min read',
    featured: false
  }
]

const categories = ['All', 'News', 'Tips & Guides', 'Inspiration', 'Technology', 'Gift Ideas']

export default function Blog() {
  const featuredPost = blogPosts.find(p => p.featured)
  const otherPosts = blogPosts.filter(p => !p.featured)

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <nav className="bg-cream border-b border-sepia/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-ink tracking-wide">
            Easy<span className="text-sepia">Memoir</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/how-it-works" className="font-sans text-sm text-warmgray hover:text-ink transition">
              How It Works
            </Link>
            <Link
              to="/register"
              className="font-sans text-sm bg-ink text-white px-5 py-2 rounded-full hover:bg-sepia transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-6 bg-gradient-to-b from-cream to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-4xl sm:text-5xl text-ink mb-4">Blog & News</h1>
          <p className="font-serif text-xl text-warmgray">
            Tips, inspiration, and stories about preserving memories
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-6 px-6 bg-white border-b border-sepia/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`px-4 py-2 rounded-full text-sm font-sans transition ${
                  cat === 'All'
                    ? 'bg-ink text-white'
                    : 'bg-sepia/5 text-warmgray hover:bg-sepia/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="py-12 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="block group bg-gradient-to-br from-sepia/5 to-sepia/10 rounded-3xl overflow-hidden hover:shadow-xl transition"
            >
              <div className="grid md:grid-cols-2 gap-8 p-8">
                <div className="aspect-video bg-sepia/10 rounded-2xl flex items-center justify-center">
                  <span className="text-6xl">📖</span>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-sepia text-white text-xs rounded-full">Featured</span>
                    <span className="text-sm text-warmgray">{featuredPost.category}</span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl text-ink mb-4 group-hover:text-sepia transition">
                    {featuredPost.title}
                  </h2>
                  <p className="font-serif text-warmgray leading-relaxed mb-4">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-warmgray">
                    <span>{featuredPost.date}</span>
                    <span>·</span>
                    <span>{featuredPost.readTime}</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Post Grid */}
      <section className="py-12 px-6 bg-cream">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-2xl text-ink mb-8">Latest Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl overflow-hidden hover:shadow-lg transition"
              >
                <div className="aspect-video bg-sepia/5 flex items-center justify-center">
                  <span className="text-4xl opacity-50">
                    {post.category === 'News' && '📰'}
                    {post.category === 'Tips & Guides' && '💡'}
                    {post.category === 'Inspiration' && '✨'}
                    {post.category === 'Technology' && '🤖'}
                    {post.category === 'Gift Ideas' && '🎁'}
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-0.5 bg-sepia/10 text-sepia text-xs rounded-full">
                      {post.category}
                    </span>
                    <span className="text-xs text-warmgray">{post.readTime}</span>
                  </div>
                  <h3 className="font-display text-lg text-ink mb-2 group-hover:text-sepia transition line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="font-serif text-sm text-warmgray line-clamp-2 mb-3">
                    {post.excerpt}
                  </p>
                  <p className="text-xs text-warmgray">{post.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 px-6 bg-ink text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl mb-4">Stay Updated</h2>
          <p className="font-serif text-white/70 mb-8">
            Get tips on memoir writing, product updates, and inspiring stories delivered to your inbox.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-sepia"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-sepia text-white rounded-full font-sans hover:bg-sepia/90 transition"
            >
              Subscribe
            </button>
          </form>
          <p className="text-xs text-white/50 mt-4">
            No spam, unsubscribe anytime. Read our <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-sepia/10 bg-cream">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="font-display text-xl text-ink">
            Easy<span className="text-sepia">Memoir</span>
          </Link>
          <div className="flex gap-6 text-sm text-warmgray">
            <Link to="/how-it-works" className="hover:text-sepia transition">How It Works</Link>
            <Link to="/privacy" className="hover:text-sepia transition">Privacy</Link>
            <Link to="/terms" className="hover:text-sepia transition">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
