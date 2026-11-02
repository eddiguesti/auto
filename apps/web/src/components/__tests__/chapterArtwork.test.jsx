import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ChapterIllustration from '../ChapterIllustration'
import QuestionCard from '../QuestionCard'
import AuthenticatedImage from '../AuthenticatedImage'

const { authFetch, identity } = vi.hoisted(() => ({ authFetch: vi.fn(), identity: { id: 1 } }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authFetch,
    user: { id: identity.id },
    token: 'never-put-the-account-token-in-an-image-url'
  })
}))
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const image = () =>
  new Response('private image bytes', { headers: { 'content-type': 'image/png' } })
const path = '/api/chapter-images/file/artwork/1/owned-image'
beforeEach(() => {
  identity.id = 1
  authFetch.mockReset()
  let number = 0
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => `blob:owned-${++number}`)
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('starts one durable generation, waits for completion and displays authenticated image bytes', async () => {
  let started = false,
    polls = 0
  authFetch.mockImplementation(async url => {
    if (url.includes('/generate/')) {
      started = true
      return json({ success: true, jobId: 'owned-job' }, 202)
    }
    if (url === path) return image()
    if (!started) return json({ images: {} })
    return json({
      images: {
        childhood: polls++
          ? { status: 'completed', imageUrl: path }
          : { status: 'generating', imageUrl: null }
      }
    })
  })
  await act(async () =>
    render(<ChapterIllustration chapterId="childhood" stories={[{ answer: 'Our garden.' }]} />)
  )
  fireEvent.click(screen.getByRole('button', { name: 'Generate illustration' }))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2500)
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2500)
  })
  const picture = screen.getByAltText('Illustration for Childhood')
  expect(picture.getAttribute('src')).toBe('blob:owned-1')
  expect(authFetch.mock.calls.filter(([url]) => url.includes('/generate/'))).toHaveLength(1)
  expect(authFetch).toHaveBeenCalledWith(
    path,
    expect.objectContaining({ signal: expect.any(AbortSignal) })
  )
  expect(screen.queryByText(/coming soon/i)).toBeNull()
})

it('resumes a server-side image job after navigation without buying a second generation and releases the blob when hidden', async () => {
  let polls = 0
  authFetch.mockImplementation(async url =>
    url === path
      ? image()
      : json({
          images: {
            childhood: polls++
              ? { status: 'completed', imageUrl: path }
              : { status: 'generating', imageUrl: null }
          }
        })
  )
  let view
  await act(async () => {
    view = render(
      <ChapterIllustration chapterId="childhood" stories={[{ answer: 'Our garden.' }]} />
    )
  })
  expect(screen.getByRole('status').textContent).toContain('Creating your illustration')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2500)
  })
  expect(screen.getByAltText('Illustration for Childhood').getAttribute('src')).toBe('blob:owned-1')
  expect(authFetch.mock.calls.some(([url]) => url.includes('/generate/'))).toBe(false)
  view.unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:owned-1')
})

it('recovers a lost generation response with status reads rather than purchasing another image', async () => {
  let started = false
  authFetch.mockImplementation(async url => {
    if (url.includes('/generate/')) {
      started = true
      throw new TypeError('Connection interrupted')
    }
    if (url === path) return image()
    return json({ images: started ? { childhood: { status: 'completed', imageUrl: path } } : {} })
  })
  await act(async () =>
    render(<ChapterIllustration chapterId="childhood" stories={[{ answer: 'Our garden.' }]} />)
  )
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Generate illustration' }))
  )
  expect(screen.queryByRole('button', { name: 'Generate illustration' })).toBeNull()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Check illustration' })))
  expect(screen.getByAltText('Illustration for Childhood').getAttribute('src')).toBe('blob:owned-1')
  expect(authFetch.mock.calls.filter(([url]) => url.includes('/generate/'))).toHaveLength(1)
})

it('loads mounted memory photos with account credentials and never sends credentials to an external image URL', async () => {
  authFetch.mockImplementation(async () => image())
  await act(async () =>
    render(
      <QuestionCard
        question={{ id: 'q1', question: 'Tell me about the garden.' }}
        answer="Our garden."
        onAnswerChange={() => {}}
        onAskAI={() => {}}
        chapterId="childhood"
        storyId={1}
        photos={[{ id: 1, filename: 'family.png', caption: 'The garden' }]}
        onPhotosChange={() => {}}
      />
    )
  )
  expect(screen.getByAltText('The garden').getAttribute('src')).toBe('blob:owned-1')
  expect(authFetch).toHaveBeenCalledWith(
    '/api/photos/file/family.png',
    expect.objectContaining({ signal: expect.any(AbortSignal) })
  )
  cleanup()
  authFetch.mockClear()
  await act(async () =>
    render(
      <AuthenticatedImage
        src="https://external.example/private.png"
        alt="External image"
        loading="eager"
      />
    )
  )
  expect(authFetch).not.toHaveBeenCalled()
  expect(screen.queryByAltText('External image')).toBeNull()
})
