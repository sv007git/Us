/**
 * Web Notifications & Synthesized Audio Chime Helper
 * Provides instant sound alerts and background browser push notifications for couple messages & calls.
 */

// Synthesize pleasant two-tone romantic chime using Web Audio API (Zero external audio file dependencies)
export const playNotificationSound = () => {
  if (typeof window === 'undefined') return

  const soundAllowed = isSoundEnabled()
  if (!soundAllowed) return

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // Tone 1: Warm D5 (587.33 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now)

    gain1.gain.setValueAtTime(0, now)
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.03)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.36)

    // Tone 2: Bright harmonic A5 (880.00 Hz) starting slightly after
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880.0, now + 0.1)

    gain2.gain.setValueAtTime(0, now + 0.1)
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.14)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc2.start(now + 0.1)
    osc2.stop(now + 0.56)

    // Cleanup context after sounds complete
    setTimeout(() => {
      ctx.close().catch(() => {})
    }, 700)
  } catch (err) {
    console.warn('Audio chime playback note:', err)
  }
}

/**
 * Checks current notification permission
 */
export const getNotificationPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

/**
 * Requests browser notification permission
 */
export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (err) {
    console.warn('Notification permission error:', err)
    return Notification.permission
  }
}

/**
 * Shows desktop/browser notification with sound when tab is inactive or hidden
 */
export const showBrowserNotification = ({
  title = 'Just You & Me 💗',
  body = 'New message from your partner',
  icon = null,
  tag = 'chat-message',
  onClick = null,
} = {}) => {
  if (typeof window === 'undefined') return null

  // Always play the pleasant chime
  playNotificationSound()

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null
  }

  try {
    const notif = new Notification(title, {
      body,
      icon: icon || undefined,
      tag,
      renotify: true,
      badge: icon || undefined,
    })

    notif.onclick = (e) => {
      e.preventDefault()
      window.focus()
      onClick?.()
      notif.close()
    }

    return notif
  } catch (err) {
    console.warn('Browser notification error:', err)
    return null
  }
}

/**
 * Sound notification preferences in localStorage
 */
export const isSoundEnabled = () => {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem('just_you_me_sound_notifications') !== 'false'
}

export const setSoundEnabled = (enabled) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem('just_you_me_sound_notifications', String(enabled))
}
