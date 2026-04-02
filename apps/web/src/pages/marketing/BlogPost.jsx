import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SEO, { blogPostSchema, breadcrumbSchema } from '../../components/SEO'
import { BlogImage, blogPosts } from './Blog'
import { blogPostsData } from '../../data/blogPosts'

export default function BlogPost() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const post = blogPostsData[slug]
  const postMeta = blogPosts.find(p => p.slug === slug)

  if (!post) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <SEO title="Article Not Found" noindex />
        <div className="text-center">
          <h1 className="font-display text-4xl text-ink mb-4">Article Not Found</h1>
          <p className="text-warmgray mb-8">The article you're looking for doesn't exist.</p>
          <Link to="/blog" className="text-sepia hover:underline">
            Return to Blog
          </Link>
        </div>
      </div>
    )
  }

  const relatedPosts = Object.entries(blogPostsData)
    .filter(([postSlug, p]) => p.category === post.category && postSlug !== slug)
    .slice(0, 3)

  const articleSchema = blogPostSchema({
    title: post.title,
    description: post.excerpt,
    slug,
    date: postMeta?.isoDate || post.date,
    author: post.author,
    readTime: post.readTime,
    category: post.category
  })

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title }
  ])

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <SEO
        title={post.title}
        description={post.excerpt}
        path={`/blog/${slug}`}
        type="article"
        imageAlt={`${post.title} - Easy Memoir Blog`}
        article={{
          publishedTime: postMeta?.isoDate,
          author: post.author || 'Easy Memoir Editorial',
          section: post.category,
          tags: ['memoir writing', 'autobiography', post.category.toLowerCase(), 'life story']
        }}
        jsonLd={[articleSchema, breadcrumbs]}
      />

      <BlogHeader user={user} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <BlogImage
          slug={slug}
          category={post.category}
          aspect="aspect-[21/9]"
          className="rounded-2xl"
        />
      </div>

      <Breadcrumbs title={post.title} />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <ArticleHeader post={post} postMeta={postMeta} />
        <ArticleContent content={post.content} />
        <ContinueReading />
        <ArticleCTA user={user} navigate={navigate} />
        <RelatedArticles relatedPosts={relatedPosts} />
      </article>

      <BlogFooter />
    </div>
  )
}

function BlogHeader({ user }) {
  return (
    <header className="bg-[#1a1a1a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3 border-b border-white/10">
          <Link to="/" className="font-display text-lg hover:text-[#c4a77d] transition">
            Easy<span className="text-[#c4a77d]">Memoir</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <Link to="/blog" className="text-white/70 hover:text-white transition">
              Blog
            </Link>
            <Link to="/how-it-works" className="text-white/70 hover:text-white transition">
              How It Works
            </Link>
          </nav>
          <Link
            to={user ? '/home' : '/register'}
            className="bg-[#c4a77d] text-[#1a1a1a] px-4 py-1.5 rounded-full text-sm font-medium hover:bg-[#b39669] transition"
          >
            {user ? 'My Stories' : 'Start Writing Free'}
          </Link>
        </div>
      </div>
    </header>
  )
}

function Breadcrumbs({ title }) {
  return (
    <nav className="max-w-4xl mx-auto px-4 sm:px-6 pt-6" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-xs text-[#999]">
        <li>
          <Link to="/" className="hover:text-[#8b7355] transition">
            Home
          </Link>
        </li>
        <li>
          <ChevronIcon />
        </li>
        <li>
          <Link to="/blog" className="hover:text-[#8b7355] transition">
            Blog
          </Link>
        </li>
        <li>
          <ChevronIcon />
        </li>
        <li className="text-[#666] truncate max-w-[200px]">{title}</li>
      </ol>
    </nav>
  )
}

function ChevronIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function ArticleHeader({ post, postMeta }) {
  return (
    <header className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        <span className="px-3 py-1 bg-[#f0ebe3] text-[#8b7355] text-xs font-medium rounded-full">
          {post.category}
        </span>
        <span className="text-sm text-[#999]">{post.readTime}</span>
      </div>
      <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] leading-tight mb-4">
        {post.title}
      </h1>
      {post.subtitle && <p className="font-serif text-xl text-[#5a5a5a] italic">{post.subtitle}</p>}
      <div className="flex items-center gap-4 mt-6 pt-6 border-t border-[#e5e0d8]">
        <div className="w-10 h-10 rounded-full bg-[#c4a77d] flex items-center justify-center text-white font-sans font-semibold text-sm">
          EM
        </div>
        <div>
          <p className="text-sm font-medium text-[#1a1a1a]">
            {post.author || 'Easy Memoir Editorial'}
          </p>
          <p className="text-xs text-[#999]">
            <time dateTime={postMeta?.isoDate}>{post.date}</time>
          </p>
        </div>
      </div>
    </header>
  )
}

