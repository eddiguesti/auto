#!/usr/bin/env node
/**
 * Prerender Script for Easy Memoir
 *
 * Runs after `vite build` to generate static HTML for public marketing pages.
 * This allows search engines to crawl fully-rendered content without JavaScript.
 *
 * Usage: node scripts/prerender.js
 *
 * How it works:
 * 1. Starts a local static server serving the Vite build output (dist/)
 * 2. Uses Puppeteer to visit each public route
 * 3. Waits for React to render + Helmet to inject meta tags
 * 4. Saves the rendered HTML back to dist/ as static files
 * 5. Shuts down the server
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, '..', 'dist')
const PORT = 4173

// All public routes to prerender
const ROUTES = [
  '/',
  '/how-it-works',
  '/pricing',
  '/faq',
  '/about',
  '/gift',
  '/sample',
  '/compare',
  '/blog',
  '/login',
  '/register',
  '/terms',
  '/privacy',
  '/cookies',
  // Blog posts
  '/blog/how-to-write-memoir-complete-guide',
  '/blog/memoir-vs-autobiography-difference',
  '/blog/therapeutic-benefits-writing-life-story',
  '/blog/writing-prompts-unlock-memories',
  '/blog/interview-parents-grandparents-guide',
  '/blog/memoir-writing-seniors-guide',
  '/blog/common-memoir-mistakes-avoid',
  '/blog/memoir-structure-outline-guide',
  '/blog/finding-your-authentic-voice',
  '/blog/writing-dialogue-memoir',
  '/blog/best-memoirs-read-inspiration',
  '/blog/ethical-writing-about-family',
  '/blog/gift-memoir-parents-grandparents',
  '/blog/using-photos-memoir',
  '/blog/ai-memoir-writing-future',
  '/blog/overcoming-writers-block-memoir',
  '/blog/self-publishing-memoir-guide',
  '/blog/writing-about-trauma-responsibly',
  '/blog/memoir-life-chapters-approach',
  '/blog/preserving-family-stories',
  '/blog/memoir-book-design-tips',
  '/blog/short-memoir-vs-full-book',
  '/blog/legacy-letters-alternative-memoir',
  '/blog/memoir-questions-family-ask',
  '/blog/why-your-story-matters'
]

/**
 * Simple static file server for the dist directory.
 * Falls back to index.html for SPA routes.
 */
function createStaticServer() {
  return createServer((req, res) => {
    let filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url)

    // If no extension, serve index.html (SPA fallback)
    if (!filePath.includes('.')) {
      filePath = join(DIST_DIR, 'index.html')
    }

    try {
      const content = readFileSync(filePath)
      const ext = filePath.split('.').pop()
      const mimeTypes = {
        html: 'text/html',
        js: 'application/javascript',
        css: 'text/css',
        json: 'application/json',
        png: 'image/png',
        jpg: 'image/jpeg',
        svg: 'image/svg+xml',
        woff2: 'font/woff2'
      }
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
      res.end(content)
    } catch {
      // Fall back to index.html
      const html = readFileSync(join(DIST_DIR, 'index.html'))
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(html)
    }
  })
}

async function prerender() {
  if (!existsSync(DIST_DIR)) {
    console.error('Error: dist/ directory not found. Run `npm run build` first.')
    process.exit(1)
  }

  console.log('Starting prerender...')
  console.log(`Routes to prerender: ${ROUTES.length}`)

  // Start local server
  const server = createStaticServer()
  await new Promise(resolve => server.listen(PORT, resolve))
  console.log(`Static server running on http://localhost:${PORT}`)

  // Launch Puppeteer
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  let rendered = 0
  const errors = []

  for (const route of ROUTES) {
    try {
      const page = await browser.newPage()

      // Block unnecessary resources for speed
      await page.setRequestInterception(true)
      page.on('request', req => {
        const type = req.resourceType()
        if (['image', 'font', 'media'].includes(type)) {
          req.abort()
        } else {
          req.continue()
        }
      })

      await page.goto(`http://localhost:${PORT}${route}`, {
        waitUntil: 'networkidle0',
        timeout: 15000
      })

      // Wait for React to render and Helmet to inject
      await page.waitForSelector('title', { timeout: 5000 }).catch(() => {})
      // Small extra wait for Helmet async updates
      await new Promise(r => setTimeout(r, 500))

      const html = await page.content()
      await page.close()

      // Determine output path
      const outputPath =
        route === '/' ? join(DIST_DIR, 'index.html') : join(DIST_DIR, route, 'index.html')

      // Create directory if needed
      const dir = dirname(outputPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      writeFileSync(outputPath, html, 'utf-8')
      rendered++
      process.stdout.write(`\r  Rendered ${rendered}/${ROUTES.length}: ${route}`)
    } catch (err) {
      errors.push({ route, error: err.message })
      console.error(`\n  Error rendering ${route}: ${err.message}`)
    }
  }

  console.log('\n')

  await browser.close()
  server.close()

  console.log(`Prerender complete: ${rendered}/${ROUTES.length} pages rendered`)
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`)
    errors.forEach(e => console.log(`  - ${e.route}: ${e.error}`))
  }
}

prerender().catch(err => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
