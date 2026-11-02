import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AdminPayments from '../Payments'

const { authFetch } = vi.hoisted(() => ({ authFetch: vi.fn() }))
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ authFetch }) }))
const json = (body, status = 200) => new Response(JSON.stringify(body), { status })
let refundState, result
beforeEach(() => {
  refundState = null
  result = json({ success: true, status: 'succeeded' })
  authFetch.mockReset()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  authFetch.mockImplementation(async url => {
    if (url.includes('/refunds/')) return result
    return json({
      payments: [
        {
          id: 1,
          user_id: 1,
          user_name: 'One',
          product_type: 'premium_bundle',
          amount: 25000,
          status: 'completed',
          refund_state: refundState,
          created_at: '2026-11-03'
        }
      ],
      meta: { total: 1, page: 1, limit: 20 }
    })
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
async function mount() {
  await act(async () =>
    render(
      <MemoryRouter>
        <AdminPayments />
      </MemoryRouter>
    )
  )
}

it('keeps a pending Stripe refund distinct from a refunded payment and prevents another submission', async () => {
  await mount()
  refundState = 'pending'
  result = json(
    {
      success: false,
      status: 'pending',
      message: 'Stripe is still processing the refund. The payment has not been marked refunded.'
    },
    202
  )
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Refund' })))
  expect(window.confirm).toHaveBeenCalledWith(
    expect.stringContaining('only after Stripe confirms success')
  )
  expect(screen.getByRole('status')).toHaveTextContent('has not been marked refunded')
  expect(screen.getByText('Refund pending')).toBeInTheDocument()
  expect(screen.getByText('completed')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Refund' })).toBeNull()
})

it('shows an uncertain provider outcome as review required without repeating the financial request', async () => {
  await mount()
  result = json({ code: 'REFUND_RECONCILIATION_REQUIRED', error: 'Refund outcome unknown' }, 503)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Refund' })))
  expect(screen.getByRole('status')).toHaveTextContent('Do not submit another refund')
  expect(screen.getByText('Refund needs review')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Refund' })).toBeNull()
  expect(authFetch.mock.calls.filter(([url]) => url.includes('/refunds/'))).toHaveLength(1)
})
