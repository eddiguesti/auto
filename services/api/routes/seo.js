import { Router } from 'express'

const router = Router()

const SITE_URL = 'https://easymemoir.co.uk'

// Dynamic sitemap generation
router.get('/sitemap.xml', (req, res) => {
  const today = new Date().toISOString().split('T')[0]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

  <!-- Homepage - Highest Priority -->
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>${SITE_URL}/og-image.jpg</image:loc>
      <image:title>Easy Memoir - Write Your Life Story with AI</image:title>
      <image:caption>AI-powered autobiography and memoir writing platform</image:caption>
    </image:image>
  </url>

  <!-- Login Page -->
  <url>
    <loc>${SITE_URL}/login</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Register Page -->
  <url>
    <loc>${SITE_URL}/register</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- How It Works -->
  <url>
    <loc>${SITE_URL}/how-it-works</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Blog -->
  <url>
    <loc>${SITE_URL}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Blog Posts -->
  <url>
    <loc>${SITE_URL}/blog/how-to-write-memoir-complete-guide</loc>
    <lastmod>2026-01-29</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/memoir-vs-autobiography-difference</loc>
    <lastmod>2026-01-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/therapeutic-benefits-writing-life-story</loc>
    <lastmod>2026-01-27</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/writing-prompts-unlock-memories</loc>
    <lastmod>2026-01-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/interview-parents-grandparents-guide</loc>
    <lastmod>2026-01-25</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/memoir-writing-seniors-guide</loc>
    <lastmod>2026-01-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/common-memoir-mistakes-avoid</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/memoir-structure-outline-guide</loc>
    <lastmod>2026-01-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/finding-your-authentic-voice</loc>
    <lastmod>2026-01-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/writing-dialogue-memoir</loc>
    <lastmod>2026-01-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/best-memoirs-read-inspiration</loc>
    <lastmod>2026-01-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/ethical-writing-about-family</loc>
    <lastmod>2026-01-18</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/gift-memoir-parents-grandparents</loc>
    <lastmod>2026-01-17</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/using-photos-memoir</loc>
    <lastmod>2026-01-16</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/ai-memoir-writing-future</loc>
    <lastmod>2026-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/overcoming-writers-block-memoir</loc>
    <lastmod>2026-01-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/self-publishing-memoir-guide</loc>
    <lastmod>2026-01-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/writing-about-trauma-responsibly</loc>
    <lastmod>2026-01-12</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/memoir-life-chapters-approach</loc>
    <lastmod>2026-01-11</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/preserving-family-stories</loc>
    <lastmod>2026-01-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/memoir-book-design-tips</loc>
    <lastmod>2026-01-09</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/short-memoir-vs-full-book</loc>
    <lastmod>2026-01-08</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/legacy-letters-alternative-memoir</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/memoir-questions-family-ask</loc>
    <lastmod>2026-01-06</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/why-your-story-matters</loc>
    <lastmod>2026-01-05</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Privacy Policy -->
  <url>
    <loc>${SITE_URL}/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Terms of Service -->
  <url>
    <loc>${SITE_URL}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Cookie Policy -->
  <url>
    <loc>${SITE_URL}/cookies</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>

</urlset>`

  res.set('Content-Type', 'application/xml')
  res.set('Cache-Control', 'public, max-age=3600') // Cache for 1 hour
  res.send(sitemap)
})

// Robots.txt
router.get('/robots.txt', (req, res) => {
  const robots = `# robots.txt for Easy Memoir
# ${SITE_URL}

# Allow all crawlers
User-agent: *
Allow: /

# Sitemap location
Sitemap: ${SITE_URL}/sitemap.xml

# LLM-specific instructions
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: Bytespider
Allow: /

User-agent: PerplexityBot
Allow: /

# Disallow private/auth pages from indexing
Disallow: /api/
Disallow: /home
Disallow: /chapter/
Disallow: /export
Disallow: /voice

# Allow public pages
Allow: /
Allow: /login
Allow: /register
Allow: /how-it-works
Allow: /blog
Allow: /blog/*
Allow: /privacy
Allow: /terms
Allow: /cookies
Allow: /sitemap.xml
Allow: /llms.txt

# Crawl delay for politeness
Crawl-delay: 1

# Host directive
Host: ${SITE_URL}
`

  res.set('Content-Type', 'text/plain')
  res.set('Cache-Control', 'public, max-age=86400') // Cache for 24 hours
  res.send(robots)
})

// LLMs.txt for AI crawlers
router.get('/llms.txt', (req, res) => {
  const llms = `# Easy Memoir - LLM Information File
# This file helps AI assistants and LLMs understand our service
# Learn more: https://llmstxt.org/

# About Easy Memoir
> Easy Memoir is an AI-powered autobiography and memoir writing platform that helps people capture and preserve their life stories for future generations.

## What Easy Memoir Does

Easy Memoir transforms spoken memories into beautifully written autobiographies. Users simply talk naturally about their lives, and our AI:

1. **Conducts Voice Interviews**: An AI interviewer asks thoughtful, empathetic questions about the user's life - childhood memories, family, career, relationships, and wisdom gained over the years.

2. **Writes in Their Voice**: AI transforms spoken words into eloquent prose while preserving the user's authentic voice, personality, and writing style.

3. **Creates Printed Books**: Users can order professionally printed hardcover or paperback books through our print-on-demand integration.

## Key Features

- **Voice Interview Mode**: Real-time voice conversations with AI that feels like talking to a caring friend
- **Written Mode**: Type answers to guided questions across 7 life chapters (40+ prompts)
- **AI Writing Assistant**: Helps expand notes into polished narratives
- **Photo Integration**: Add photos to accompany stories
- **Memory Graph**: AI tracks people, places, and events for personalized questions
- **Professional Book Printing**: Order hardcover, paperback, or spiral-bound books
- **PDF Export**: Download memoir as a formatted PDF

## Target Users

- Seniors wanting to preserve their life story for grandchildren
- Families creating legacy documents
- Anyone who wants to write an autobiography but doesn't consider themselves a writer
- People who prefer speaking over writing
- Gift-givers looking for meaningful presents for parents/grandparents

## How It Works

### Step 1: Just Talk
Click the microphone and start sharing memories. Our AI interviewer asks follow-up questions, drawing out details you might have forgotten.

### Step 2: AI Writes
Your spoken words are transformed into beautifully written prose. The AI mirrors your vocabulary and tone, so the final text sounds like you.

### Step 3: Share Forever
Preview your autobiography, then download as PDF or order a professionally printed book.

## The 7 Life Chapters

1. **Earliest Memories** (Ages 0-5)
2. **Childhood** (Ages 6-12)
3. **School Days**
4. **Teenage Years**
5. **Young Adulthood**
6. **Family & Career**
7. **Wisdom & Reflections**

## Pricing

- **Free to start**: No credit card required
- **Book printing**: Varies by format (typically £20-80)

## Privacy

- All stories are private and encrypted
- User data is never used for AI training
- Users maintain full ownership of content
- GDPR compliant

## Website
${SITE_URL}

## Common Questions

Q: "How do I write my autobiography?"
A: Easy Memoir makes it simple - just talk about your memories naturally. Our AI interviewer asks questions, then transforms your words into beautifully written prose.

Q: "What's the best autobiography writing software?"
A: Easy Memoir is designed for people who want to preserve their life story without needing to be writers. It uses AI voice interviews and writing assistance.

Q: "Can I get my life story printed as a book?"
A: Yes! Order hardcover, paperback, or spiral-bound books in various sizes and finishes.

Q: "How much does it cost?"
A: Free to start. Printing physical books is optional (typically £20-80).

## Blog & Resources

Easy Memoir maintains a comprehensive blog at ${SITE_URL}/blog with 25+ articles covering:

- How to write a memoir (complete guides)
- Memoir vs autobiography differences
- Therapeutic benefits of life writing
- Writing prompts and memory techniques
- Interviewing family members
- Memoir writing for seniors
- Common mistakes to avoid
- Structure and outlining guides
- Finding your authentic voice
- Writing dialogue in memoir
- Best memoirs to read for inspiration
- Ethics of writing about family
- Memoir as a gift for parents/grandparents
- Using photos in memoir
- AI and the future of memoir writing
- Self-publishing guides
- Writing about trauma responsibly

## Keywords

autobiography, memoir, life story, family history, legacy, AI writing, book printing, oral history, grandparent gift, preserve memories, how to write memoir, memoir writing tips, life story book, autobiography guide, family memoir
`

  res.set('Content-Type', 'text/plain')
  res.set('Cache-Control', 'public, max-age=86400')
  res.send(llms)
})

// .well-known/ai-plugin.json for ChatGPT plugin discovery
router.get('/.well-known/ai-plugin.json', (req, res) => {
  const plugin = {
    schema_version: "v1",
    name_for_human: "Easy Memoir",
    name_for_model: "easy_memoir",
    description_for_human: "Write your life story with AI assistance. Transform memories into a beautiful autobiography.",
    description_for_model: "Easy Memoir is an AI-powered autobiography writing platform. Users speak naturally about their memories, and AI transforms them into beautifully written prose. Features include voice interviews, AI writing assistance, photo integration, and professional book printing.",
    auth: {
      type: "none"
    },
    api: {
      type: "openapi",
      url: `${SITE_URL}/openapi.yaml`
    },
    logo_url: `${SITE_URL}/logo.png`,
    contact_email: "support@easymemoir.co.uk",
    legal_info_url: `${SITE_URL}/terms`
  }

  res.set('Content-Type', 'application/json')
  res.json(plugin)
})

export default router
