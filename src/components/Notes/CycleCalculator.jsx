import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Heart,
  Sparkles,
  Droplets,
  Moon,
  Sun,
  Coffee,
  Smile,
  ShieldCheck,
  Edit2,
  Check,
  Info,
  Clock,
  Activity,
  Bell,
  BellRing,
  Volume2,
  ChevronRight,
  Sparkle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { useCouple } from '../../context/CoupleContext'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { saveCoupleSystemData, loadCoupleSystemData } from '../../lib/coupleDataHelper'
import {
  calculateCyclePhases,
  formatHumanDate,
  formatLocalDate,
} from '../../lib/cycleCalculatorHelper'
import {
  checkAndTriggerMorningPhaseNotification,
  isMorningPhaseAlertEnabled,
  setMorningPhaseAlertEnabled,
  isMorningTime,
} from '../../lib/cycleNotificationHelper'
import confetti from 'canvas-confetti'

export const CycleCalculator = ({ onShowToast = null, onNavigate = null }) => {
  const { coupleSpace, partner, updateCoupleSpace, presenceChannel } = useCouple()
  const { user } = useAuth()
  const { currentTheme } = useTheme()

  // Load from couple space metadata or fallback
  const savedCycle = coupleSpace?.metadata?.cycle || {}

  const [lastPeriodDate, setLastPeriodDate] = useState(savedCycle.lastPeriodDate || '')
  const [cycleLength, setCycleLength] = useState(savedCycle.cycleLength || 28)
  const [periodDuration, setPeriodDuration] = useState(savedCycle.periodDuration || 5)
  const [notes, setNotes] = useState(savedCycle.notes || '')

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedPhaseTab, setSelectedPhaseTab] = useState(null)
  const [morningAlertEnabled, setMorningAlertEnabled] = useState(isMorningPhaseAlertEnabled())
  const [testAlertSent, setTestAlertSent] = useState(false)

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

  // Calculate current status and accurate cycle phases with exact calendar dates
  const cycleData = calculateCyclePhases({
    lastPeriodDateStr: lastPeriodDate,
    cycleLength: Number(cycleLength),
    periodDuration: Number(periodDuration),
    currentDate: new Date(),
  })

  // Automatically check and trigger morning notification if it's morning (6 AM – 12 PM)
  useEffect(() => {
    if (cycleData && cycleData.phase && morningAlertEnabled) {
      checkAndTriggerMorningPhaseNotification({
        cycleData,
        partnerName: partner?.display_name || 'Her',
        force: false,
        onShowToast,
        onNavigate,
      })
    }
  }, [cycleData?.phase?.id, cycleData?.currentDay, partner?.display_name, morningAlertEnabled])

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
    const todayStr = formatLocalDate(new Date())
    setLastPeriodDate(todayStr)
    await handleSave(todayStr)
  }

  // Test / preview the morning notification
  const handleTriggerMorningAlertPreview = () => {
    if (!cycleData) return
    const res = checkAndTriggerMorningPhaseNotification({
      cycleData,
      partnerName: partner?.display_name || 'Her',
      force: true,
      onShowToast,
      onNavigate,
    })
    if (res) {
      setTestAlertSent(true)
      setTimeout(() => setTestAlertSent(false), 4000)
    }
  }

  // Handle toggling morning alert preference
  const handleToggleMorningAlert = (enabled) => {
    setMorningAlertEnabled(enabled)
    setMorningPhaseAlertEnabled(enabled)
  }

  // Phase to display in the "What to do" guide (either user-selected tab or active phase)
  const displayPhase = selectedPhaseTab || cycleData?.phase

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Card */}
      <div className={`glass rounded-3xl p-4 sm:p-5 border ${currentTheme.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3.5`}>
        <div className="flex items-start sm:items-center space-x-3">
          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${currentTheme.primary} text-white flex items-center justify-center shadow-md ${currentTheme.shadow} shrink-0`}>
            <Droplets className="w-5 h-5 fill-current text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
              Her Cycle, Ovulation & Wellness 🌸
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exact phase calendar dates, accurate next period prediction, and thoughtful pampering tips.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className={`py-1.5 px-3.5 rounded-full ${currentTheme.softBg} ${currentTheme.activeText} ${currentTheme.softHover} text-xs font-semibold flex items-center gap-1.5 transition active:scale-95`}
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
              <span className="text-[10px] text-slate-400 block text-right">Avg: 28 days (Normal 21–38)</span>
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
              <span className="text-[10px] text-slate-400 block text-right">Avg: 5 days (Normal 3–8)</span>
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
          {/* Projected Cycle Notice (If > 1 cycle has passed without update) */}
          {cycleData.isProjectedCycle && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  Showing projected <strong>Cycle #{cycleData.projectedCycleIndex}</strong>. If her period started on a different day, tap to sync:
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogPeriodToday}
                className="py-1 px-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] shrink-0 active:scale-95 transition"
              >
                Period Started Today
              </button>
            </div>
          )}

          {/* Hero Active Phase Card */}
          <div className={`glass rounded-3xl p-5 sm:p-6 border ${currentTheme.border} relative overflow-hidden space-y-4 shadow-sm`}>
            {/* Top row: Phase Badge & Quick Action */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${cycleData.phase.badgeClass}`}>
                  {cycleData.phase.name}
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {cycleData.phase.daysText || `Day ${cycleData.currentDay} of ${cycleData.cycleLength}`}
                </span>
                {cycleData.phase.datesText && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-slate-700/60">
                    📅 {cycleData.phase.datesText}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleLogPeriodToday}
                className="py-1 px-3 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:bg-rose-200 text-[11px] font-semibold transition active:scale-95"
              >
                🩸 Period Started Today
              </button>
            </div>

            {/* Visual Cycle Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                {/* 1. Menstrual */}
                <div
                  className="bg-rose-400 relative group cursor-pointer"
                  style={{ width: `${(cycleData.periodDuration / cycleData.cycleLength) * 100}%` }}
                  title={`Menstrual: Days 1–${cycleData.periodDuration}`}
                />
                {/* 2. Follicular */}
                <div
                  className="bg-emerald-400 relative group cursor-pointer"
                  style={{
                    width: `${((cycleData.fertileWindowStart - 1 - cycleData.periodDuration) / cycleData.cycleLength) * 100}%`,
                  }}
                  title="Follicular Phase"
                />
                {/* 3. Ovulation & Fertile */}
                <div
                  className="bg-purple-400 relative group cursor-pointer"
                  style={{
                    width: `${((cycleData.fertileWindowEnd - cycleData.fertileWindowStart + 1) / cycleData.cycleLength) * 100}%`,
                  }}
                  title="Ovulation Window"
                />
                {/* 4. Luteal */}
                <div
                  className="bg-amber-400 flex-1 relative group cursor-pointer"
                  title="Luteal Phase"
                />
              </div>

              {/* Day Marker & Cycle Markers */}
              <div className="flex justify-between text-[10px] text-slate-400 px-0.5 font-medium">
                <span>Day 1 (Period)</span>
                <span>Day {cycleData.ovulationDay} (Peak Ovulation)</span>
                <span>Day {cycleData.cycleLength} (Next Cycle)</span>
              </div>
            </div>

            {/* Phase Description & Hormone State */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Phase Overview & Hormonal State
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {cycleData.phase.description}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>Energy: <strong className="text-slate-700 dark:text-slate-200">{cycleData.phase.energyLevel}</strong></span>
                </div>
                {cycleData.phase.datesText && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Dates: <strong className="text-slate-700 dark:text-slate-200">{cycleData.phase.datesText}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Accurate Forecast Cards: Next Period & Next Ovulation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Next Period Card */}
            <div className={`glass rounded-3xl p-4 sm:p-5 border ${currentTheme.border} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${currentTheme.activeText}`}>
                  Next Period Expected
                </span>
                <Clock className={`w-4 h-4 ${currentTheme.activeText}`} />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {cycleData.isOverdue
                  ? `Overdue by ${cycleData.daysOverdue} ${cycleData.daysOverdue === 1 ? 'day' : 'days'} 🩸`
                  : cycleData.daysUntilNextPeriod === 0
                  ? 'Expected Today! 🩸'
                  : cycleData.daysUntilNextPeriod === 1
                  ? 'Tomorrow! 🩸'
                  : `In ${cycleData.daysUntilNextPeriod} days`}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Estimated Date:{' '}
                <strong className="text-slate-800 dark:text-slate-100 font-semibold">
                  {formatHumanDate(cycleData.nextPeriodDate, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </strong>
              </p>
            </div>

            {/* Next Ovulation Card */}
            <div className="glass rounded-3xl p-4 sm:p-5 border border-purple-200/60 dark:border-purple-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Peak Ovulation & Fertility
                </span>
                <Sparkles className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {cycleData.daysUntilOvulation === 0
                  ? 'Happening Today! ✨'
                  : cycleData.daysUntilOvulation === 1
                  ? 'Tomorrow! ✨'
                  : `In ${cycleData.daysUntilOvulation} days`}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peak Day:{' '}
                <strong className="text-slate-800 dark:text-slate-100 font-semibold">
                  {formatHumanDate(cycleData.nextOvulationDate, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </strong>
              </p>
            </div>
          </div>

          {/* The 4 Phases Breakdown With Exact Calendar Dates */}
          <div className={`glass rounded-3xl p-4 sm:p-5 border ${currentTheme.border} space-y-3.5`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  The 4 Phases of Her Cycle (With Calendar Dates)
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Tap any phase to see its dates, hormone state, and pampering guide.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {(cycleData.allPhases || []).map((p) => {
                const isSelected = displayPhase?.id === p.id
                const isCurrent = cycleData.phase?.id === p.id

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPhaseTab(p)}
                    className={`p-3 rounded-2xl text-left border transition active:scale-95 relative ${
                      isSelected
                        ? `ring-2 ${currentTheme.ring} bg-white dark:bg-slate-800 shadow-md ${p.badgeClass}`
                        : 'bg-white/60 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-rose-500 text-white shadow-xs">
                        Current
                      </span>
                    )}
                    <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
                      {p.name}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      {p.daysText}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block mt-1">
                      📅 {p.datesText}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                      {p.quickTip || p.energyLevel}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* "What To Do" Section (Comprehensive Care & Romance Guide) */}
          {displayPhase && (
            <div className={`glass rounded-3xl p-5 sm:p-6 border ${currentTheme.border} space-y-4 shadow-sm`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl bg-gradient-to-tr ${currentTheme.primary} text-white shadow-sm`}>
                    <Heart className="w-4 h-4 fill-current animate-heartbeat" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      What To Do: {displayPhase.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Dates: <strong>{displayPhase.datesText}</strong> • Energy: <strong>{displayPhase.energyLevel}</strong>
                    </p>
                  </div>
                </div>

                {selectedPhaseTab && selectedPhaseTab.id !== cycleData.phase?.id && (
                  <button
                    type="button"
                    onClick={() => setSelectedPhaseTab(null)}
                    className="text-xs font-semibold text-rose-500 hover:underline"
                  >
                    Back to Today's Phase
                  </button>
                )}
              </div>

              {/* What To Do Actions Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(displayPhase.whatToDo || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 flex items-start gap-3 shadow-2xs"
                  >
                    <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                    <div className="space-y-0.5">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Morning Phase Notification Section */}
          <div className={`glass rounded-3xl p-4 sm:p-5 border ${currentTheme.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3.5`}>
            <div className="flex items-start sm:items-center space-x-3">
              <div className={`w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0`}>
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  🌅 Morning Phase Notification
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  Sends an alert every morning (6 AM – 12 PM) informing you of her phase and daily care tip.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleTriggerMorningAlertPreview}
                className={`py-1.5 px-3 rounded-full ${currentTheme.softBg} ${currentTheme.activeText} ${currentTheme.softHover} text-xs font-semibold flex items-center gap-1.5 transition active:scale-95`}
                title="Preview what the morning phase alert sounds and looks like"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{testAlertSent ? 'Alert Sent! 🔔' : 'Preview Morning Alert'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleMorningAlert(!morningAlertEnabled)}
                className={`py-1.5 px-3 rounded-full text-xs font-semibold transition active:scale-95 ${
                  morningAlertEnabled
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {morningAlertEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className={`glass rounded-3xl p-8 sm:p-10 text-center text-slate-400 border ${currentTheme.border} space-y-3`}>
          <Droplets className={`w-12 h-12 ${currentTheme.activeText} mx-auto stroke-1`} />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Period Date Logged Yet
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Enter the start date of her last period to automatically calculate her exact phase dates, ovulation window, and daily morning pampering tips!
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
