import { Helmet } from 'react-helmet-async'

const SITE_URL = 'https://easymemoir.co.uk'
const SITE_NAME = 'Easy Memoir'
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`
const DEFAULT_DESCRIPTION =
  'Transform your memories into a beautifully written autobiography. Just talk naturally — our AI creates a professionally written memoir your family will treasure for generations.'

/**
 * Reusable SEO component for per-page meta tags, Open Graph, Twitter Cards,
 * canonical URLs, and JSON-LD structured data.
 *
 * @param {Object} props
 * @param {string} props.title - Page title (will be appended with " | Easy Memoir")
 * @param {string} [props.description] - Meta description (max ~160 chars)
 * @param {string} [props.path] - URL path (e.g. "/blog/my-post")
 * @param {string} [props.image] - OG image URL (absolute)
 * @param {string} [props.imageAlt] - OG image alt text
 * @param {string} [props.type] - OG type (default "website")
 * @param {Object} [props.article] - Article metadata for blog posts
 * @param {string} [props.article.publishedTime] - ISO date string
 * @param {string} [props.article.author] - Author name
 * @param {string} [props.article.section] - Article category/section
 * @param {Array}  [props.article.tags] - Article tags
 * @param {Object|Array} [props.jsonLd] - JSON-LD structured data object(s)
 * @param {boolean} [props.noindex] - Set true to noindex page
 */
export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '',
  image = DEFAULT_IMAGE,
  imageAlt = 'Easy Memoir - Your Life Story, Beautifully Told',
  type = 'website',
  article,
  jsonLd,
  noindex = false
}) {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} - Write Your Life Story with AI`
  const canonicalUrl = `${SITE_URL}${path}`
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image}`

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      )}

      {/* Open Graph */}
      <meta property="og:type" content={article ? 'article' : type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_GB" />

      {/* Article-specific OG tags */}
      {article?.publishedTime && (
        <meta property="article:published_time" content={article.publishedTime} />
      )}
      {article?.author && <meta property="article:author" content={article.author} />}
      {article?.section && <meta property="article:section" content={article.section} />}
      {article?.tags?.map(tag => (
        <meta property="article:tag" content={tag} key={tag} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(
            Array.isArray(jsonLd)
              ? { '@context': 'https://schema.org', '@graph': jsonLd }
              : { '@context': 'https://schema.org', ...jsonLd }
          )}
        </script>
      )}
    </Helmet>
  )
}

/**
 * Helper to generate BlogPosting JSON-LD schema
 */
export function blogPostSchema({
  title,
  description,
  slug,
  date,
  author,
  image,
  readTime,
  category
}) {
  const wordCount = readTime ? parseInt(readTime) * 250 : 2000
  return {
    '@type': 'BlogPosting',
    '@id': `${SITE_URL}/blog/${slug}#article`,
    headline: title,
    description,
    image: image || DEFAULT_IMAGE,
    datePublished: date,
    dateModified: date,
    wordCount,
    articleSection: category,
    inLanguage: 'en-GB',
    author: {
      '@type': 'Organization',
      name: author || 'Easy Memoir Editorial',
      url: SITE_URL
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${slug}`
    },
    isPartOf: {
      '@type': 'Blog',
      '@id': `${SITE_URL}/blog#blog`,
      name: 'The Memoir Chronicle',
      publisher: { '@id': `${SITE_URL}/#organization` }
    }
  }
}

/**
 * Helper to generate BreadcrumbList JSON-LD
 */
export function breadcrumbSchema(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url ? `${SITE_URL}${item.url}` : undefined
    }))
  }
}

/**
 * Helper to generate FAQPage JSON-LD
 */
export function faqSchema(faqs) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }
}
