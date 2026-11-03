import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AIAssistant from '../AIAssistant'
import { AuthProvider, useAuth } from '../../context/AuthContext'

vi.mock('../../config', () => ({ API_URL: '' }))

const fetchMock = vi.fn()
const context = {
  chapterId: 'earliest-memories',
  question: {
    id: 'first-memory',
    question: 'What is your first memory?',
    prompt: 'Remember a place.'
  },
  answer: ''
}
const draftKey = owner => `ai-chat:v2:${owner}:earliest-memories:first-memory`
const legacyKey = 'ai-chat-earliest-memories-first-memory'
const reply = response => ({ ok: true, status: 200, json: async () => ({ response }) })

function storeDraft(owner, text, extra = {}) {
  localStorage.setItem(
    draftKey(owner),
    JSON.stringify({
      version: 2,
      ownerId: String(owner),
      phase: 'interview',
      messages: [{ role: 'user', content: text }],
      gatheredContent: [{ type: 'response', content: text }],
      input: '',
      editableStory: '',
      ...extra
    })
  )
}

async function harness(owner = 1) {
  let auth
  const onClose = vi.fn()
  const onInsertText = vi.fn()
  function Session() {
    auth = useAuth()
    return <AIAssistant context={context} onClose={onClose} onInsertText={onInsertText} />
  }
  const view = render(
    <AuthProvider>
      <Session />
    </AuthProvider>
  )
  await waitFor(() => expect(auth.loading).toBe(false))
  act(() => auth.login({ id: owner }, `synthetic-account-${owner}`))
  return { ...view, auth: () => auth, onClose, onInsertText }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  fetchMock.mockReset().mockResolvedValue({ ok: false, status: 503 })
  vi.stubGlobal('fetch', fetchMock)
})

