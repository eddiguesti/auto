import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import dotenv from 'dotenv'

import pool, { initDatabase } from './db/index.js'
import storiesRouter from './routes/stories.js'
import photosRouter from './routes/photos.js'
import aiRouter from './routes/ai.js'
import voiceRouter from './routes/voice.js'
import luluRouter from './routes/lulu.js'
import memoryRouter from './routes/memory.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Make db pool available to routes
app.locals.db = pool

// Middleware
app.use(cors())
app.use(express.json())

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')))

// Routes
app.use('/api/stories', storiesRouter)
app.use('/api/photos', photosRouter)
app.use('/api/ai', aiRouter)
app.use('/api/voice', voiceRouter)
app.use('/api/lulu', luluRouter)
app.use('/api/memory', memoryRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Serve built frontend in production
const clientBuildPath = join(__dirname, '..', 'client', 'dist')

if (existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath))

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(clientBuildPath, 'index.html'))
    }
  })
}

// Initialize database and start server
async function start() {
  try {
    await initDatabase()
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
