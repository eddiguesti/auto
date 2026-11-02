import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readDraft, useDraftAutosave } from '../useDraftAutosave'

function Editor({ save, delay = 10000 }) {
  const draft = useDraftAutosave({ draftKey: 'test:user:1:chapter:a', save, delay })
  return (
    <>
      <button onClick={() => draft.update('q', 'A private memory')}>Edit</button>
      <button onClick={() => draft.flush()}>Retry</button>
      <p role="status">{draft.status}</p>
      {draft.error && <p role="alert">{draft.error}</p>}
      <Link to="/next">Next chapter</Link>
    </>
  )
}
const view = (save, strict = false) =>
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={
            strict ? (
              <StrictMode>
                <Editor save={save} />
              </StrictMode>
            ) : (
              <Editor save={save} />
            )
          }
        />
        <Route path="/next" element={<p>Next chapter loaded</p>} />
      </Routes>
    </MemoryRouter>
  )
beforeEach(() => sessionStorage.clear())
describe('recoverable editor autosave', () => {
  it('flushes a pending edit before internal navigation and removes only the saved draft', async () => {
    let complete
    const save = vi.fn(
      () =>
        new Promise(resolve => {
          complete = resolve
        })
    )
    view(save)
    fireEvent.click(screen.getByText('Edit'))
    expect(readDraft('test:user:1:chapter:a').q).toBe('A private memory')
    fireEvent.click(screen.getByText('Next chapter'))
    expect(screen.queryByText('Next chapter loaded')).toBeNull()
    expect(save).toHaveBeenCalledWith('q', 'A private memory')
    await act(async () => complete())
    expect(await screen.findByText('Next chapter loaded')).toBeInTheDocument()
    expect(readDraft('test:user:1:chapter:a')).toEqual({})
  })
  it('keeps the user and draft on a failed save, then permits retry', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    view(save)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByText('Next chapter'))
    expect(await screen.findByRole('alert')).toHaveTextContent('kept in this tab')
    expect(screen.queryByText('Next chapter loaded')).toBeNull()
    expect(readDraft('test:user:1:chapter:a').q).toBe('A private memory')
    fireEvent.click(screen.getByText('Next chapter'))
    expect(await screen.findByText('Next chapter loaded')).toBeInTheDocument()
    expect(save).toHaveBeenCalledTimes(2)
  })
  it('recovers an interrupted draft on remount, including StrictMode effect replay', async () => {
    sessionStorage.setItem('test:user:1:chapter:a', JSON.stringify({ q: 'Recovered memory' }))
    const save = vi.fn().mockResolvedValue(undefined)
    view(save, true)
    await waitFor(() => expect(save).toHaveBeenCalledWith('q', 'Recovered memory'))
    await waitFor(() => expect(readDraft('test:user:1:chapter:a')).toEqual({}))
    expect(save).toHaveBeenCalledTimes(1)
  })
})
