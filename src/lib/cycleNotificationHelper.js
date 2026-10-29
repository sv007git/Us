/**
 * Cycle Morning Phase Notification Helper
 * Checks daily in the morning (6 AM – 12 PM) and triggers a gentle, loving
 * notification informing the couple about her current menstrual phase and today's care tips.
 */

import { showBrowserNotification, playNotificationSound } from './notificationHelper'
import { formatLocalDate } from './cycleCalculatorHelper'

const STORAGE_KEY_LAST_NOTIFIED = 'just_you_me_morning_phase_last_notified'
const STORAGE_KEY_ENABLED = 'just_you_me_morning_phase_enabled'

/**
 * Checks if morning phase notifications are enabled (default: true)
 */
export const isMorningPhaseAlertEnabled = () => {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY_ENABLED) !== 'false'
}

/**
 * Sets preference for morning phase notification
 */
export const setMorningPhaseAlertEnabled = (enabled) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled))
}

/**
 * Checks if current local time is in the morning (6:00 AM – 11:59 AM)
 */
export const isMorningTime = (date = new Date()) => {
  const hour = date.getHours()
  return hour >= 6 && hour < 12
}

/**
 * Formulates the morning notification payload based on cycle status
 */
export const buildMorningNotificationPayload = ({ cycleData, partnerName = 'Her' }) => {
  if (!cycleData || !cycleData.phase) return null

  const phase = cycleData.phase
  const name = partnerName || 'Her'

  let title = `🌅 Good Morning! ${name}'s Phase Today`
  if (cycleData.isOverdue) {
    title = `🌅 Morning Update: ${name}'s Period is Overdue 🩸`
  } else if (cycleData.daysUntilNextPeriod === 0) {
    title = `🌅 Morning Alert: ${name}'s Period Expected Today 🩸`
  } else {
    title = `🌅 Good Morning! ${name} is in ${phase.name}`
  }

  const subline = phase.daysText ? ` (${phase.daysText})` : ''
  const body = `${phase.morningBrief || phase.description} • Today's tip: ${phase.quickTip || phase.guyCareTip}`

  return {
    title,
    body,
    subline,
    phaseId: phase.id,
    phaseName: phase.name,
    datesText: phase.datesText,
    energyLevel: phase.energyLevel,
    quickTip: phase.quickTip || phase.guyCareTip,
    tag: `morning-cycle-phase-${formatLocalDate(new Date())}`,
  }
}

/**
 * Sends or previews morning phase notification
 * @param {Object} options
 * @param {Object} options.cycleData - output of calculateCyclePhases
 * @param {string} options.partnerName - display name of partner
 * @param {boolean} options.force - whether to bypass morning time & once-per-day check (e.g. for preview/test)
 * @param {Function} options.onShowToast - optional toast dispatch callback for in-app banner
 * @param {Function} options.onNavigate - optional navigation callback
 */
export const checkAndTriggerMorningPhaseNotification = ({
  cycleData,
  partnerName = 'Partner',
  force = false,
  onShowToast = null,
  onNavigate = null,
}) => {
  if (!cycleData || !cycleData.phase) return null

  // Check user preference unless forced
  if (!force && !isMorningPhaseAlertEnabled()) {
    return null
  }

  const todayStr = formatLocalDate(new Date())
  const lastNotified = typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY_LAST_NOTIFIED)
    : null

  // Unless force-triggered (e.g. user clicked "Test Alert"), verify:
  // 1. Must be morning (6:00 AM - 12:00 PM)
  // 2. Must not have already fired today
  if (!force) {
    if (!isMorningTime()) return null
    if (lastNotified === todayStr) return null
  }

  const payload = buildMorningNotificationPayload({ cycleData, partnerName })
  if (!payload) return null

  // 1. Play romantic chime
  playNotificationSound()

  // 2. Browser push notification
  showBrowserNotification({
    title: payload.title,
    body: payload.body,
    tag: payload.tag,
    onClick: () => {
      onNavigate?.('notes')
    },
  })

  // 3. In-app banner toast if callback provided
  if (onShowToast) {
    onShowToast({
      title: payload.title,
      content: `${payload.quickTip} (Tap to view her cycle hub)`,
      tab: 'notes',
      avatar: null,
    })
  }

  // 4. Mark today as notified
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LAST_NOTIFIED, todayStr)
  }

  return payload
}