describe('private writing assistant drafts', () => {
  it('discards ownerless legacy drafts and does not adopt another owner payload', async () => {
    localStorage.setItem(
      legacyKey,
      JSON.stringify({ messages: [{ role: 'user', content: 'Legacy private memoir' }] })
    )
    storeDraft(1, 'Wrong owner private memoir', { ownerId: '2' })
    await harness()
    expect(screen.getByRole('button', { name: 'Begin Conversation' })).toBeInTheDocument()
    expect(screen.queryByText(/private memoir/)).toBeNull()
    expect(localStorage.getItem(legacyKey)).toBeNull()
    expect(localStorage.getItem(draftKey(1))).toBeNull()
  })

  it('hydrates only the signed-in owner and resets state and storage before switching accounts', async () => {
    storeDraft(1, 'Author one private memory', { input: 'Author one unsent note' })
    storeDraft(2, 'Author two private memory')
    const view = await harness()
    expect(screen.getByText('Author one private memory')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Your notes' })).toHaveValue(
      'Author one unsent note'
    )
    act(() => view.auth().login({ id: 2 }, 'synthetic-account-two'))
    expect(screen.queryByText('Author one private memory')).toBeNull()
    expect(screen.getByText('Author two private memory')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Your notes' })).toHaveValue('')
    expect(localStorage.getItem(draftKey(1))).toBeNull()
    expect(localStorage.getItem(draftKey(2))).not.toContain('Author one')
  })

  it.each(['network', 'body'])(
    'aborts and ignores the old account response delayed in its %s',
    async stage => {
      let finish
      let signal
      fetchMock.mockImplementationOnce((_url, options) => {
        signal = options.signal
        if (stage === 'network')
          return new Promise(resolve => {
            finish = resolve
          })
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            new Promise(resolve => {
              finish = resolve
            })
        })
      })
      const view = await harness()
      fireEvent.click(screen.getByRole('button', { name: 'Begin Conversation' }))
      await waitFor(() => expect(finish).toBeTypeOf('function'))
      act(() => view.auth().login({ id: 2 }, 'synthetic-account-two'))
      expect(signal.aborted).toBe(true)
      await act(async () =>
        finish(
          stage === 'network'
            ? reply('Late private account one reply')
            : { response: 'Late private account one reply' }
        )
      )
      expect(screen.queryByText('Late private account one reply')).toBeNull()
      expect(screen.getByRole('button', { name: 'Begin Conversation' })).toBeInTheDocument()
      expect(localStorage.getItem(draftKey(1))).toBeNull()
      expect(localStorage.getItem(draftKey(2))).toBeNull()
      expect(view.onInsertText).not.toHaveBeenCalled()
    }
  )

  it('shows unavailable instead of fabricated replies and preserves editable author notes without AI', async () => {
    const view = await harness()
    fireEvent.click(screen.getByRole('button', { name: 'Begin Conversation' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('writing assistant is unavailable')
    expect(screen.queryByText(/Let's start exploring this memory/)).toBeNull()
    fireEvent.change(screen.getByRole('textbox', { name: 'Your notes' }), {
      target: { value: 'My grandmother taught me to bake.' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Your notes' })).not.toBeDisabled()
    )
    expect(screen.getByText('My grandmother taught me to bake.')).toBeInTheDocument()
    expect(screen.queryByText(/That's great detail/)).toBeNull()
    expect(JSON.parse(localStorage.getItem(draftKey(1))).gatheredContent).toEqual([
      { type: 'response', content: 'My grandmother taught me to bake.' }
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Review my notes without AI' }))
    expect(screen.getByRole('textbox', { name: 'Story draft' })).toHaveValue(
      'My grandmother taught me to bake.'
    )
    fireEvent.change(screen.getByRole('textbox', { name: 'Story draft' }), {
      target: { value: 'My grandmother taught me to bake bread.' }
    })
    expect(JSON.parse(localStorage.getItem(draftKey(1))).editableStory).toBe(
      'My grandmother taught me to bake bread.'
    )
    fireEvent.click(screen.getByRole('button', { name: /Save to My Story/ }))
    expect(view.onInsertText).toHaveBeenCalledWith('My grandmother taught me to bake bread.', true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps a failed compose draft and closes without silently requesting or inserting another AI story', async () => {
    storeDraft(1, 'My own unpolished memory', { phase: 'ready' })
    const view = await harness()
    fireEvent.click(screen.getByRole('button', { name: /Compose My Story/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('writing assistant is unavailable')
    expect(localStorage.getItem(draftKey(1))).toContain('My own unpolished memory')
    fireEvent.click(screen.getByRole('button', { name: 'Close writing assistant' }))
    expect(view.onClose).toHaveBeenCalledOnce()
    expect(view.onInsertText).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('does not leak a late composing reply into the next account or recreate a signed-out draft', async () => {
    storeDraft(1, 'Private author one draft', { phase: 'ready' })
    let finish
    let signal
    fetchMock.mockImplementationOnce((_url, options) => {
      signal = options.signal
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          new Promise(resolve => {
            finish = resolve
          })
      })
    })
    const view = await harness()
    fireEvent.click(screen.getByRole('button', { name: /Compose My Story/ }))
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    await act(async () => view.auth().logout())
    act(() => view.auth().login({ id: 2 }, 'synthetic-account-two'))
    expect(signal.aborted).toBe(true)
    await act(async () => finish({ story: 'Late private composed story' }))
    expect(screen.queryByText('Late private composed story')).toBeNull()
    expect(localStorage.getItem(draftKey(1))).toBeNull()
    expect(localStorage.getItem(draftKey(2))).toBeNull()
    expect(view.onInsertText).not.toHaveBeenCalled()
  })

  it('keeps an edited story visible and saveable after regeneration fails', async () => {
    storeDraft(1, 'Original raw notes', {
      phase: 'review',
      editableStory: 'My corrected names, dates and carefully edited story.'
    })
    const view = await harness()
    expect(screen.getByRole('textbox', { name: 'Story draft' })).toHaveValue(
      'My corrected names, dates and carefully edited story.'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))
    expect(JSON.parse(localStorage.getItem(draftKey(1))).editableStory).toBe(
      'My corrected names, dates and carefully edited story.'
    )
    fireEvent.click(screen.getByRole('button', { name: /Compose My Story/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('writing assistant is unavailable')
    expect(screen.getByRole('textbox', { name: 'Story draft' })).toHaveValue(
      'My corrected names, dates and carefully edited story.'
    )
    expect(screen.queryByRole('button', { name: 'Review my notes without AI' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Save to My Story/ }))
    expect(view.onInsertText).toHaveBeenCalledWith(
      'My corrected names, dates and carefully edited story.',
      true
    )
  })
})
