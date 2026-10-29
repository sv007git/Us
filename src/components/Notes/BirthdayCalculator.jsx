import React, { useState, useEffect } from 'react'
import {
  Cake,
  Calendar,
  Heart,
  Sparkles,
  Clock,
  Star,
  Users,
  Edit2,
  Check,
  Flame,
  Droplets,
  Wind,
  Mountain,
} from 'lucide-react'
import { useCouple } from '../../context/CoupleContext'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { saveCoupleSystemData, loadCoupleSystemData } from '../../lib/coupleDataHelper'
import confetti from 'canvas-confetti'

// Zodiac helper: returns sign, symbol, element, dates, and romantic vibe
const getZodiacSign = (dateStr) => {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null

  const month = date.getUTCMonth() + 1 // 1-12
  const day = date.getUTCDate()

  const signs = [
    { sign: 'Capricorn', symbol: '♑', element: 'Earth', icon: Mountain, start: [12, 22], end: [1, 19], vibe: 'Loyal, grounded, and deeply devoted' },
    { sign: 'Aquarius', symbol: '♒', element: 'Air', icon: Wind, start: [1, 20], end: [2, 18], vibe: 'Creative, unique, and deeply thoughtful' },
    { sign: 'Pisces', symbol: '♓', element: 'Water', icon: Droplets, start: [2, 19], end: [3, 20], vibe: 'Dreamy, intuitive, and overflowing with love' },
    { sign: 'Aries', symbol: '♈', element: 'Fire', icon: Flame, start: [3, 21], end: [4, 19], vibe: 'Passionate, bold, and fiercely protective' },
    { sign: 'Taurus', symbol: '♉', element: 'Earth', icon: Mountain, start: [4, 20], end: [5, 20], vibe: 'Sensual, steadfast, and loves romantic comfort' },
    { sign: 'Gemini', symbol: '♊', element: 'Air', icon: Wind, start: [5, 21], end: [6, 20], vibe: 'Charming, witty, and keeps conversations magical' },
    { sign: 'Cancer', symbol: '♋', element: 'Water', icon: Droplets, start: [6, 21], end: [7, 22], vibe: 'Nurturing, soulful, and loves warm intimacy' },
    { sign: 'Leo', symbol: '♌', element: 'Fire', icon: Flame, start: [7, 23], end: [8, 22], vibe: 'Generous, radiant, and loves passionately' },
    { sign: 'Virgo', symbol: '♍', element: 'Earth', icon: Mountain, start: [8, 23], end: [9, 22], vibe: 'Attentive to every detail, genuinely caring' },
    { sign: 'Libra', symbol: '♎', element: 'Air', icon: Wind, start: [9, 23], end: [10, 22], vibe: 'Graceful, romantic, and seeks perfect harmony' },
    { sign: 'Scorpio', symbol: '♏', element: 'Water', icon: Droplets, start: [10, 23], end: [11, 21], vibe: 'Intense, deeply loyal, and soulful connection' },
    { sign: 'Sagittarius', symbol: '♐', element: 'Fire', icon: Flame, start: [11, 22], end: [12, 21], vibe: 'Adventurous, cheerful, and loves journeying together' },
  ]

  for (const s of signs) {
    const [sm, sd] = s.start
    const [em, ed] = s.end
    if (sm === 12 && em === 1) {
      if ((month === 12 && day >= sd) || (month === 1 && day <= ed)) return s
    } else {
      if ((month === sm && day >= sd) || (month === em && day <= ed)) return s
    }
  }

  return signs[0]
}

// Calculate exact age in years, months, and days
const calculateExactAge = (dobStr) => {
  if (!dobStr) return null
  const birth = new Date(dobStr)
  if (isNaN(birth.getTime())) return null

  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  let days = now.getDate() - birth.getDate()

  if (days < 0) {
    months -= 1
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
    days += prevMonthDays
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))

  return { years, months, days, totalDays }
}

