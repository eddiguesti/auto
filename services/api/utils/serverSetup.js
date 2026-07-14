/** Node.js-only WebSocket and process lifecycle setup. */

import { WebSocket, WebSocketServer } from 'ws'
import { handleTelnyxMediaStream } from '../routes/index.js'
import { handleVoiceProxy } from './voiceProxy.js'

function rejectUpgrade(socket, status, message) {
  socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`)
  socket.destroy()
}

function isAllowedBrowserOrigin(request) {
  const origin = request.headers.origin
  if (!origin) return process.env.NODE_ENV !== 'production'

  try {
    const originUrl = new URL(origin)
    const requestHost = request.headers.host
    const configured = [
      process.env.APP_URL,
      process.env.FRONTEND_URL,
      'https://easymemoir.co.uk',
      'https://www.easymemoir.co.uk'
    ]
      .filter(Boolean)
      .map(value => new URL(value).origin)

    return originUrl.host === requestHost || configured.includes(originUrl.origin)
  } catch {
    return false
  }
}

/** Attach the Node.js WebSocket endpoints to an HTTP server. */
export function setupWebSocket(server, db) {
  const maxPayload = Number(process.env.WS_MAX_PAYLOAD_BYTES || 2 * 1024 * 1024)
  const maxConnections = Number(process.env.WS_MAX_CONNECTIONS || 250)
  const wss = new WebSocketServer({ noServer: true, maxPayload })

  const markAlive = ws => {
    ws.isAlive = true
    ws.on('pong', () => {
      ws.isAlive = true
    })
  }

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate()
        continue
      }
      ws.isAlive = false
      ws.ping()
    }
  }, 30000)
  heartbeat.unref()
  wss.on('close', () => clearInterval(heartbeat))

  server.on('upgrade', (request, socket, head) => {
    let url
    try {
      url = new URL(request.url, `http://${request.headers.host}`)
    } catch {
      rejectUpgrade(socket, 400, 'Bad Request')
      return
    }

    if (wss.clients.size >= maxConnections) {
      rejectUpgrade(socket, 503, 'Service Unavailable')
      return
    }

    if (url.pathname === '/api/voice/ws') {
      if (!isAllowedBrowserOrigin(request)) {
        rejectUpgrade(socket, 403, 'Forbidden')
        return
      }

      wss.handleUpgrade(request, socket, head, ws => {
        markAlive(ws)
        handleVoiceProxy(ws, request, db).catch(error => {
          console.error('Voice WebSocket setup failed:', error.message)
          if (ws.readyState === WebSocket.OPEN) ws.close(1011, 'Voice service unavailable')
        })
      })
      return
    }

    if (url.pathname === '/api/telnyx/media-stream') {
      const streamToken = url.searchParams.get('token')
      const expectedToken = process.env.INTERNAL_CRON_SECRET
      if (!expectedToken || streamToken !== expectedToken) {
        rejectUpgrade(socket, 403, 'Forbidden')
        return
      }
      wss.handleUpgrade(request, socket, head, ws => {
        markAlive(ws)
        handleTelnyxMediaStream(ws, db)
      })
      return
    }

    rejectUpgrade(socket, 404, 'Not Found')
  })

  return wss
}

function closeHttpServer(server) {
  return new Promise((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()))
  })
}

function closeWebSockets(wss) {
  return new Promise(resolve => {
    if (!wss) return resolve()

    for (const client of wss.clients) client.close(1001, 'Server shutting down')
    const terminateTimer = setTimeout(() => {
      for (const client of wss.clients) client.terminate()
    }, 2000)
    terminateTimer.unref()

    wss.close(() => {
      clearTimeout(terminateTimer)
      resolve()
    })
  })
}

/** Drain all Node.js resources and only force-exit if graceful shutdown stalls. */
export function setupGracefulShutdown(server, wss, pool, stopQueue) {
  let shuttingDown = false

  const shutdown = async signal => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`\n${signal} received — shutting down gracefully...`)

    const forceTimer = setTimeout(() => {
      console.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
    forceTimer.unref()

    try {
      await Promise.all([
        closeHttpServer(server),
        closeWebSockets(wss),
        stopQueue ? stopQueue() : Promise.resolve()
      ])
      if (pool) await pool.end()
      clearTimeout(forceTimer)
      console.log('Shutdown complete')
      process.exitCode = 0
    } catch (error) {
      clearTimeout(forceTimer)
      console.error('Graceful shutdown failed:', error.message)
      process.exitCode = 1
    }
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'))
  process.once('SIGINT', () => shutdown('SIGINT'))
}
