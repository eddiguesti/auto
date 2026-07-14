import { useParams, Link, useNavigate } from 'react-router-dom'
import { IconChevronRight, IconBolt, IconBook2 } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import SEO, { blogPostSchema, breadcrumbSchema } from '../../components/SEO'
import { BlogImage, blogPosts } from './Blog'
import { blogPostsData } from '../../data/blogPosts'
import { Button, Card, Badge } from '../../components/ui'

export default function BlogPost() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const post = blogPostsData[slug]
  const postMeta = blogPosts.find(p => p.slug === slug)

  if (!post) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <SEO title="Article Not Found" noindex />
        <div className="text-center">
          <h1 className="font-display text-4xl text-ink mb-4">Article Not Found</h1>
          <p className="text-sepia-600 mb-8">The article you're looking for doesn't exist.</p>
          <Link
            to="/blog"
            className="text-bronze-600 hover:text-bronze-700 font-medium hover:underline transition-colors"
          >
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
    <div className="min-h-screen bg-parchment">
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
            <Link to="/blog" className="text-white/70 hover:text-white transition-colors">
              Blog
            </Link>
            <Link to="/how-it-works" className="text-white/70 hover:text-white transition-colors">
              How It Works
            </Link>
          </nav>
          <Button to={user ? '/home' : '/register'} variant="secondary" size="sm">
            {user ? 'My Stories' : 'Start Writing Free'}
          </Button>
        </div>
      </div>
    </header>
  )
}

function Breadcrumbs({ title }) {
  return (
    <nav className="max-w-4xl mx-auto px-4 sm:px-6 pt-6" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-xs text-sepia-500">
        <li>
          <Link to="/" className="hover:text-ink transition-colors">
            Home
          </Link>
        </li>
        <li>
          <IconChevronRight size={12} stroke={2} aria-hidden="true" />
        </li>
        <li>
          <Link to="/blog" className="hover:text-ink transition-colors">
            Blog
          </Link>
        </li>
        <li>
          <IconChevronRight size={12} stroke={2} aria-hidden="true" />
        </li>
        <li className="text-sepia-600 truncate max-w-[200px]">{title}</li>
      </ol>
    </nav>
  )
}

function ArticleHeader({ post, postMeta }) {
  return (
    <header className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        <Badge>{post.category}</Badge>
        <span className="text-sm text-sepia-500">{post.readTime}</span>
      </div>
      <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-ink mb-4">{post.title}</h1>
      {post.subtitle && <p className="font-serif text-xl text-sepia-600 italic">{post.subtitle}</p>}
      <div className="flex items-center gap-4 mt-6 pt-6 border-t border-sepia-200">
        <div className="w-10 h-10 rounded-full bg-bronze-100 text-bronze-700 flex items-center justify-center font-semibold text-sm">
          EM
        </div>
        <div>
          <p className="text-sm font-medium text-ink">{post.author || 'Easy Memoir Editorial'}</p>
          <p className="text-xs text-sepia-500">
            <time dateTime={postMeta?.isoDate}>{post.date}</time>
          </p>
        </div>
      </div>
    </header>
  )
}

const ARTICLE_CONTENT_CLASSES = [
  'prose-memoir',
  // Lead paragraph with a drop cap
  '[&_.lead]:text-xl [&_.lead]:text-ink-soft [&_.lead]:mb-7',
  '[&_.lead::first-letter]:float-left [&_.lead::first-letter]:font-display',
  '[&_.lead::first-letter]:text-[3.4em] [&_.lead::first-letter]:leading-[0.82]',
  '[&_.lead::first-letter]:pr-2 [&_.lead::first-letter]:font-semibold',
  '[&_.lead::first-letter]:text-bronze-600',
  // Section headings
  '[&_h2]:text-2xl [&_h2]:text-ink [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:pb-2',
  '[&_h2]:border-b [&_h2]:border-bronze-300',
  // Emphasis
  '[&_strong]:text-ink [&_strong]:font-semibold',
  // Quotes
  '[&_blockquote]:border-l-4 [&_blockquote]:border-bronze-400 [&_blockquote]:bg-sepia-50',
  '[&_blockquote]:rounded-r-lg [&_blockquote]:py-4 [&_blockquote]:px-6',
  '[&_blockquote]:italic [&_blockquote]:text-sepia-600 [&_blockquote]:my-8'
].join(' ')