function ArticleContent({ content }) {
  return (
    <div className="article-content">
      <style>{`
        .article-content p.lead { font-size: 1.2rem; font-weight: 400; color: #333; line-height: 1.9; margin-bottom: 1.75rem; }
        .article-content p.lead::first-letter { font-size: 4rem; float: left; line-height: 0.8; padding-right: 0.5rem; padding-top: 0.1rem; font-family: Georgia, serif; font-weight: bold; color: #1a1a1a; }
        .article-content p { font-family: Georgia, 'Lora', serif; font-size: 1.1rem; line-height: 1.85; color: #3d3833; margin-bottom: 1.25rem; }
        .article-content h2 { font-family: 'Boska', Georgia, serif; font-size: 1.75rem; font-weight: 600; color: #1a1a1a; margin-top: 2.5rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #c4a77d; }
        .article-content strong { color: #1a1a1a; font-weight: 600; }
        .article-content blockquote { border-left: 4px solid #c4a77d; padding: 1rem 1.5rem; font-style: italic; color: #555; margin: 2rem 0; background: #f8f5f0; border-radius: 0 8px 8px 0; }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  )
}

function ContinueReading() {
  return (
    <div className="mt-12 p-6 bg-[#f0ebe3] rounded-2xl">
      <h3 className="font-display text-lg text-[#1a1a1a] mb-4">Continue Reading</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <ReadingLink
          to="/how-it-works"
          icon="bolt"
          title="How Easy Memoir Works"
          subtitle="See how AI helps you write"
        />
        <ReadingLink
          to="/sample"
          icon="book"
          title="Read a Sample Memoir"
          subtitle="See a finished example"
        />
      </div>
    </div>
  )
}

function ReadingLink({ to, icon, title, subtitle }) {
  const paths = {
    bolt: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
    book: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25'
  }
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 bg-white rounded-xl hover:shadow-md transition group"
    >
      <div className="w-10 h-10 rounded-lg bg-[#c4a77d]/10 flex items-center justify-center flex-shrink-0">
        <svg
          className="w-5 h-5 text-[#c4a77d]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={paths[icon]} />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-[#1a1a1a] group-hover:text-[#8b7355] transition">
          {title}
        </p>
        <p className="text-xs text-[#999]">{subtitle}</p>
      </div>
    </Link>
  )
}

function ArticleCTA({ user, navigate }) {
  return (
    <div className="mt-12 bg-gradient-to-br from-[#1a1a1a] via-[#2a2520] to-[#1a1a1a] rounded-2xl p-8 sm:p-12 text-white text-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#c4a77d]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="max-w-2xl mx-auto relative">
        <h3 className="font-display text-3xl sm:text-4xl mb-4">Ready to Write Your Own Story?</h3>
        <p className="font-serif text-lg text-white/70 mb-8 leading-relaxed">
          Easy Memoir makes it simple. Just talk about your memories naturally, and our AI
          transforms your words into beautifully written prose.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(user ? '/voice' : '/register')}
            className="bg-[#c4a77d] text-[#1a1a1a] px-8 py-4 rounded-full font-sans font-semibold hover:bg-[#b39669] transition-all"
          >
            {user ? 'Continue Your Memoir' : 'Start Your Free Memoir'}
          </button>
          <Link
            to="/how-it-works"
            className="border border-white/30 text-white px-8 py-4 rounded-full font-sans hover:bg-white/10 transition"
          >
            Learn How It Works
          </Link>
        </div>
        <p className="text-white/40 text-sm mt-6">Free to start. No credit card required.</p>
      </div>
    </div>
  )
}

function RelatedArticles({ relatedPosts }) {
  if (relatedPosts.length === 0) return null
  return (
    <div className="mt-16 pt-12 border-t border-[#e5e0d8]">
      <h3 className="font-display text-2xl text-[#1a1a1a] mb-8">
        More from {relatedPosts[0]?.[1]?.category}
      </h3>
      <div className="grid md:grid-cols-3 gap-6">
        {relatedPosts.map(([postSlug, relatedPost]) => (
          <Link key={postSlug} to={`/blog/${postSlug}`} className="group">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition h-full">
              <BlogImage slug={postSlug} category={relatedPost.category} aspect="aspect-[16/10]" />
              <div className="p-5">
                <p className="text-xs text-[#8b7355] uppercase tracking-wider mb-2">
                  {relatedPost.readTime}
                </p>
                <h4 className="font-display text-lg text-[#1a1a1a] group-hover:text-[#8b7355] transition mb-2 leading-snug line-clamp-2">
                  {relatedPost.title}
                </h4>
                <p className="font-serif text-sm text-[#666] line-clamp-2">{relatedPost.excerpt}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function BlogFooter() {
  return (
    <footer className="bg-[#1a1a1a] text-white py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link to="/" className="font-display text-xl">
            Easy<span className="text-[#c4a77d]">Memoir</span>
          </Link>
          <div className="flex gap-6 text-sm text-white/60">
            <Link to="/blog" className="hover:text-white transition">
              Blog
            </Link>
            <Link to="/how-it-works" className="hover:text-white transition">
              How It Works
            </Link>
            <Link to="/pricing" className="hover:text-white transition">
              Pricing
            </Link>
            <Link to="/privacy" className="hover:text-white transition">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-white transition">
              Terms
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-white/40">
          <p>&copy; 2026 Easy Memoir Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
