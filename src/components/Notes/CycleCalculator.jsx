import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Heart,
  Sparkles,
  Droplets,
  Moon,
  Sun,
  Flame,
  Coffee,
  Smile,
  ShieldCheck,
  Edit2,
  Check,
  Info,
  Clock,
  Activity,
} from 'lucide-react'
import { useCouple } from '../../context/CoupleContext'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { saveCoupleSystemData, loadCoupleSystemData } from '../../lib/coupleDataHelper'
import confetti from 'canvas-confetti'

// Helper to calculate cycle status
const calculateCyclePhases = ({ lastPeriodDateStr, cycleLength = 28, periodDuration = 5 }) => {
  if (!lastPeriodDateStr) return null

  const lastPeriod = new Date(lastPeriodDateStr)
  if (isNaN(lastPeriod.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  lastPeriod.setHours(0, 0, 0, 0)

  // Difference in calendar days
  const diffTime = today.getTime() - lastPeriod.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return null

  // Day of current cycle (1-indexed)
  const currentDay = (diffDays % cycleLength) + 1

  // Ovulation day is typically 14 days before next period
  const ovulationDay = Math.max(1, cycleLength - 14)
  const fertileWindowStart = Math.max(1, ovulationDay - 4)
  const fertileWindowEnd = Math.min(cycleLength, ovulationDay + 1)

  // Determine current phase
  let phase = {}
  if (currentDay <= periodDuration) {
    phase = {
      id: 'menstrual',
      name: 'Menstrual Phase 🩸',
      shortName: 'Menstruation',
      color: 'rose',
      badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
      description: 'The uterine lining is shedding. Estrogen and progesterone are at baseline low levels. Physical energy may be lower and cramps can happen.',
      energyLevel: 'Low (Rest & Rejuvenation)',
      guyCareTip: 'Bring her a warm heating pad, hot herbal tea or hot cocoa, her favorite dark chocolate, and run a soothing warm bath. Give gentle lower back or foot rubs and keep today calm and quiet.',
      icon: Droplets,
    }
  } else if (currentDay < fertileWindowStart) {
    phase = {
      id: 'follicular',
      name: 'Follicular Phase 🌱',
      shortName: 'Follicular',
      color: 'emerald',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      description: 'Estrogen is steadily rising as new follicles develop. Energy, mood, mental clarity, and curiosity are bouncing back to full glow.',
      energyLevel: 'Rising & High (Creative & Social)',
      guyCareTip: 'She is feeling energized and optimistic! Surprise her with a spontaneous date night, go on an outdoor walk together, try a new recipe, and brainstorm dream plans.',
      icon: Sun,
    }
  } else if (currentDay >= fertileWindowStart && currentDay <= fertileWindowEnd) {
    const isPeak = currentDay === ovulationDay
    phase = {
      id: 'ovulation',
      name: isPeak ? 'Peak Ovulation Day ✨' : 'Fertile Ovulation Window 🌸',
      shortName: 'Ovulation',
      color: 'purple',
      badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
      description: 'Luteinizing Hormone (LH) surge releases an egg. Estrogen peaks. Confidence, radiant skin glow, and natural romantic affection are at their absolute peak.',
      energyLevel: 'Peak (Radiant & Confident)',
      guyCareTip: 'She is feeling magnetic and deeply loving! Shower her with genuine compliments, dress up for a romantic candlelit dinner, write her a sweet love note, and hold her close.',
      icon: Sparkles,
    }
  } else {
    phase = {
      id: 'luteal',
      name: 'Luteal Phase (PMS Care) 🌙',
      shortName: 'Luteal',
      color: 'amber',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      description: 'Progesterone peaks and then dips. Metabolism increases. She may feel more emotionally tender, sensitive, or experience bloating/cravings.',
      energyLevel: 'Winding Down (Cozy & Sensitive)',
      guyCareTip: 'Her body is working extra hard right now. Be deeply patient, supportive, and understanding. Stock comfort snacks, take care of daily chores without asking, and give big warm hugs.',
      icon: Moon,
    }
  }

  // Next Period calculation
  const daysUntilNextPeriod = cycleLength - currentDay + 1
  const nextPeriodDate = new Date(today)
  nextPeriodDate.setDate(today.getDate() + daysUntilNextPeriod)

  // Next Ovulation date
  let daysUntilOvulation = ovulationDay - currentDay
  if (daysUntilOvulation < 0) {
    daysUntilOvulation += cycleLength
  }
  const nextOvulationDate = new Date(today)
  nextOvulationDate.setDate(today.getDate() + daysUntilOvulation)

  return {
    currentDay,
    cycleLength,
    periodDuration,
    ovulationDay,
    fertileWindowStart,
    fertileWindowEnd,
    phase,
    daysUntilNextPeriod,
    nextPeriodDate,
    daysUntilOvulation,
    nextOvulationDate,
  }
}

export const CycleCalculator = () => {
  const { coupleSpace, partner, updateCoupleSpace, presenceChannel } = useCouple()
  const { user } = useAuth()
  const { currentTheme } = useTheme()

  // Load from couple space metadata, love_notes, or defaults
  const savedCycle = coupleSpace?.metadata?.cycle || {}

  const [lastPeriodDate, setLastPeriodDate] = useState(savedCycle.lastPeriodDate || '')
  const [cycleLength, setCycleLength] = useState(savedCycle.cycleLength || 28)
  const [periodDuration, setPeriodDuration] = useState(savedCycle.periodDuration || 5)
  const [notes, setNotes] = useState(savedCycle.notes || '')

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load and sync from database & cache
  useEffect(() => {
    let isMounted = true
    const initData = async () => {
      const data = await loadCoupleSystemData({
        key: 'cycle',
        coupleSpace,
        coupleSpaceId: coupleSpace?.id,
      })
      if (isMounted && data) {
        if (data.lastPeriodDate) setLastPeriodDate(data.lastPeriodDate)
        if (data.cycleLength) setCycleLength(data.cycleLength)
        if (data.periodDuration) setPeriodDuration(data.periodDuration)
        if (data.notes) setNotes(data.notes)
      }
    }
    initData()
    return () => {
      isMounted = false
    }
  }, [coupleSpace?.id, coupleSpace?.metadata?.cycle])

  const handleSave = async (customLastPeriod = null) => {
    setIsSaving(true)
    const targetDate = customLastPeriod || lastPeriodDate
    try {
      const updatedCycle = {
        lastPeriodDate: targetDate,
        cycleLength: Number(cycleLength),
        periodDuration: Number(periodDuration),
        notes,
        lastUpdated: new Date().toISOString(),
      }

      await saveCoupleSystemData({
        key: 'cycle',
        data: updatedCycle,
        coupleSpaceId: coupleSpace?.id,
        userId: user?.id,
        updateCoupleSpace,
        presenceChannel,
      })

      confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } })
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving cycle data:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Quick action: Log period started today
  const handleLogPeriodToday = async () => {
    const todayStr = new Date().toISOString().split('T')[0]
    setLastPeriodDate(todayStr)
    await handleSave(todayStr)
  }

  const cycleData = calculateCyclePhases({
    lastPeriodDateStr: lastPeriodDate,
    cycleLength: Number(cycleLength),
    periodDuration: Number(periodDuration),
  })

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Card */}
      <div className={`glass rounded-3xl p-4 sm:p-5 border ${currentTheme.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="flex items-start sm:items-center space-x-3">
          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${currentTheme.primary} text-white flex items-center justify-center shadow-md ${currentTheme.shadow} shrink-0`}>
            <Droplets className="w-5 h-5 fill-current text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Her Cycle, Ovulation & Wellness 🌸
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Synced menstrual phases, fertility window, and sweet pampering tips for him.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className={`py-1.5 px-3 rounded-full ${currentTheme.softBg} ${currentTheme.activeText} ${currentTheme.softHover} text-xs font-semibold flex items-center gap-1.5 transition active:scale-95`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel' : 'Edit Cycle'}</span>
          </button>
        </div>
      </div>

      {/* Settings / Edit Form */}
      {isEditing && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
          className={`glass rounded-3xl p-5 border ${currentTheme.border} shadow-xl space-y-4 animate-scale-up`}
        >
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${currentTheme.activeText}`}>
              Cycle Parameters
            </h4>
            <button
              type="button"
              onClick={handleLogPeriodToday}
              className={`py-1 px-3 rounded-full ${currentTheme.badge} text-[11px] font-semibold shadow-sm hover:opacity-90 active:scale-95 transition`}
            >
              🩸 Log Period Started Today
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Last period start */}
            <div className={`p-3 rounded-2xl ${currentTheme.softBg} border ${currentTheme.borderLight} space-y-1`}>
              <label className={`block text-[11px] font-bold ${currentTheme.activeText}`}>
                Last Period Start Date
              </label>
              <input
                type="date"
                required
                value={lastPeriodDate}
                onChange={(e) => setLastPeriodDate(e.target.value)}
                className={`w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 ${currentTheme.ring}`}
              />
            </div>

            {/* Cycle length */}
            <div className={`p-3 rounded-2xl ${currentTheme.softBg} border ${currentTheme.borderLight} space-y-1`}>
              <div className={`flex justify-between items-center text-[11px] font-bold ${currentTheme.activeText}`}>
                <span>Cycle Length:</span>
                <span className="font-extrabold">{cycleLength} days</span>
              </div>
              <input
                type="range"
                min="21"
                max="38"
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                className="w-full accent-current"
              />
              <span className="text-[10px] text-slate-400 block text-right">Avg: 28 days</span>
            </div>

            {/* Period duration */}
            <div className={`p-3 rounded-2xl ${currentTheme.softBg} border ${currentTheme.borderLight} space-y-1`}>
              <div className={`flex justify-between items-center text-[11px] font-bold ${currentTheme.activeText}`}>
                <span>Period Bleed:</span>
                <span className="font-extrabold">{periodDuration} days</span>
              </div>
              <input
                type="range"
                min="3"
                max="8"
                value={periodDuration}
                onChange={(e) => setPeriodDuration(e.target.value)}
                className="w-full accent-current"
              />
              <span className="text-[10px] text-slate-400 block text-right">Avg: 5 days</span>
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
              {isSaving ? 'Saving...' : 'Save Cycle Info'}
            </button>
          </div>
        </form>
      )}

      {/* Main Cycle Status View */}
      {cycleData ? (
        <div className="space-y-4">
          {/* Hero Phase Card */}
          <div className={`glass rounded-3xl p-6 border ${currentTheme.border} relative overflow-hidden space-y-4 shadow-sm`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cycleData.phase.badgeClass}`}>
                  {cycleData.phase.name}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Day {cycleData.currentDay} of {cycleData.cycleLength}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogPeriodToday}
                className="py-1 px-3 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:bg-rose-200 text-[11px] font-semibold transition"
              >
                🩸 Period Started Today
              </button>
            </div>

            {/* Visual Cycle Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                {/* 1. Menstrual */}
                <div
                  className="bg-rose-400"
                  style={{ width: `${(cycleData.periodDuration / cycleData.cycleLength) * 100}%` }}
                  title="Menstrual Phase"
                />
                {/* 2. Follicular */}
                <div
                  className="bg-emerald-400"
                  style={{
                    width: `${((cycleData.fertileWindowStart - 1 - cycleData.periodDuration) / cycleData.cycleLength) * 100}%`,
                  }}
                  title="Follicular Phase"
                />
                {/* 3. Ovulation & Fertile */}
                <div
                  className="bg-purple-400 relative"
                  style={{
                    width: `${((cycleData.fertileWindowEnd - cycleData.fertileWindowStart + 1) / cycleData.cycleLength) * 100}%`,
                  }}
                  title="Ovulation Window"
                />
                {/* 4. Luteal */}
                <div
                  className="bg-amber-400 flex-1"
                  title="Luteal Phase"
                />
              </div>

              {/* Day Marker */}
              <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                <span>Day 1 (Period)</span>
                <span>Day {cycleData.ovulationDay} (Ovulation)</span>
                <span>Day {cycleData.cycleLength} (Next Cycle)</span>
              </div>
            </div>

            {/* Phase Description */}
            <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Phase Overview & Hormones
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {cycleData.phase.description}
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <Activity className="w-3.5 h-3.5 text-rose-500" />
                <span>Energy State: <strong>{cycleData.phase.energyLevel}</strong></span>
              </div>
            </div>

            {/* Guy's Special Care & Romance Guide */}
            <div className={`p-4 rounded-2xl ${currentTheme.softBg} border ${currentTheme.border} space-y-1.5`}>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${currentTheme.activeText}`}>
                <Heart className="w-4 h-4 fill-current animate-heartbeat" />
                <span>How He Can Pamper & Care for Her Today</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                {cycleData.phase.guyCareTip}
              </p>
            </div>
          </div>

          {/* Forecast Cards: Next Period & Next Ovulation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Next Period Card */}
            <div className={`glass rounded-3xl p-4 border ${currentTheme.border} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${currentTheme.activeText}`}>
                  Next Period Expected
                </span>
                <Clock className={`w-4 h-4 ${currentTheme.activeText}`} />
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                In {cycleData.daysUntilNextPeriod} {cycleData.daysUntilNextPeriod === 1 ? 'day' : 'days'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Estimated Date:{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {cycleData.nextPeriodDate.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </strong>
              </p>
            </div>

            {/* Next Ovulation Card */}
            <div className="glass rounded-3xl p-4 border border-purple-200/60 dark:border-purple-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
                  Peak Ovulation & Fertility
                </span>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {cycleData.daysUntilOvulation === 0
                  ? 'Happening Today! ✨'
                  : `In ${cycleData.daysUntilOvulation} days`}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peak Day:{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {cycleData.nextOvulationDate.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </strong>
              </p>
            </div>
          </div>

          {/* 4 Phases Reference Table */}
          <div className={`glass rounded-3xl p-4 sm:p-5 border ${currentTheme.border} space-y-3`}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              The 4 Phases of Her Cycle
            </h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-center text-xs">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/30">
                <span className="font-bold text-rose-600 block mb-0.5">1. Menstrual</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500">Days 1–{cycleData.periodDuration}</span>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">Rest, cozy tea & hot pad</p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/30">
                <span className="font-bold text-emerald-600 block mb-0.5">2. Follicular</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500">Days {cycleData.periodDuration + 1}–{cycleData.fertileWindowStart - 1}</span>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">Energy rising, fun dates</p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/30">
                <span className="font-bold text-purple-600 block mb-0.5">3. Ovulation</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500">Days {cycleData.fertileWindowStart}–{cycleData.fertileWindowEnd}</span>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">Glow, confidence & love</p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/30">
                <span className="font-bold text-amber-600 block mb-0.5">4. Luteal</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500">Days {cycleData.fertileWindowEnd + 1}–{cycleData.cycleLength}</span>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">PMS comfort & snacks</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className={`glass rounded-3xl p-10 text-center text-slate-400 border ${currentTheme.border} space-y-3`}>
          <Droplets className={`w-12 h-12 ${currentTheme.activeText} mx-auto stroke-1`} />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Period Date Logged Yet
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Enter the start date of her last period to automatically calculate her current phase, ovulation days, and personalized care recommendations!
          </p>
          <div className="flex justify-center gap-2 pt-1">
            <button
              onClick={() => setIsEditing(true)}
              className={`py-2 px-4 rounded-xl ${currentTheme.buttonGrad} text-white text-xs font-semibold shadow-md ${currentTheme.shadow} active:scale-95 transition`}
            >
              Set Last Period Date
            </button>
            <button
              onClick={handleLogPeriodToday}
              className={`py-2 px-4 rounded-xl border ${currentTheme.border} ${currentTheme.activeText} ${currentTheme.softHover} text-xs font-semibold active:scale-95 transition`}
            >
              🩸 Started Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
