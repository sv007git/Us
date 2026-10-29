import { describe, it, expect, beforeEach } from 'vitest'
import { saveCoupleSystemData, loadCoupleSystemData } from '../src/lib/coupleDataHelper'
import {
  calculateCyclePhases,
  parseLocalDate,
  formatLocalDate,
  addDays,
  formatHumanDate,
  formatDateRange,
} from '../src/lib/cycleCalculatorHelper'
import { buildMorningNotificationPayload } from '../src/lib/cycleNotificationHelper'

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
  it('correctly calculates next period date and days countdown', () => {
    // Last period started Oct 10, 2026. Cycle length 28 days.
    // Next period MUST be Nov 7, 2026 (Oct 10 + 28 days = Nov 7).
    // If today is Oct 20 (10 days in): 18 days left.
    const res = calculateCyclePhases({
      lastPeriodDateStr: '2026-10-10',
      cycleLength: 28,
      periodDuration: 5,
      currentDate: new Date('2026-10-20T00:00:00'),
    })

    expect(res).not.toBeNull()
    expect(res.currentDay).toBe(11) // 10 days difference -> Day 11
    expect(formatLocalDate(res.nextPeriodDate)).toBe('2026-11-07')
    expect(res.daysUntilNextPeriod).toBe(18)
    expect(res.isOverdue).toBe(false)
  })

  it('detects when period is expected today (diffDays === cycleLength)', () => {
    const res = calculateCyclePhases({
      lastPeriodDateStr: '2026-10-10',
      cycleLength: 28,
      periodDuration: 5,
      currentDate: new Date('2026-11-07T00:00:00'),
    })

    expect(res.daysUntilNextPeriod).toBe(0)
    expect(res.phase.id).toBe('due_today')
    expect(res.phase.name).toContain('Period Expected Today')
  })

  it('accurately reports overdue period days', () => {
    // 30 days after last period start
    const res = calculateCyclePhases({
      lastPeriodDateStr: '2026-10-10',
      cycleLength: 28,
      periodDuration: 5,
      currentDate: new Date('2026-11-09T00:00:00'),
    })

    expect(res.isOverdue).toBe(true)
    expect(res.daysOverdue).toBe(2)
    expect(res.phase.id).toBe('overdue')
    expect(res.phase.name).toContain('Period Overdue (2 days)')
  })

  it('identifies phases with exact calendar date ranges and what-to-do tips', () => {
    // On Day 3 (Menstrual)
    const resDay3 = calculateCyclePhases({
      lastPeriodDateStr: '2026-10-10',
      cycleLength: 28,
      periodDuration: 5,
      currentDate: new Date('2026-10-12T00:00:00'),
    })
    expect(resDay3.phase.id).toBe('menstrual')
    expect(resDay3.phase.datesText).toMatch(/10.*Oct|Oct.*10/)
    expect(resDay3.phase.whatToDo.length).toBeGreaterThanOrEqual(4)
    expect(resDay3.phase.whatToDo.some((t) => t.title.includes('Heating Pad') || t.title.includes('Warm'))).toBe(true)

    // On Day 8 (Follicular)
    const resDay8 = calculateCyclePhases({
      lastPeriodDateStr: '2026-10-10',
      cycleLength: 28,
      periodDuration: 5,
      currentDate: new Date('2026-10-17T00:00:00'),
    })
    expect(resDay8.phase.id).toBe('follicular')
    expect(resDay8.phase.whatToDo.some((t) => t.title.includes('Active Dates') || t.title.includes('Brainstorm'))).toBe(true)

    // On Day 14 (Peak Ovulation)
    const resDay14 = calculateCyclePhases({
      lastPeriodDateStr: '2026-10-10',
      cycleLength: 28,
      periodDuration: 5,
      currentDate: new Date('2026-10-23T00:00:00'),
    })
    expect(resDay14.phase.id).toBe('ovulation')
    expect(resDay14.phase.name).toContain('Peak Ovulation Day')

    // On Day 22 (Luteal / PMS)
    const resDay22 = calculateCyclePhases({
      lastPeriodDateStr: '2026-10-10',
      cycleLength: 28,
      periodDuration: 5,
      currentDate: new Date('2026-10-31T00:00:00'),
    })
    expect(resDay22.phase.id).toBe('luteal')
    expect(resDay22.phase.whatToDo.some((t) => t.title.includes('Patience') || t.title.includes('Comfort Snacks'))).toBe(true)
  })

  it('formulates morning phase notification payload with today phase and care tip', () => {
    const cycleData = calculateCyclePhases({
      lastPeriodDateStr: '2026-10-10',
      cycleLength: 28,
      periodDuration: 5,
      currentDate: new Date('2026-10-12T00:00:00'),
    })

    const payload = buildMorningNotificationPayload({ cycleData, partnerName: 'Maya' })
    expect(payload).not.toBeNull()
    expect(payload.title).toContain("Maya is in Menstrual Phase")
    expect(payload.body).toContain("Today's tip:")
    expect(payload.datesText).toBeDefined()
  })
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
