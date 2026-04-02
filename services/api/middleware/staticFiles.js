/**
 * Static file serving and SPA fallback.
 * Serves the React/Vite build from apps/web/dist when present.
 * Falls back to a simple "getting ready" page during cold starts.
 */

import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const clientBuildPath = join(__dirname, '..', '..', '..', 'apps', 'web', 'dist')

export function setupStaticFiles(app) {
  if (existsSync(clientBuildPath)) {
    app.use(
      express.static(clientBuildPath, {
        maxAge: '1y',
        immutable: true,
        etag: false,
        index: false
      })
    )

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next()
      res.set('Cache-Control', 'no-cache, must-revalidate')
      res.sendFile(join(clientBuildPath, 'index.html'))
    })
  } else {
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next()
      res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Easy Memoir</title>
  <style>
    body { font-family: Georgia, serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #FAF6F1; color: #5C4033; }
    .container { text-align: center; padding: 2rem; max-width: 500px; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    p { color: #8B7355; line-height: 1.6; }
    a { color: #5C4033; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Easy Memoir</h1>
    <p>We're getting things ready. Please refresh in a moment.</p>
    <p><a href="/">Try again</a></p>
  </div>
</body>
</html>`)
    })
  }
}
