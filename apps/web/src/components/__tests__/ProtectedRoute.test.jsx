import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'

// Mock the AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

import { useAuth } from '../../context/AuthContext'

function renderProtected(children = <div>Protected Content</div>) {
  return render(
    <MemoryRouter>
      <ProtectedRoute>{children}</ProtectedRoute>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    useAuth.mockReturnValue({ user: { id: 1, email: 'test@test.com' }, loading: false })
    renderProtected(<div>Secret Page</div>)
    expect(screen.getByText('Secret Page')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false })
    renderProtected()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows loading state while checking auth', () => {
    useAuth.mockReturnValue({ user: null, loading: true })
    const { container } = renderProtected()
    // Should show spinner, not the content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })
})
