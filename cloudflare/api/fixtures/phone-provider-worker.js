// Deliberate, deterministic PCMU voice provider double for actual workerd tests.
const messages = []
export default {
  fetch(request) {
    if (new URL(request.url).pathname === '/messages') return Response.json(messages)
    if (
      request.headers.get('Upgrade') !== 'websocket' ||
      request.headers.get('Authorization') !== 'Bearer fake-phone-voice-key'
    )
      return new Response('Rejected', { status: 403 })
    const [client, server] = Object.values(new globalThis.WebSocketPair())
    server.accept()
    server.addEventListener('message', event => {
      const data = JSON.parse(event.data)
      messages.push(data)
      if (data.type === 'input_audio_buffer.append') {
        const id = data.audio.slice(0, 16)
        server.send(
          JSON.stringify({
            type: 'conversation.item.input_audio_transcription.completed',
            item_id: id,
            transcript: 'I remember the old garden.'
          })
        )
        server.send(
          JSON.stringify({ type: 'response.output_audio.delta', delta: btoa('\xff'.repeat(160)) })
        )
      }
    })
    return new Response(null, { status: 101, webSocket: client })
  }
}
