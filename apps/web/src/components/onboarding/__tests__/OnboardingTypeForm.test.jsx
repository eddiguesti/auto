import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OnboardingTypeForm from '../OnboardingTypeForm'

describe('accessible typed onboarding', () => {
  it('lets labelled controls submit the existing context contract', async () => {
    const onSubmit = vi.fn(async () => {})
    render(<OnboardingTypeForm onSubmit={onSubmit} onBack={() => {}} />)
    fireEvent.change(screen.getByLabelText("What's your name?"), { target: { value: ' Alex ' } })
    fireEvent.change(screen.getByLabelText('Where were you born?'), { target: { value: 'York' } })
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'England' } })
    fireEvent.change(screen.getByLabelText('What year were you born?'), {
      target: { value: '1980' }
    })
    fireEvent.change(screen.getByLabelText(/anything else/i), { target: { value: 'Our garden' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Alex',
        birthPlace: 'York',
        birthCountry: 'England',
        birthYear: 1980,
        additionalContext: 'Our garden'
      })
    )
  })
})
