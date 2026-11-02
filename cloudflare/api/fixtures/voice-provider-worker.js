// Deterministic provider double for actual workerd WebSocket tests only.
let connections = 0
export default {
  fetch(request) {
    if (new URL(request.url).pathname === '/connections') return Response.json({ connections })
    if (
      request.headers.get('Upgrade')?.toLowerCase() !== 'websocket' ||
      request.headers.get('Authorization') !== 'Bearer fake-native-voice-key'
    )
      return new Response('Rejected', { status: 403 })
    connections++
    const [client, server] = Object.values(new globalThis.WebSocketPair())
    server.accept()
    server.addEventListener('message', event =>
      server.send(typeof event.data === 'string' ? event.data : event.data)
    )
    return new Response(null, { status: 101, webSocket: client })
  }
}
