// WebSocket URLs carry only a short-lived, single-use voice ticket. Account
// bearer credentials stay in authenticated HTTPS requests.
export function voiceSocketUrl(ticket, origin = window.location.origin) {
  if (typeof ticket !== 'string' || !ticket.trim() || ticket.length > 8192)
    throw new Error('No voice connection ticket received. Please reconnect.')
  const url = new URL('/api/voice/ws', origin)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid voice server URL')
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('ticket', ticket)
  return url.toString()
}
