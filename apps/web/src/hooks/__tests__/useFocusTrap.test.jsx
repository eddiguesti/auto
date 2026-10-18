import { useRef, useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFocusTrap } from '../useFocusTrap'

function FixtureModal() {
  const ref = useRef(null)
  const [nextStep, setNextStep] = useState(false)
  useFocusTrap(ref)
  return (
    <div ref={ref}>
      {nextStep ? (
        <>
          <button>New first</button>
          <button>New last</button>
        </>
      ) : (
        <>
          <button onClick={() => setNextStep(true)}>Next step</button>
          <button>Old last</button>
        </>
      )}
    </div>
  )
}

describe('modal focus across changing steps', () => {
  it('traps focus among the current controls after a step replaces the old buttons', () => {
    render(<FixtureModal />)
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    const first = screen.getByRole('button', { name: 'New first' })
    const last = screen.getByRole('button', { name: 'New last' })
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
  })

  it('returns focus to the control that opened the dialog', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const { unmount } = render(<FixtureModal />)
    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })
})
