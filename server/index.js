import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

import storiesRouter from './routes/stories.js'
import photosRouter from './routes/photos.js'
import aiRouter from './routes/ai.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Initialize database
const dbPath = join(__dirname, 'db', 'life-story.db')
const db = new Database(dbPath)

// Run schema
const schema = readFileSync(join(__dirname, 'db', 'schema.sql'), 'utf-8')
db.exec(schema)

// Make db available to routes
app.locals.db = db

// Middleware
app.use(cors())
app.use(express.json())

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')))

// Routes
app.use('/api/stories', storiesRouter)
app.use('/api/photos', photosRouter)
app.use('/api/ai', aiRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Serve built frontend in production
import { existsSync } from 'fs'
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
