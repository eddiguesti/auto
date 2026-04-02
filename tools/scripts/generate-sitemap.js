/**
 * Generate sitemap.xml from route and blog data.
 * Run with: node tools/scripts/generate-sitemap.js
 * Or automatically during build: npm run build (if integrated)
 */

import { writeFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SITE_URL = 'https://easymemoir.co.uk'
const OUTPUT_PATH = join(__dirname, '..', '..', 'apps', 'web', 'public', 'sitemap.xml')
const TODAY = new Date().toISOString().split('T')[0]

// Static marketing & legal pages
const PAGES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/how-it-works', priority: '0.9', changefreq: 'monthly' },
  { path: '/pricing', priority: '0.9', changefreq: 'monthly' },
  { path: '/faq', priority: '0.7', changefreq: 'monthly' },
  { path: '/about', priority: '0.7', changefreq: 'monthly' },
  { path: '/gift', priority: '0.7', changefreq: 'monthly' },
  { path: '/compare', priority: '0.6', changefreq: 'monthly' },
  { path: '/sample', priority: '0.6', changefreq: 'monthly' },
  { path: '/blog', priority: '0.8', changefreq: 'weekly' },
  { path: '/login', priority: '0.5', changefreq: 'yearly' },
  { path: '/register', priority: '0.7', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/cookies', priority: '0.2', changefreq: 'yearly' },
  { path: '/refund-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/cancellation-policy', priority: '0.3', changefreq: 'yearly' }
]

// Extract blog post slugs from the data file
function getBlogSlugs() {
  try {
    const dataPath = join(__dirname, '..', '..', 'apps', 'web', 'src', 'data', 'blogPosts.js')
    const content = require('fs').readFileSync(dataPath, 'utf-8')
    const slugs = [...content.matchAll(/'([a-z0-9-]+)':\s*\{/g)].map(m => m[1])
    return slugs
  } catch {
    return []
  }
}

function buildUrl(path, priority, changefreq) {
  return `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

const blogSlugs = getBlogSlugs()

const urls = [
  ...PAGES.map(p => buildUrl(p.path, p.priority, p.changefreq)),
  ...blogSlugs.map(slug => buildUrl(`/blog/${slug}`, '0.6', 'monthly'))
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`

writeFileSync(OUTPUT_PATH, sitemap)
console.log(`Sitemap generated: ${OUTPUT_PATH} (${PAGES.length + blogSlugs.length} URLs)`)
