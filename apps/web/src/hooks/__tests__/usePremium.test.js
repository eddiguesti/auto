import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePremium } from '../usePremium'

// Mock the AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

import { useAuth } from '../../context/AuthContext'

describe('usePremium', () => {
  it('returns true when user has active premium', () => {
    useAuth.mockReturnValue({ user: { id: 1, isPremium: true } })
    const { result } = renderHook(() => usePremium())
    expect(result.current.isPremium).toBe(true)
  })

  it('returns false when premium expired', () => {
    useAuth.mockReturnValue({ user: { id: 1, isPremium: false } })
    const { result } = renderHook(() => usePremium())
    expect(result.current.isPremium).toBe(false)
  })

  it('returns false when no user', () => {
    useAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => usePremium())
    expect(result.current.isPremium).toBe(false)
  })

  it('earliest-memories chapter is always unlocked', () => {
    useAuth.mockReturnValue({ user: { id: 1, isPremium: false } })
    const { result } = renderHook(() => usePremium())
    expect(result.current.isChapterLocked('earliest-memories')).toBe(false)
  })

  it('non-free chapters are locked for non-premium users', () => {
    useAuth.mockReturnValue({ user: { id: 1, isPremium: false } })
    const { result } = renderHook(() => usePremium())
    expect(result.current.isChapterLocked('childhood')).toBe(true)
    expect(result.current.isChapterLocked('school-days')).toBe(true)
  })

  it('all chapters are unlocked for premium users', () => {
    useAuth.mockReturnValue({ user: { id: 1, isPremium: true } })
    const { result } = renderHook(() => usePremium())
    expect(result.current.isChapterLocked('childhood')).toBe(false)
    expect(result.current.isChapterLocked('school-days')).toBe(false)
  })

  it('exports FREE_CHAPTER_ID constant', () => {
    useAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => usePremium())
    expect(result.current.FREE_CHAPTER_ID).toBe('earliest-memories')
  })
})
