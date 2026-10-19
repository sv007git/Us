import { describe, it, expect, beforeEach } from 'vitest'
import { compressImage, deleteCoupleMedia } from '../src/lib/storageHelper'
import { isSoundEnabled, setSoundEnabled, getNotificationPermission } from '../src/lib/notificationHelper'
import { THEME_PALETTES } from '../src/context/ThemeContext'

describe('New Features - Compression, Notifications, Themes & Media Management', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('compresses non-image files by returning original file untouched', async () => {
    const mockPdf = { name: 'letter.pdf', type: 'application/pdf', size: 1024 }
    const result = await compressImage(mockPdf)
    expect(result).toBe(mockPdf)
  })

  it('preserves GIF animations without compressing', async () => {
    const mockGif = { name: 'love.gif', type: 'image/gif', size: 2048 }
    const result = await compressImage(mockGif)
    expect(result).toBe(mockGif)
  })

  it('supports sound notification enable and disable toggle in localStorage', () => {
    expect(isSoundEnabled()).toBe(true)
    setSoundEnabled(false)
    expect(isSoundEnabled()).toBe(false)
    setSoundEnabled(true)
    expect(isSoundEnabled()).toBe(true)
  })

  it('returns valid notification permission status or unsupported in test runner', () => {
    const perm = getNotificationPermission()
    expect(['granted', 'denied', 'default', 'unsupported']).toContain(perm)
  })

  it('contains all 7 romantic color theme palettes with preview palettes', () => {
    const expectedKeys = ['blush', 'rose', 'lavender', 'midnight', 'sunset', 'ocean', 'emerald']
    expectedKeys.forEach((key) => {
      expect(THEME_PALETTES[key]).toBeDefined()
      expect(THEME_PALETTES[key].name).toBeTruthy()
      expect(THEME_PALETTES[key].appBg).toBeTruthy()
      expect(Array.isArray(THEME_PALETTES[key].preview)).toBe(true)
      expect(THEME_PALETTES[key].preview.length).toBeGreaterThan(0)
    })
  })

  it('handles deleteCoupleMedia safely with null or empty path', async () => {
    const res = await deleteCoupleMedia(null)
    expect(res).toBe(false)
  })
})
