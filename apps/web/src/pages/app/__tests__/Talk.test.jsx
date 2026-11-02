import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { Buffer } from 'node:buffer'
import Talk from '../Talk'
import { magicConversationKey } from '../../../lib/magicConversation'
vi.mock('../../../components/AudioVisualizer', () => ({
  AudioVisualizer: () => <div>Voice recorder</div>
}))
const raw = 'talk-page-secret'.repeat(4),
  history = [{ role: 'user', content: 'I loved my first day at school.' }]
const token = `e30.${Buffer.from(JSON.stringify({ scope: 'magic_link', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
let key, fetcher
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto)
  sessionStorage.clear()
  key = await magicConversationKey(raw)
  sessionStorage.setItem(
    key,
    JSON.stringify({
      auth: {
        token,
        user: { id: 1, name: 'Mary' },
        prompt: {
          text: 'Your first day at school',
          chapter_id: 'earliest-memories',
          question_id: 'school'
        }
      },
      sessionId: 42,
      history
    })
  )
  fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
})
const view = () =>
  render(
    <MemoryRouter initialEntries={[`/talk/${raw}`]}>
      <Routes>
        <Route path="/talk/:token" element={<Talk />} />
      </Routes>
    </MemoryRouter>
  )
it('keeps the draft and hides the saved thank-you until transcript and end requests both succeed', async () => {
  fetcher.mockResolvedValueOnce(Response.json({ error: 'Storage unavailable' }, { status: 503 }))
  view()
  fireEvent.click(await screen.findByText('Save my story'))
  expect(await screen.findByText('Storage unavailable')).toBeInTheDocument()
  expect(screen.queryByText('Thank you!')).toBeNull()
  expect(JSON.parse(sessionStorage.getItem(key)).history).toEqual(history)
  fetcher
    .mockResolvedValueOnce(Response.json({ success: true, story_id: 17 }))
    .mockResolvedValueOnce(Response.json({ success: true }))
  fireEvent.click(screen.getByText('Save my story'))
  expect(await screen.findByText('Thank you!')).toBeInTheDocument()
  expect(JSON.parse(sessionStorage.getItem(key)).history).toEqual([])
  expect(fetcher.mock.calls[0][0]).toContain('/transcript')
  expect(fetcher.mock.calls[2][0]).toContain('/end-session')
})
it('never shows a saved confirmation when ending fails after the text acknowledgement', async () => {
  fetcher
    .mockResolvedValueOnce(Response.json({ success: true, story_id: 17 }))
    .mockResolvedValueOnce(new Response('failed', { status: 503 }))
  view()
  fireEvent.click(await screen.findByText('Save my story'))
  expect(
    await screen.findByText(/text was saved, but the interview could not be finished/)
  ).toBeInTheDocument()
  expect(screen.queryByText('Thank you!')).toBeNull()
  expect(JSON.parse(sessionStorage.getItem(key)).history).toEqual(history)
  await waitFor(() => expect(screen.getByText('Save my story')).toBeInTheDocument())
})
