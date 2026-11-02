import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import AudioVisualizer from '../AudioVisualizer/AudioVisualizer'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('keeps voice UI mounted without throwing or scheduling a failed animation loop when canvas is unavailable', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  let draw
  const request = vi.fn(callback => {
    draw = callback
    return 1
  })
  vi.stubGlobal('requestAnimationFrame', request)
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const view = render(<AudioVisualizer />)
  expect(() => act(() => draw())).not.toThrow()
  expect(request).toHaveBeenCalledOnce()
  expect(view.container.querySelector('canvas')).toBeInTheDocument()
})