// Calculate countdown to next birthday
const calculateNextBirthday = (dobStr) => {
  if (!dobStr) return null
  const birth = new Date(dobStr)
  if (isNaN(birth.getTime())) return null

  const now = new Date()
  const thisYear = now.getFullYear()
  let nextBday = new Date(thisYear, birth.getMonth(), birth.getDate())

  // If birthday already passed this year, set to next year
  if (nextBday < now && nextBday.toDateString() !== now.toDateString()) {
    nextBday = new Date(thisYear + 1, birth.getMonth(), birth.getDate())
  }

  const isToday = nextBday.toDateString() === now.toDateString()
  const diffMs = nextBday.getTime() - now.getTime()
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const turningAge = nextBday.getFullYear() - birth.getFullYear()

  return { nextBday, days: Math.max(0, days), isToday, turningAge }
}

export const BirthdayCalculator = () => {
  const { coupleSpace, partner, updateCoupleSpace, presenceChannel } = useCouple()
  const { user } = useAuth()
  const { currentTheme } = useTheme()

  // Saved in couple space metadata, love_notes, or localStorage
  const savedData = coupleSpace?.metadata?.birthdays || {}

  const [guyName, setGuyName] = useState(savedData.guyName || 'Him 👦')
  const [guyDob, setGuyDob] = useState(savedData.guyDob || '')
  const [girlName, setGirlName] = useState(savedData.girlName || (partner?.display_name || 'Her 👧'))
  const [girlDob, setGirlDob] = useState(savedData.girlDob || '')

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load and sync from database & cache
  useEffect(() => {
    let isMounted = true
    const initData = async () => {
      const data = await loadCoupleSystemData({
        key: 'birthdays',
        coupleSpace,
        coupleSpaceId: coupleSpace?.id,
      })
      if (isMounted && data) {
        if (data.guyDob) setGuyDob(data.guyDob)
        if (data.girlDob) setGirlDob(data.girlDob)
        if (data.guyName) setGuyName(data.guyName)
        if (data.girlName) setGirlName(data.girlName)
      }
    }
    initData()
    return () => {
      isMounted = false
    }
  }, [coupleSpace?.id, coupleSpace?.metadata?.birthdays])

  const handleSave = async (e) => {
    e?.preventDefault()
    setIsSaving(true)
    try {
      const updatedBirthdays = {
        guyName: guyName.trim() || 'Him',
        guyDob,
        girlName: girlName.trim() || 'Her',
        girlDob,
      }

      await saveCoupleSystemData({
        key: 'birthdays',
        data: updatedBirthdays,
        coupleSpaceId: coupleSpace?.id,
        userId: user?.id,
        updateCoupleSpace,
        presenceChannel,
      })

      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } })
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving birthdays:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const guyAge = calculateExactAge(guyDob)
  const girlAge = calculateExactAge(girlDob)
  const guyNextBday = calculateNextBirthday(guyDob)
  const girlNextBday = calculateNextBirthday(girlDob)
  const guyZodiac = getZodiacSign(guyDob)
  const girlZodiac = getZodiacSign(girlDob)

  // Age difference calculation
  const getAgeDifference = () => {
    if (!guyDob || !girlDob) return null
    const guyDate = new Date(guyDob)
    const girlDate = new Date(girlDob)
    const diffMs = guyDate.getTime() - girlDate.getTime()

    if (Math.abs(diffMs) < 1000 * 60 * 60 * 24) return 'Born on the exact same day! ✨'

    const guyIsOlder = diffMs < 0
    const older = guyIsOlder ? guyName : girlName
    const younger = guyIsOlder ? girlName : guyName

    const diffDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    const diffYears = Math.floor(diffDays / 365.25)
    const remainingDays = Math.floor(diffDays % 365.25)
    const diffMonths = Math.floor(remainingDays / 30.43)
    const daysLeft = Math.floor(remainingDays % 30.43)

    let parts = []
    if (diffYears > 0) parts.push(`${diffYears} yr${diffYears > 1 ? 's' : ''}`)
    if (diffMonths > 0) parts.push(`${diffMonths} mo${diffMonths > 1 ? 's' : ''}`)
    if (daysLeft > 0 && diffYears === 0) parts.push(`${daysLeft} day${daysLeft > 1 ? 's' : ''}`)

    return `${older} is ${parts.join(', ')} older than ${younger} 💕`
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Banner */}
      <div className={`glass rounded-3xl p-4 sm:p-5 border ${currentTheme.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="flex items-start sm:items-center space-x-3">
          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${currentTheme.primary} text-white flex items-center justify-center shadow-md ${currentTheme.shadow} shrink-0`}>
            <Cake className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Couples Birthday & Age Calculator 🎂
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track your exact ages, upcoming birthday countdowns, and zodiac harmony.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing((prev) => !prev)}
          className={`self-start sm:self-auto py-1.5 px-3 rounded-full ${currentTheme.softBg} ${currentTheme.activeText} ${currentTheme.softHover} text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0`}
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>{isEditing ? 'Cancel' : 'Set Birthdays'}</span>
        </button>
      </div>

      {/* Editing Form */}
      {isEditing && (
        <form onSubmit={handleSave} className={`glass rounded-3xl p-5 border ${currentTheme.border} shadow-xl space-y-4 animate-scale-up`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider ${currentTheme.activeText}`}>
            Configure Birthdays (DOB)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Guy's DOB */}
            <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
              <label className="block text-xs font-bold text-blue-700 dark:text-blue-300">
                Guy's Name & Birthday 👦
              </label>
              <input
                type="text"
                value={guyName}
                onChange={(e) => setGuyName(e.target.value)}
                placeholder="His Name (e.g. Harish)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="date"
                required
                value={guyDob}
                onChange={(e) => setGuyDob(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Girl's DOB */}
            <div className={`p-3.5 rounded-2xl ${currentTheme.softBg} border ${currentTheme.borderLight} space-y-2`}>
              <label className={`block text-xs font-bold ${currentTheme.activeText}`}>
                Girl's Name & Birthday 👧
              </label>
              <input
                type="text"
                value={girlName}
                onChange={(e) => setGirlName(e.target.value)}
                placeholder="Her Name (e.g. My Love)"
                className={`w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 ${currentTheme.ring}`}
              />
              <input
                type="date"
                required
                value={girlDob}
                onChange={(e) => setGirlDob(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 ${currentTheme.ring}`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`py-2 px-5 rounded-xl ${currentTheme.buttonGrad} hover:opacity-95 text-white text-xs font-semibold shadow-md ${currentTheme.shadow} active:scale-95 transition disabled:opacity-50`}
            >
              {isSaving ? 'Saving...' : 'Save Birthdays'}
            </button>
          </div>
        </form>
      )}

      {/* Birthday Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Guy's Card */}
        <div className="glass rounded-3xl p-5 border border-blue-200/60 dark:border-blue-900/40 relative overflow-hidden space-y-3.5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-500 dark:text-blue-400">
                His Birthday
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {guyName}
              </h4>
            </div>
            {guyZodiac && (
              <div className="px-2.5 py-1 rounded-full bg-blue-100/70 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1">
                <span>{guyZodiac.symbol}</span>
                <span>{guyZodiac.sign}</span>
              </div>
            )}
          </div>

          {guyAge ? (
            <div className="space-y-3">
              {/* Current Exact Age */}
              <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30">
                <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Current Age</span>
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span>{guyAge.years} <span className="text-xs font-normal text-slate-500">years,</span></span>
                  <span>{guyAge.months} <span className="text-xs font-normal text-slate-500">months,</span></span>
                  <span>{guyAge.days} <span className="text-xs font-normal text-slate-500">days</span></span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  🌟 {guyAge.totalDays.toLocaleString()} total days lived on Earth
                </span>
              </div>

              {/* Next Birthday Countdown */}
              {guyNextBday && (
                <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-blue-100 dark:border-blue-900/30">
                  <span className="text-[10px] font-semibold text-blue-500 block mb-0.5">Birthday Countdown</span>
                  {guyNextBday.isToday ? (
                    <div className="text-sm font-bold text-rose-500 animate-pulse flex items-center gap-1">
                      <Sparkles className="w-4 h-4" /> Happy Birthday Today! 🎉
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      🎂 Turning {guyNextBday.turningAge} in{' '}
                      <span className="text-blue-600 dark:text-blue-400 font-extrabold">{guyNextBday.days}</span> days
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {guyNextBday.nextBday.toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </span>
                </div>
              )}

              {/* Zodiac Vibe */}
              {guyZodiac && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  "{guyZodiac.vibe}"
                </p>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-500" />
              <p className="text-xs">No birth date entered yet.</p>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-2 text-xs font-semibold text-blue-500 hover:underline"
              >
                Set his DOB
              </button>
            </div>
          )}
        </div>

        {/* Girl's Card */}
        <div className={`glass rounded-3xl p-5 border ${currentTheme.border} relative overflow-hidden space-y-3.5`}>
          <div className="flex items-start justify-between">
            <div>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${currentTheme.activeText}`}>
                Her Birthday
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {girlName}
              </h4>
            </div>
            {girlZodiac && (
              <div className={`px-2.5 py-1 rounded-full ${currentTheme.softBg} border ${currentTheme.borderLight} ${currentTheme.activeText} text-xs font-semibold flex items-center gap-1`}>
                <span>{girlZodiac.symbol}</span>
                <span>{girlZodiac.sign}</span>
              </div>
            )}
          </div>

          {girlAge ? (
            <div className="space-y-3">
              {/* Current Exact Age */}
              <div className={`p-3 rounded-2xl ${currentTheme.softBg} border ${currentTheme.borderLight}`}>
                <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Current Age</span>
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span>{girlAge.years} <span className="text-xs font-normal text-slate-500">years,</span></span>
                  <span>{girlAge.months} <span className="text-xs font-normal text-slate-500">months,</span></span>
                  <span>{girlAge.days} <span className="text-xs font-normal text-slate-500">days</span></span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  🌸 {girlAge.totalDays.toLocaleString()} total days of bringing joy to the world
                </span>
              </div>

              {/* Next Birthday Countdown */}
              {girlNextBday && (
                <div className={`p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 border ${currentTheme.borderLight}`}>
                  <span className={`text-[10px] font-semibold ${currentTheme.activeText} block mb-0.5`}>Birthday Countdown</span>
                  {girlNextBday.isToday ? (
                    <div className={`text-sm font-bold ${currentTheme.activeText} animate-pulse flex items-center gap-1`}>
                      <Sparkles className="w-4 h-4" /> Happy Birthday My Love! 💖
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      🎂 Turning {girlNextBday.turningAge} in{' '}
                      <span className={`${currentTheme.activeText} font-extrabold`}>{girlNextBday.days}</span> days
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {girlNextBday.nextBday.toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </span>
                </div>
              )}

              {/* Zodiac Vibe */}
              {girlZodiac && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  "{girlZodiac.vibe}"
                </p>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400">
              <Calendar className={`w-8 h-8 mx-auto mb-2 opacity-40 ${currentTheme.activeText}`} />
              <p className="text-xs">No birth date entered yet.</p>
              <button
                onClick={() => setIsEditing(true)}
                className={`mt-2 text-xs font-semibold ${currentTheme.activeText} hover:underline`}
              >
                Set her DOB
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Age Comparison & Couple Synergy Footer */}
      {guyDob && girlDob && (
        <div className={`p-4 rounded-3xl bg-gradient-to-r ${currentTheme.softBg} border ${currentTheme.border} text-center space-y-1`}>
          <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${currentTheme.activeText}`}>
            <Heart className="w-4 h-4 fill-current" />
            <span>Age Synergy</span>
          </div>
          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
            {getAgeDifference()}
          </p>
          {guyZodiac && girlZodiac && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              Astrological Pair: <span className="font-semibold text-slate-700 dark:text-slate-300">{guyZodiac.sign} ({guyZodiac.element})</span> &{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{girlZodiac.sign} ({girlZodiac.element})</span> ✨
            </p>
          )}
        </div>
      )}
    </div>
  )
}
