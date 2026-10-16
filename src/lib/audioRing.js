/**
 * Synthesizes call audio (ringtone, outgoing chime, call end tone)
 * using the Web Audio API without requiring any external audio files.
 */

let audioCtx = null

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

let ringInterval = null

/**
 * Plays a soft, romantic outgoing ringing chime
 */
export const playOutgoingRinging = () => {
  stopCallAudio()
  const ctx = getAudioContext()
  if (!ctx) return

  const playChime = () => {
    try {
      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc2.type = 'sine'
      osc1.frequency.setValueAtTime(440, now) // A4
      osc2.frequency.setValueAtTime(554.37, now) // C#5 (Major 3rd romantic chord)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 1.3)
      osc2.stop(now + 1.3)
    } catch (e) {
      console.warn('Audio synthesis error:', e)
    }
  }

  playChime()
  ringInterval = setInterval(playChime, 2500)
}

/**
 * Plays a melodious incoming ringtone
 */
export const playIncomingRingtone = () => {
  stopCallAudio()
  const ctx = getAudioContext()
  if (!ctx) return

  const playTune = () => {
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 (Bright Arpeggio)
      const now = ctx.currentTime

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const startTime = now + idx * 0.18

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)

        gain.gain.setValueAtTime(0.001, startTime)
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(startTime)
        osc.stop(startTime + 0.4)
      })
    } catch (e) {
      console.warn('Audio ringtone error:', e)
    }
  }

  playTune()
  ringInterval = setInterval(playTune, 2800)
}

/**
 * Plays a subtle end-call tone
 */
export const playCallEndTone = () => {
  stopCallAudio()
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, now)
    osc.frequency.linearRampToValueAtTime(220, now + 0.3)

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.36)
  } catch (e) {
    console.warn('End call audio error:', e)
  }
}

/**
 * Stops any playing ringtone or chime
 */
export const stopCallAudio = () => {
  if (ringInterval) {
    clearInterval(ringInterval)
    ringInterval = null
  }
}
