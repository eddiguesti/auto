// Runtime bootstrap: load polyfills and environment before importing modules
// that create database/service clients at module evaluation time.
import './polyfills.js'
import 'dotenv/config'

const { startNodeServer } = await import('./nodeServer.js')

startNodeServer().catch(error => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
