import { beforeEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { Buffer } from 'node:buffer'
import {
  exchangeMagicConversation,
  magicConversationKey,
  readMagicConversation,
  saveMagicConversation,
  writeMagicConversation
} from '../magicConversation'
const auth = {
  token: `e30.${Buffer.from(JSON.stringify({ scope: 'magic_link', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`,
  user: { id: 1, name: 'Writer' },
  prompt: { text: 'Your school days', chapter_id: 'earliest-memories', question_id: 'school' }
}
let storage
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  const values = new Map()
  storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  }
})
it('shares a one-time exchange across concurrent mounts and restores scoped credentials and draft from tab storage', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json(auth)),
    link = 'one-time-secret'.repeat(4)
  const [first, second] = await Promise.all([
    exchangeMagicConversation(link, 'https://app.invalid', fetcher, storage),
    exchangeMagicConversation(link, 'https://app.invalid', fetcher, storage)
  ])
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(first.auth).toEqual(second.auth)
  expect(first.storageKey).not.toContain(link)
  writeMagicConversation(
    first.storageKey,
    { auth, sessionId: 42, history: [{ role: 'user', content: 'A school memory' }] },
    storage
  )
  const restored = await exchangeMagicConversation(link, 'https://app.invalid', fetcher, storage)
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(restored.sessionId).toBe(42)
  expect(restored.history[0].content).toBe('A school memory')
})
it('retains the original draft when an expired credential cannot exchange its already-used email link', async () => {
  const link = 'expired-secret'.repeat(4),
    key = await magicConversationKey(link),
    history = [{ role: 'user', content: 'Keep my story' }]
  writeMagicConversation(key, { auth: { ...auth, token: 'expired' }, history }, storage)
  const fetcher = vi.fn().mockResolvedValue(new Response('expired', { status: 404 }))
  await expect(
    exchangeMagicConversation(link, 'https://app.invalid', fetcher, storage)
  ).rejects.toMatchObject({ expired: true, draft: { history } })
  expect(readMagicConversation(key, storage).history).toEqual(history)
})
it('does not finish the interview or discard any history when the transcript HTTP save fails', async () => {
  const history = [
      { role: 'user', content: 'A private memory' },
      { role: 'assistant', content: 'Tell me more' }
    ],
    fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ error: 'Storage unavailable' }, { status: 503 }))
  await expect(
    saveMagicConversation({
      origin: 'https://app.invalid',
      link: 'secret',
      auth: 'scoped-token',
      sessionId: 42,
      history,
      fetcher
    })
  ).rejects.toThrow('Storage unavailable')
  expect(fetcher).toHaveBeenCalledTimes(1)
  const [url, options] = fetcher.mock.calls[0]
  expect(url).toContain('/transcript')
  expect(JSON.parse(options.body)).toEqual({
    session_id: 42,
    user_transcript: 'A private memory',
    ai_transcript: 'Tell me more'
  })
  expect(history).toHaveLength(2)
})
it('requires positive transcript and end acknowledgements before reporting a saved conversation', async () => {
  const input = {
    origin: 'https://app.invalid',
    link: 'secret',
    auth: 'scoped-token',
    sessionId: 42,
    history: [{ role: 'user', content: 'A memory' }]
  }
  const failEnd = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ success: true }))
    .mockResolvedValueOnce(new Response('failed', { status: 503 }))
  await expect(saveMagicConversation({ ...input, fetcher: failEnd })).rejects.toThrow(
    'could not be finished'
  )
  const success = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ success: true, story_id: 17 }))
    .mockResolvedValueOnce(Response.json({ success: true }))
  await expect(saveMagicConversation({ ...input, fetcher: success })).resolves.toMatchObject({
    story_id: 17
  })
  expect(success.mock.calls[1][0]).toContain('/end-session')
})
