/**
 * WebSocket server and graceful shutdown setup.
 * Extracted from index.js to keep the entry point lean.
 */

import { WebSocketServer } from 'ws'
import { handleTelnyxMediaStream } from '../routes/index.js'
import { handleVoiceProxy } from './voiceProxy.js'
import { createShutdown, registerShutdown } from './lifecycle.js'
import { verifyTelnyxStreamToken } from './telnyxSecurity.js'

/**
 * Attach a WebSocket server to the HTTP server for Telnyx media streams.
 * Connections use short-lived signed, call-specific stream credentials.
 * Returns the WebSocketServer instance for use in shutdown.
 */
export function setupWebSocket(server, db) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 })

  server.on('upgrade', (request, socket, head) => {
    let url
    try {
      url = new URL(request.url, 'http://localhost')
    } catch {
      socket.destroy()
      return
    }

    if (url.pathname === '/api/voice/ws') {
      wss.handleUpgrade(request, socket, head, ws => {
        void handleVoiceProxy(ws, request, db).catch(() =>
          ws.close(1011, 'Voice service unavailable')
        )
      })
      return
    }

    if (url.pathname === '/api/telnyx/media-stream') {
      const streamToken = url.searchParams.get('token')
      const streamClaims = verifyTelnyxStreamToken(streamToken)
      if (!streamClaims) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
        socket.destroy()
        return
      }
      wss.handleUpgrade(request, socket, head, ws => {
        void handleTelnyxMediaStream(ws, db, streamClaims)
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
export function setupGracefulShutdown(server, wss, pool, stopQueue, stopCron) {
  const shutdown = createShutdown({
    stopCron,
    stopQueue,
    closeServer: () =>
      new Promise((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()))
      }),
    closeSockets: () =>
      new Promise((resolve, reject) => {
        for (const socket of wss.clients) socket.close(1001, 'Server shutting down')
        wss.close(error => (error ? reject(error) : resolve()))
      }),
    closeDatabase: () => pool?.end()
  })
  registerShutdown(shutdown)
  return shutdown
}
