import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ManualPreviewBanner from '../ManualPreviewBanner'

const preview = vi.hoisted(() => ({ enabled: false }))
vi.mock('../../config', () => ({
  get MANUAL_PREVIEW() {
    return preview.enabled
  }
}))

afterEach(() => {
  cleanup()
  preview.enabled = false
})

describe('manual preview availability', () => {
  it('adds no notice to ordinary deployments', () => {
    render(<ManualPreviewBanner />)
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('keeps a clear, non-dismissible notice for the limited preview', () => {
    preview.enabled = true
    const { rerender } = render(<ManualPreviewBanner />)
    expect(screen.getByRole('note', { name: 'Preview availability' })).toHaveTextContent(
      'Write and save memories and add photos to saved memories.'
    )
    expect(screen.getByRole('note')).toHaveTextContent(
      'AI, voice, email delivery, phone calls and purchases are unavailable.'
    )
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<ManualPreviewBanner />)
    expect(screen.getByRole('note')).toBeVisible()
  })
})
