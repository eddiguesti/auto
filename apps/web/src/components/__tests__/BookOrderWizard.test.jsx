import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import BookOrderWizard from '../BookOrderWizard'

const mocks = vi.hoisted(() => ({ authFetch: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Alice', email: 'alice@example.com' },
    authFetch: mocks.authFetch
  })
}))
let printStatus
beforeEach(() => {
  printStatus = { available: true, hasEntitlement: true, orders: [] }
  mocks.authFetch
    .mockReset()
    .mockImplementation(async path => ({
      ok: true,
      json: async () =>
        path === '/api/print/status'
          ? printStatus
          : path === '/api/stories/all'
            ? []
            : { id: 'proof-1', pageCount: 100, colourPages: 0 },
      blob: async () => new Blob(['PDF'])
    }))
  window.history.replaceState({}, '', '/')
})
describe('ten-hardback package', () => {
  it('shows the fixed complete price and requires downloads plus approval before submitting', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:proof')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<BookOrderWizard userName="Alice" onClose={() => {}} />)
    expect(
      await screen.findByRole('button', { name: 'Prepare my print proof' })
    ).toBeInTheDocument()
    expect(screen.getByText('£250')).toBeInTheDocument()
    expect(screen.getByText('10 hardbacks for the price of 5')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Prepare my print proof' }))
    const approve = await screen.findByRole('checkbox', { name: /I have reviewed both PDFs/ })
    expect(approve).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Download interior proof' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Download cover proof' })).not.toBeDisabled()
    )
    expect(mocks.authFetch).toHaveBeenCalledWith('/api/print/proof-1/proof/text')
    fireEvent.click(screen.getByRole('button', { name: 'Download cover proof' }))
    await waitFor(() => expect(approve).not.toBeDisabled())
    fireEvent.change(screen.getByLabelText('Address line 1'), {
      target: { value: '10 High Street' }
    })
    fireEvent.change(screen.getByLabelText('Town / city'), { target: { value: 'London' } })
    fireEvent.change(screen.getByLabelText('Postcode'), { target: { value: 'SW1A 1AA' } })
    fireEvent.click(approve)
    fireEvent.submit(screen.getByRole('button', { name: /Finish my memoir/ }).closest('form'))
    await waitFor(() =>
      expect(
        mocks.authFetch.mock.calls.some(([path]) => path === '/api/print/proof-1/approve')
      ).toBe(true)
    )
    const [, options] = mocks.authFetch.mock.calls.find(
      ([path]) => path === '/api/print/proof-1/approve'
    )
    expect(JSON.parse(options.body)).toMatchObject({
      approved: true,
      address: { countryCode: 'GB', postCode: 'SW1A 1AA' }
    })
    expect(
      mocks.authFetch.mock.calls.some(([path]) => path === '/api/payments/create-checkout')
    ).toBe(false)
  })
  it('blocks purchases while provider fulfilment is unconfigured', async () => {
    printStatus = { available: false, hasEntitlement: false, orders: [] }
    render(<BookOrderWizard userName="Alice" onClose={() => {}} />)
    expect(await screen.findByText(/Book printing is being set up/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Get the complete package/ })
    ).not.toBeInTheDocument()
  })
  it('does not offer another payment while a paid checkout awaits webhook confirmation', async () => {
    printStatus = { available: true, hasEntitlement: false, orders: [] }
    window.history.replaceState({}, '', '/export?paid=1')
    render(<BookOrderWizard userName="Alice" onClose={() => {}} />)
    expect(await screen.findByText(/Confirming your payment/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Get the complete package/ })
    ).not.toBeInTheDocument()
  })
})
