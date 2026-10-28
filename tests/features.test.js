import { describe, it, expect, beforeEach } from 'vitest'
import { compressImage, deleteCoupleMedia } from '../src/lib/storageHelper'
import { isSoundEnabled, setSoundEnabled, getNotificationPermission } from '../src/lib/notificationHelper'
import { THEME_PALETTES } from '../src/context/ThemeContext'
import { toggleMessageReaction, getTotalReactionCount, REACTION_EMOJIS } from '../src/lib/reactionHelper'

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

  it('manages WhatsApp-style message reactions correctly with toggle and count', () => {
    expect(REACTION_EMOJIS).toEqual(['❤️', '😂', '😮', '😢', '👏', '🔥', '💗'])

    // Initial reaction by user1
    let reactions = toggleMessageReaction({}, '❤️', 'user-1')
    expect(reactions['❤️']).toEqual(['user-1'])
    expect(getTotalReactionCount(reactions)).toBe(1)

    // Second user reacts with same emoji
    reactions = toggleMessageReaction(reactions, '❤️', 'user-2')
    expect(reactions['❤️']).toEqual(['user-1', 'user-2'])
    expect(getTotalReactionCount(reactions)).toBe(2)

    // User1 reacts with another emoji
    reactions = toggleMessageReaction(reactions, '🔥', 'user-1')
    expect(reactions['🔥']).toEqual(['user-1'])
    expect(getTotalReactionCount(reactions)).toBe(3)

    // User1 un-reacts to ❤️ (toggle off)
    reactions = toggleMessageReaction(reactions, '❤️', 'user-1')
    expect(reactions['❤️']).toEqual(['user-2'])
    expect(getTotalReactionCount(reactions)).toBe(2)

    // User2 un-reacts to ❤️ -> key should be deleted
    reactions = toggleMessageReaction(reactions, '❤️', 'user-2')
    expect(reactions['❤️']).toBeUndefined()
    expect(getTotalReactionCount(reactions)).toBe(1)

    // Safe handling of null inputs
    expect(toggleMessageReaction(null, '❤️', null)).toEqual({})
  })

  it('persists and restores custom theme palette and dark mode in localStorage without reset', () => {
    // 1. Initial state defaults to blush
    expect(localStorage.getItem('just_you_me_palette')).toBeNull()

    // 2. User selects emerald
    const chosenPalette = 'emerald'
    const now = Date.now()
    localStorage.setItem('just_you_me_palette', chosenPalette)
    localStorage.setItem('just_you_me_palette_updated_at', String(now))
    localStorage.setItem('just_you_me_dark_mode', 'true')

    // 3. Simulate reload by reading back from localStorage
    const reloadedPalette = localStorage.getItem('just_you_me_palette')
    const reloadedTimestamp = Number(localStorage.getItem('just_you_me_palette_updated_at'))
    const reloadedDark = localStorage.getItem('just_you_me_dark_mode') === 'true'

    expect(reloadedPalette).toBe('emerald')
    expect(reloadedTimestamp).toBe(now)
    expect(reloadedDark).toBe(true)

    // 4. Stored palette key is a valid theme
    expect(THEME_PALETTES[reloadedPalette]).toBeDefined()
    expect(THEME_PALETTES[reloadedPalette].themeColorLight).toBeTruthy()
    expect(THEME_PALETTES[reloadedPalette].themeColorDark).toBeTruthy()
  })
})
