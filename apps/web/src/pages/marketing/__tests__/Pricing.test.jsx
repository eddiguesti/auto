import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Pricing from '../Pricing'

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(async () => ({
    ok: false,
    json: async () => ({ error: 'Checkout temporarily unavailable' })
  }))
}))
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'fixture' }, authFetch: mocks.authFetch })
}))
vi.mock('../../../features/payments/queries/catalogQueries', () => ({
  useProductCatalog: () => ({
    data: [
      {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        price: 999,
        currency: 'gbp',
        type: 'subscription',
        interval: 'month',
        checkoutAvailable: false
      },
      {
        id: 'premium_bundle',
        name: 'Premium Bundle',
        price: 29900,
        currency: 'gbp',
        type: 'premium_bundle',
        checkoutAvailable: true
      }
    ]
  }),
  formatProductPrice: product => (product.id === 'premium_monthly' ? '£9.99' : '£299')
}))

describe('catalogue checkout availability', () => {
  it('shows the authoritative recurring price without allowing an unavailable membership to charge', async () => {
    render(
      <MemoryRouter>
        <HelmetProvider>
          <Pricing />
        </HelmetProvider>
      </MemoryRouter>
    )
    const membership = screen.getByRole('heading', { name: 'Premium Monthly' }).closest('article')
    expect(within(membership).getByText('£9.99')).toBeInTheDocument()
    expect(within(membership).queryByRole('button')).toBeNull()
    expect(membership).toHaveTextContent('not available to purchase yet')
    fireEvent.click(screen.getByRole('button', { name: /choose this option/i }))
    await waitFor(() =>
      expect(mocks.authFetch).toHaveBeenCalledWith(
        '/api/payments/create-checkout',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('premium_bundle') })
      )
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Checkout temporarily unavailable')
  })
})
