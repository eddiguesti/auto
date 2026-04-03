/**
 * WebSocket server and graceful shutdown setup.
 * Extracted from index.js to keep the entry point lean.
 */

import { WebSocketServer } from 'ws'
import { handleTelnyxMediaStream } from '../routes/index.js'
import { handleVoiceProxy } from './voiceProxy.js'

/**
 * Attach a WebSocket server to the HTTP server for Telnyx media streams.
 * Connections are authenticated with INTERNAL_CRON_SECRET as a query token.
 * Returns the WebSocketServer instance for use in shutdown.
 */
export function setupWebSocket(server, db) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`)

    if (url.pathname === '/api/voice/ws') {
      wss.handleUpgrade(request, socket, head, ws => {
        handleVoiceProxy(ws, request)
      })
      return
    }

    if (url.pathname === '/api/telnyx/media-stream') {
      const streamToken = url.searchParams.get('token')
      const expectedToken = process.env.INTERNAL_CRON_SECRET
      if (!expectedToken || streamToken !== expectedToken) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
        socket.destroy()
        return
      }
      wss.handleUpgrade(request, socket, head, ws => {
        handleTelnyxMediaStream(ws, db)
      })
      return
    }

    socket.destroy()
  })

  return wss
}

/**
 * Register SIGTERM and SIGINT handlers for graceful shutdown.
 * Drains the HTTP server, closes WebSocket connections, stops the job queue, and ends the DB pool.
 * @param {Function} [stopQueue] - Optional async callback to stop the job queue
 */
export function setupGracefulShutdown(server, wss, pool, stopQueue) {
  const shutdown = async signal => {
    console.log(`\n${signal} received — shutting down gracefully...`)
    server.close(() => console.log('HTTP server closed'))
    wss.close()
    if (stopQueue) {
      try {
        await stopQueue()
        console.log('Job queue stopped')
      } catch (err) {
        console.error('Error stopping job queue:', err.message)
      }
    }
    if (pool) {
      try {
        await pool.end()
        console.log('Database pool closed')
      } catch (err) {
        console.error('Error closing database pool:', err.message)
      }
    }
    setTimeout(() => {
      console.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
