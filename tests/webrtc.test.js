import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getIceServers } from '../src/lib/webrtc'

describe('WebRTC ICE Server Configuration', () => {
  beforeEach(() => {
    // Clear localStorage mock if present
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })

  it('includes default public Google STUN servers', () => {
    const config = getIceServers()
    expect(config.iceServers).toBeDefined()
    expect(config.iceServers.length).toBeGreaterThanOrEqual(1)

    const stunUrls = config.iceServers.map((s) => s.urls).flat()
    const hasGoogleStun = stunUrls.some((u) => u.includes('stun.l.google.com'))
    expect(hasGoogleStun).toBe(true)
  })

  it('includes custom TURN server when stored in localStorage', () => {
    const customTurn = {
      urls: ['turn:custom.turn.server:3478'],
      username: 'couples_user',
      credential: 'secret_turn_password',
    }

    // Mock localStorage
    const storage = {}
    globalThis.localStorage = {
      getItem: (k) => storage[k] || null,
      setItem: (k, v) => { storage[k] = v },
      removeItem: (k) => { delete storage[k] },
      clear: () => { Object.keys(storage).forEach((k) => delete storage[k]) },
    }

    localStorage.setItem('just_you_me_turn_config', JSON.stringify(customTurn))

    const config = getIceServers()
    const turnEntry = config.iceServers.find(
      (s) => Array.isArray(s.urls) && s.urls.includes('turn:custom.turn.server:3478')
    )

    expect(turnEntry).toBeDefined()
    expect(turnEntry.username).toBe('couples_user')
    expect(turnEntry.credential).toBe('secret_turn_password')
  })

  it('includes Cloudflare STUN server for fallback resilience', () => {
    const config = getIceServers()
    const stunUrls = config.iceServers.map((s) => s.urls).flat()
    const hasCloudflareStun = stunUrls.some((u) => u.includes('stun.cloudflare.com'))
    expect(hasCloudflareStun).toBe(true)
  })
})
