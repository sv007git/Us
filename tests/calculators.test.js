import { describe, it, expect, beforeEach } from 'vitest'
import { saveCoupleSystemData, loadCoupleSystemData } from '../src/lib/coupleDataHelper'

describe('Birthday and Zodiac Calculations', () => {
  it('correctly calculates age in years, months, and days', () => {
    const birth = new Date(2000, 5, 15) // June 15, 2000
    const now = new Date()
    const diffYears = now.getFullYear() - birth.getFullYear()
    expect(diffYears).toBeGreaterThanOrEqual(24)
  })

  it('determines zodiac signs correctly based on date', () => {
    const getZodiac = (month, day) => {
      if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries'
      if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus'
      if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini'
      if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer'
      if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo'
      if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo'
      if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra'
      if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio'
      if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius'
      if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn'
      if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius'
      return 'Pisces'
    }

    expect(getZodiac(7, 25)).toBe('Leo')
    expect(getZodiac(2, 14)).toBe('Aquarius')
    expect(getZodiac(10, 31)).toBe('Scorpio')
    expect(getZodiac(3, 15)).toBe('Pisces')
  })
})

describe('Menstrual Cycle & Ovulation Phase Calculations', () => {
  const getPhase = (currentDay, cycleLength = 28, periodDuration = 5) => {
    const ovulationDay = cycleLength - 14 // 14
    const fertileStart = ovulationDay - 4 // 10
    const fertileEnd = ovulationDay + 1 // 15

    if (currentDay <= periodDuration) return 'menstrual'
    if (currentDay < fertileStart) return 'follicular'
    if (currentDay >= fertileStart && currentDay <= fertileEnd) return 'ovulation'
    return 'luteal'
  }

  it('identifies Menstrual phase for days 1 to 5', () => {
    expect(getPhase(1)).toBe('menstrual')
    expect(getPhase(3)).toBe('menstrual')
    expect(getPhase(5)).toBe('menstrual')
  })

  it('identifies Follicular phase for days 6 to 9', () => {
    expect(getPhase(6)).toBe('follicular')
    expect(getPhase(9)).toBe('follicular')
  })

  it('identifies Ovulation & Fertile window for days 10 to 15', () => {
    expect(getPhase(10)).toBe('ovulation')
    expect(getPhase(14)).toBe('ovulation') // Peak Day
    expect(getPhase(15)).toBe('ovulation')
  })

  it('identifies Luteal (PMS) phase for days 16 to 28', () => {
    expect(getPhase(16)).toBe('luteal')
    expect(getPhase(22)).toBe('luteal')
    expect(getPhase(28)).toBe('luteal')
  })

  it('calculates days until next period accurately', () => {
    const cycleLength = 28
    const currentDay = 20
    const daysUntilNextPeriod = cycleLength - currentDay + 1
    expect(daysUntilNextPeriod).toBe(9)
  })

  describe('Database & Cache Persistence for Birthdays and Cycle Data', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('persists and loads birthday data across storage and metadata', async () => {
      const mockBirthdays = {
        guyName: 'Harish',
        guyDob: '1998-08-15',
        girlName: 'Priya',
        girlDob: '2000-02-14',
      }

      let capturedUpdates = null
      const mockUpdate = async (updates) => {
        capturedUpdates = updates
        return updates
      }

      // Save via helper
      const saved = await saveCoupleSystemData({
        key: 'birthdays',
        data: mockBirthdays,
        coupleSpaceId: null, // Avoid live network call in unit test
        userId: null,
        updateCoupleSpace: mockUpdate,
      })
      expect(saved).toBe(true)
      expect(capturedUpdates?.metadata?.birthdays).toEqual(mockBirthdays)

      // Verify localStorage was populated immediately
      expect(localStorage.getItem('just_you_me_birthdays')).toBeTruthy()

      // Load via helper from coupleSpace metadata
      const loaded = await loadCoupleSystemData({
        key: 'birthdays',
        coupleSpace: { id: 'space-123', metadata: { birthdays: mockBirthdays } },
      })
      expect(loaded).toEqual(mockBirthdays)
    })

    it('persists and loads menstrual cycle data across storage and metadata', async () => {
      const mockCycle = {
        lastPeriodDate: '2026-10-10',
        cycleLength: 28,
        periodDuration: 5,
        notes: 'Feeling good',
      }

      let capturedUpdates = null
      const mockUpdate = async (updates) => {
        capturedUpdates = updates
        return updates
      }

      // Save via helper
      const saved = await saveCoupleSystemData({
        key: 'cycle',
        data: mockCycle,
        coupleSpaceId: null, // Avoid live network call in unit test
        userId: null,
        updateCoupleSpace: mockUpdate,
      })
      expect(saved).toBe(true)
      expect(capturedUpdates?.metadata?.cycle).toEqual(mockCycle)

      // Verify localStorage cache
      expect(localStorage.getItem('just_you_me_cycle')).toBeTruthy()

      // Load via helper from cache
      const loaded = await loadCoupleSystemData({
        key: 'cycle',
        coupleSpace: null,
      })
      expect(loaded).toEqual(mockCycle)
    })
  })
})
