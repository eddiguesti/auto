// Scoped email credentials and unsaved speech stay in this tab. The opaque
// email secret is hashed before it becomes a storage key.
const exchanges = new Map()
export async function magicConversationKey(link) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(link))
  )
  return `memoir-magic:${Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')}`
}
export function readMagicConversation(key, storage = sessionStorage) {
  try {
    return JSON.parse(storage.getItem(key) || '{}')
  } catch {
    return {}
  }
}
export function writeMagicConversation(key, value, storage = sessionStorage) {
  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
function activeCredential(value) {
  try {
    const part = value?.token?.split('.')[1]
    const claims = JSON.parse(atob(part.replaceAll('-', '+').replaceAll('_', '/')))
    return (
      claims.scope === 'magic_link' && claims.exp * 1000 > Date.now() && value.user && value.prompt
    )
  } catch {
    return false
  }
}
export function exchangeMagicConversation(link, origin, fetcher = fetch, storage = sessionStorage) {
  if (exchanges.has(link)) return exchanges.get(link)
  const pending = (async () => {
    const key = await magicConversationKey(link),
      saved = readMagicConversation(key, storage)
    if (activeCredential(saved.auth)) return { ...saved, storageKey: key }
    const response = await fetcher(`${origin}/api/magic/${encodeURIComponent(link)}`)
    if (!response.ok) {
      const error = new Error(
        'This link is no longer valid. Please check your email for a new one.'
      )
      error.expired = response.status === 404
      error.draft = saved
      throw error
    }
    const auth = await response.json()
    if (!activeCredential(auth)) throw new Error('Invalid email session response')
    const value = { ...saved, auth }
    writeMagicConversation(key, value, storage)
    return { ...value, storageKey: key }
  })()
  exchanges.set(link, pending)
  pending
    .finally(() => {
      if (exchanges.get(link) === pending) exchanges.delete(link)
    })
    .catch(() => {})
  return pending
}
export async function saveMagicConversation({
  origin,
  link,
  auth,
  sessionId,
  history,
  fetcher = fetch
}) {
  const user = history
    .filter(item => item.role === 'user')
    .map(item => item.content)
    .join('\n\n')
    .trim()
  const assistant = history
    .filter(item => item.role === 'assistant')
    .map(item => item.content)
    .join('\n\n')
  if (!user) throw new Error('No spoken memory has been received yet. Please try speaking again.')
  const headers = { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' }
  const saved = await fetcher(`${origin}/api/magic/${encodeURIComponent(link)}/transcript`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id: sessionId, user_transcript: user, ai_transcript: assistant })
  })
  if (!saved.ok) {
    const error = await saved.json().catch(() => ({}))
    throw new Error(
      error.error || 'Your story is kept in this tab. Check your connection and try saving again.'
    )
  }
  const result = await saved.json()
  if (result.success !== true)
    throw new Error('The server did not confirm your story was saved. Please retry.')
  const ended = await fetcher(`${origin}/api/magic/${encodeURIComponent(link)}/end-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id: sessionId })
  })
  if (!ended.ok)
    throw new Error('Your text was saved, but the interview could not be finished. Please retry.')
  const end = await ended.json()
  if (end.success !== true)
    throw new Error('Your text was saved, but the interview could not be finished. Please retry.')
  return result
}