function ArticleContent({ content }) {
  return <div className={ARTICLE_CONTENT_CLASSES} dangerouslySetInnerHTML={{ __html: content }} />
}

function ContinueReading() {
  return (
    <div className="mt-12 p-6 bg-cream rounded-2xl">
      <h3 className="font-display text-lg text-ink mb-4">Continue Reading</h3>
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

const READING_LINK_ICONS = {
  bolt: IconBolt,
  book: IconBook2
}

function ReadingLink({ to, icon, title, subtitle }) {
  const Icon = READING_LINK_ICONS[icon] || IconBook2
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-sepia-200/70 hover:border-sepia-300 shadow-xs hover:shadow-soft transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-sepia-100 text-sepia-600 flex items-center justify-center flex-shrink-0">
        <Icon size={20} stroke={1.75} />
      </div>
      <div>
        <p className="text-sm font-medium text-ink group-hover:text-bronze-700 transition-colors">
          {title}
        </p>
        <p className="text-xs text-sepia-500">{subtitle}</p>
      </div>
    </Link>
  )
}

function ArticleCTA({ user, navigate }) {
  return (
    <div className="mt-12 bg-ink rounded-3xl p-8 sm:p-12 text-white text-center">
      <div className="max-w-2xl mx-auto">
        <h3 className="font-display text-3xl sm:text-4xl text-white mb-4">
          Ready to Write Your Own Story?
        </h3>
        <p className="text-lg text-white/70 mb-8">
          Easy Memoir makes it simple. Just talk about your memories naturally, and our AI
          transforms your words into beautifully written prose.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="accent"
            size="lg"
            onClick={() => navigate(user ? '/voice' : '/register')}
          >
            {user ? 'Continue Your Memoir' : 'Start Your Free Memoir'}
          </Button>
          <Button to="/how-it-works" variant="secondary" size="lg">
            Learn How It Works
          </Button>
        </div>
        <p className="text-white/40 text-sm mt-6">Free to start. No credit card required.</p>
      </div>
    </div>
  )
}

function RelatedArticles({ relatedPosts }) {
  if (relatedPosts.length === 0) return null
  return (
    <div className="mt-16 pt-12 border-t border-sepia-200">
      <h3 className="font-display text-2xl text-ink mb-8">
        More from {relatedPosts[0]?.[1]?.category}
      </h3>
      <div className="grid md:grid-cols-3 gap-6">
        {relatedPosts.map(([postSlug, relatedPost]) => (
          <Card
            key={postSlug}
            interactive
            to={`/blog/${postSlug}`}
            padding="none"
            className="group overflow-hidden h-full"
          >
            <BlogImage slug={postSlug} category={relatedPost.category} aspect="aspect-[16/10]" />
            <div className="p-5">
              <p className="eyebrow mb-2">{relatedPost.readTime}</p>
              <h4 className="font-display text-lg text-ink group-hover:text-bronze-700 transition-colors mb-2 line-clamp-2">
                {relatedPost.title}
              </h4>
              <p className="text-sm text-sepia-600 line-clamp-2">{relatedPost.excerpt}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function BlogFooter() {
  return (
    <footer className="bg-ink text-white py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link to="/" className="font-display text-xl text-white">
            Easy<span className="text-bronze-300">Memoir</span>
          </Link>
          <div className="flex gap-6 text-sm text-white/60">
            <Link to="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <Link to="/how-it-works" className="hover:text-white transition-colors">
              How It Works
            </Link>
            <Link to="/pricing" className="hover:text-white transition-colors">
              Pricing
            </Link>
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
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
