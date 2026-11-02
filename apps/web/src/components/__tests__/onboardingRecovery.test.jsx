import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import OnboardingModal from '../OnboardingModal'
const { authFetch, refreshUser, identity } = vi.hoisted(() => ({
  authFetch: vi.fn(),
  refreshUser: vi.fn(),
  identity: { id: 1 }
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ authFetch, refreshUser, user: { id: identity.id, name: 'One' } })
}))
vi.mock('framer-motion', () => ({
  useReducedMotion: () => true,
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: { div: ({ children, className }) => <div className={className}>{children}</div> }
}))
vi.mock('../onboarding/OnboardingVoiceInterview', () => ({
  default: ({ onComplete }) => (
    <button
      onClick={() =>
        onComplete([{ role: 'user', content: 'My sister and I grew up by the river.' }])
      }
    >
      Finish interview
    </button>
  )
}))
vi.mock('../onboarding/ChannelSelector', () => ({
  default: ({ onComplete }) => (
    <div>
      <h2>Choose channels</h2>
      <button onClick={() => onComplete(['webapp'])}>Save channels</button>
    </div>
  )
}))
vi.mock('../onboarding/OnboardingOffer', () => ({
  default: ({ onTryFree }) => (
    <div>
      <h2>Memoir offer</h2>
      <button onClick={onTryFree}>Try free</button>
    </div>
  )
}))
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
beforeEach(() => {
  sessionStorage.clear()
  identity.id = 1
  authFetch.mockReset()
  refreshUser.mockReset()
  refreshUser.mockResolvedValue(undefined)
})

it('retains failed voice transcripts across remount and advances only after an explicit successful retry', async () => {
  let failed = true
  authFetch.mockImplementation(() =>
    Promise.resolve(
      failed
        ? json({ error: 'Provider unavailable' }, 502)
        : json({ userName: 'One', extracted: { birth_place: 'York' } })
    )
  )
  const view = render(<OnboardingModal onClose={() => {}} initialStep="voice_interview" />)
  fireEvent.click(screen.getByRole('button', { name: 'Finish interview' }))
  await screen.findByRole('button', { name: 'Retry saving details' })
  expect(screen.queryByText('Choose channels')).toBeNull()
  const key = 'memoir-draft:1:onboarding',
    saved = JSON.parse(sessionStorage.getItem(key))
  expect(saved.payload.transcripts[0].content).toContain('the river')
  const requestId = saved.requestId
  view.unmount()
  failed = false
  render(<OnboardingModal onClose={() => {}} />)
  expect(authFetch).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving details' }))
  await screen.findByText('Choose channels')
  expect(sessionStorage.getItem(key)).toBeNull()
  expect(authFetch.mock.calls[1][1].headers['Idempotency-Key']).toBe(requestId)
  expect(authFetch.mock.calls[1][1].body).toBe(authFetch.mock.calls[0][1].body)
})

it('keeps typed details after a non-OK save, lets the author edit them and does not retry a committed save after profile refresh failure', async () => {
  let failed = true
  authFetch.mockImplementation(() =>
    Promise.resolve(failed ? json({ error: 'Check your country' }, 400) : json({ userName: 'One' }))
  )
  refreshUser.mockRejectedValue(new Error('Temporary profile refresh error'))
  render(<OnboardingModal onClose={() => {}} initialStep="type_form" />)
  fireEvent.change(screen.getByLabelText("What's your name?"), { target: { value: 'One' } })
  fireEvent.change(screen.getByLabelText('Where were you born?'), { target: { value: 'York' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByText('Check your country')
  expect(screen.queryByText('Choose channels')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Edit your details' }))
  expect(screen.getByLabelText('Where were you born?').value).toBe('York')
  fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'England' } })
  failed = false
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByText('Choose channels')
  expect(JSON.parse(authFetch.mock.calls[1][1].body).birthCountry).toBe('England')
  expect(authFetch).toHaveBeenCalledTimes(2)
})

it('requires channel preferences and onboarding completion to save before showing the next step', async () => {
  let failed = true
  authFetch.mockImplementation(() =>
    Promise.resolve(failed ? json({ error: 'Offline' }, 503) : json({ success: true }))
  )
  render(<OnboardingModal onClose={() => {}} initialStep="channel_selection" />)
  fireEvent.click(screen.getByRole('button', { name: 'Save channels' }))
  await screen.findByRole('button', { name: 'Retry saving details' })
  expect(screen.queryByText('Memoir offer')).toBeNull()
  failed = false
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving details' }))
  await screen.findByText('Memoir offer')
  failed = true
  fireEvent.click(screen.getByRole('button', { name: 'Try free' }))
  await screen.findByRole('button', { name: 'Retry saving details' })
  expect(screen.queryByText(/you're all set/i)).toBeNull()
  failed = false
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving details' }))
  await screen.findByText(/you're all set/i)
})

it('does not expose another account pending interview when the signed-in account changes', async () => {
  sessionStorage.setItem(
    'memoir-draft:1:onboarding',
    JSON.stringify({
      kind: 'voice',
      payload: { transcripts: [{ role: 'user', content: 'Private family story' }] }
    })
  )
  const view = render(<OnboardingModal onClose={() => {}} />)
  expect(screen.getByRole('button', { name: 'Retry saving details' })).toBeTruthy()
  identity.id = 2
  view.rerender(<OnboardingModal onClose={() => {}} />)
  await waitFor(() =>
    expect(screen.getByRole('button', { name: "Let's Get Started" })).toBeTruthy()
  )
  expect(screen.queryByRole('button', { name: 'Retry saving details' })).toBeNull()
  expect(authFetch).not.toHaveBeenCalled()
})
