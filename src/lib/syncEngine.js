import { supabase } from './supabaseClient'

export const DRIFT_THRESHOLD_SECONDS = 1.5

/**
 * Helper to calculate target video time accounting for latency
 */
export const calculateTargetTime = (sentTime, sentTimestamp, isPlaying, playbackRate = 1) => {
  if (!isPlaying) return sentTime
  const latencySeconds = Math.max(0, (Date.now() - sentTimestamp) / 1000)
  return sentTime + latencySeconds * playbackRate
}

/**
 * Synchronization Manager for Couples Watch Together
 */
export class WatchSyncEngine {
  constructor({ coupleSpaceId, currentUserId, currentUserName, videoElement, onStateChange, onPartnerAction }) {
    this.coupleSpaceId = coupleSpaceId
    this.currentUserId = currentUserId
    this.currentUserName = currentUserName || 'Partner'
    this.videoElement = videoElement
    this.onStateChange = onStateChange || (() => {})
    this.onPartnerAction = onPartnerAction || (() => {})

    this.channel = null
    this.isApplyingRemote = false
    this.lastBroadcastTime = 0
  }

  init() {
    if (!supabase || !this.coupleSpaceId) return

    this.channel = supabase.channel(`watch_sync_${this.coupleSpaceId}`, {
      config: { broadcast: { self: false } },
    })

    this.channel
      .on('broadcast', { event: 'video-sync' }, ({ payload }) => {
        this.handleRemoteSync(payload)
      })
      .subscribe((status) => {
        console.log('Watch sync channel status:', status)
      })
  }

  setVideoElement(el) {
    this.videoElement = el
  }

  handleRemoteSync(payload) {
    if (!this.videoElement || payload.senderId === this.currentUserId) return

    this.isApplyingRemote = true
    this.onPartnerAction({
      action: payload.action,
      by: payload.senderName || 'Your partner',
      time: payload.currentTime,
    })

    const targetTime = calculateTargetTime(
      payload.currentTime,
      payload.timestamp,
      payload.isPlaying,
      payload.playbackRate || 1
    )

    const drift = Math.abs(this.videoElement.currentTime - targetTime)

    // Check drift or explicit seek/play/pause action
    if (payload.action === 'seek' || drift > DRIFT_THRESHOLD_SECONDS) {
      this.videoElement.currentTime = targetTime
    }

    if (payload.playbackRate && this.videoElement.playbackRate !== payload.playbackRate) {
      this.videoElement.playbackRate = payload.playbackRate
    }

    if (payload.isPlaying && this.videoElement.paused) {
      this.videoElement.play().catch((e) => console.warn('Autoplay prevented by browser:', e))
    } else if (!payload.isPlaying && !this.videoElement.paused) {
      this.videoElement.pause()
    }

    setTimeout(() => {
      this.isApplyingRemote = false
    }, 450)
  }

  broadcastAction(action) {
    if (this.isApplyingRemote || !this.videoElement || !this.channel) return

    const now = Date.now()
    if (now - this.lastBroadcastTime < 150) return // Throttling
    this.lastBroadcastTime = now

    const payload = {
      action,
      senderId: this.currentUserId,
      senderName: this.currentUserName,
      currentTime: this.videoElement.currentTime,
      isPlaying: !this.videoElement.paused,
      playbackRate: this.videoElement.playbackRate,
      timestamp: now,
    }

    this.channel.send({
      type: 'broadcast',
      event: 'video-sync',
      payload,
    })

    // Also persist into watch_sessions table in Supabase asynchronously
    this.persistDbState(payload)
  }

  async persistDbState(payload) {
    try {
      await supabase?.from('watch_sessions').upsert(
        {
          couple_space_id: this.coupleSpaceId,
          playback_position: payload.currentTime,
          is_playing: payload.isPlaying,
          playback_rate: payload.playbackRate,
          last_updated_by: this.currentUserId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'couple_space_id' }
      )
    } catch (e) {
      console.warn('Could not persist watch session to DB:', e)
    }
  }

  destroy() {
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }
  }
}
