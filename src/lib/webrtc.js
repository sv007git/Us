import { supabase } from './supabaseClient'

/**
 * Returns RTCConfiguration with STUN and optional TURN servers
 */
export const getIceServers = () => {
  const defaultServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
  ]

  // Check custom TURN config in localStorage first, then env
  let turnConfig = null
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('just_you_me_turn_config')
      if (saved) turnConfig = JSON.parse(saved)
    } catch (e) {
      console.warn('Failed parsing saved TURN config', e)
    }
  }

  if (!turnConfig && import.meta.env.VITE_TURN_SERVER_URLS) {
    turnConfig = {
      urls: import.meta.env.VITE_TURN_SERVER_URLS.split(',').map(u => u.trim()),
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
    }
  }

  if (turnConfig && turnConfig.urls) {
    const turnEntry = {
      urls: Array.isArray(turnConfig.urls) ? turnConfig.urls : [turnConfig.urls],
    }
    if (turnConfig.username) turnEntry.username = turnConfig.username
    if (turnConfig.credential) turnEntry.credential = turnConfig.credential
    defaultServers.push(turnEntry)
  }

  return {
    iceServers: defaultServers,
    iceCandidatePoolSize: 10,
  }
}

/**
 * WebRTC Calling Manager for 1-to-1 couple calls
 */
export class WebRtcCallManager {
  constructor({ coupleSpaceId, currentUserId, onRemoteStream, onCallStateChange, onError }) {
    this.coupleSpaceId = coupleSpaceId
    this.currentUserId = currentUserId
    this.onRemoteStream = onRemoteStream || (() => {})
    this.onCallStateChange = onCallStateChange || (() => {})
    this.onError = onError || (() => {})

    this.peerConnection = null
    this.localStream = null
    this.remoteStream = null
    this.signalingChannel = null
    this.facingMode = 'user' // 'user' or 'environment'
    this.isVideoCall = true
    this.pendingIceCandidates = []
    this.callState = 'idle' // idle, outgoing, incoming, connecting, connected, ended
    this.disconnectTimer = null
  }

  setCallState(newState, metadata = {}) {
    this.callState = newState
    this.onCallStateChange(newState, metadata)
  }

  /**
   * Initializes Supabase Realtime broadcast channel for signaling
   */
  initSignaling(onIncomingCall) {
    if (!supabase || !this.coupleSpaceId) return

    this.signalingChannel = supabase.channel(`call_signaling_${this.coupleSpaceId}`, {
      config: { broadcast: { self: false } },
    })

    this.signalingChannel
      .on('broadcast', { event: 'call-offer' }, async ({ payload }) => {
        if (payload.callerId === this.currentUserId) return

        // Handle ICE restart during an active or connecting call
        if (payload.isIceRestart && (this.callState === 'connected' || this.callState === 'connecting')) {
          console.log('Received WebRTC ICE restart offer during active call. Renegotiating...')
          if (this.peerConnection) {
            try {
              await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp))
              this.processPendingCandidates()
              const answer = await this.peerConnection.createAnswer()
              await this.peerConnection.setLocalDescription(answer)
              this.signalingChannel.send({
                type: 'broadcast',
                event: 'call-answer',
                payload: {
                  sdp: answer,
                  calleeId: this.currentUserId,
                  callerId: payload.callerId,
                  isIceRestart: true,
                },
              })
            } catch (e) {
              console.warn('ICE restart renegotiation failed:', e)
            }
          }
          return
        }

        if (this.callState !== 'idle') {
          // Send busy message only for new calls when not idle
          this.signalingChannel.send({
            type: 'broadcast',
            event: 'call-busy',
            payload: { calleeId: this.currentUserId, callerId: payload.callerId },
          })
          return
        }

        this.isVideoCall = payload.isVideo
        this.setCallState('incoming', payload)
        if (onIncomingCall) {
          onIncomingCall(payload)
        }
      })
      .on('broadcast', { event: 'call-answer' }, async ({ payload }) => {
        if (payload.calleeId === this.currentUserId) return
        if (this.peerConnection && (this.callState === 'outgoing' || this.callState === 'connected' || this.callState === 'connecting')) {
          try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            if (this.callState === 'outgoing') {
              this.setCallState('connecting')
            }
            this.processPendingCandidates()
          } catch (e) {
            console.error('Error handling answer:', e)
            if (this.callState === 'outgoing') {
              this.onError('Failed to establish peer connection: ' + e.message)
            }
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.senderId === this.currentUserId) return
        if (payload.candidate) {
          const candidate = new RTCIceCandidate(payload.candidate)
          if (this.peerConnection && this.peerConnection.remoteDescription) {
            try {
              await this.peerConnection.addIceCandidate(candidate)
            } catch (e) {
              console.warn('Error adding ICE candidate:', e)
            }
          } else {
            this.pendingIceCandidates.push(candidate)
          }
        }
      })
      .on('broadcast', { event: 'call-reject' }, ({ payload }) => {
        if (payload.callerId === this.currentUserId) {
          this.setCallState('ended', { reason: 'declined' })
          this.cleanup()
        }
      })
      .on('broadcast', { event: 'call-busy' }, ({ payload }) => {
        if (payload.callerId === this.currentUserId) {
          this.setCallState('ended', { reason: 'busy' })
          this.cleanup()
        }
      })
      .on('broadcast', { event: 'call-end' }, () => {
        this.setCallState('ended', { reason: 'hungup' })
        this.cleanup()
      })
      .subscribe((status) => {
        console.log('Call signaling status:', status)
      })
  }

  async processPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift()
      try {
        await this.peerConnection.addIceCandidate(candidate)
      } catch (e) {
        console.warn('Error adding queued ICE candidate:', e)
      }
    }
  }

  /**
   * Acquires local camera/microphone stream
   */
  async acquireMedia({ isVideo = true, facingMode = 'user' }) {
    this.isVideoCall = isVideo
    this.facingMode = facingMode

    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: isVideo
        ? {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        : false,
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      return this.localStream
    } catch (err) {
      console.error('Media acquisition error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Microphone or Camera access was denied. Please allow permissions in browser settings.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No camera or microphone found on your device.')
      }
      throw err
    }
  }

  /**
   * Initializes RTCPeerConnection and attaches local tracks
   */
  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(getIceServers())

    // Remote track listener (handles both streams and individual audio/video tracks)
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0]
      } else if (event.track) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream()
        }
        if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
          this.remoteStream.addTrack(event.track)
        }
      }

      if (this.remoteStream) {
        this.onRemoteStream(this.remoteStream)
      }
    }

    // ICE candidate generation
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.signalingChannel) {
        this.signalingChannel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            senderId: this.currentUserId,
          },
        })
      }
    }

    // ICE connection state listener for prompt reconnects
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState
      console.log('Peer ICE state:', iceState)
      if (iceState === 'disconnected' || iceState === 'failed') {
        if (!this.disconnectTimer) {
          this.disconnectTimer = setTimeout(() => {
            this.disconnectTimer = null
            if (this.peerConnection?.iceConnectionState === 'disconnected' || this.peerConnection?.iceConnectionState === 'failed') {
              console.warn('ICE disconnected, initiating auto ICE restart...')
              this.restartIce()
            }
          }, 3000)
        }
      } else if (iceState === 'connected' || iceState === 'completed') {
        if (this.disconnectTimer) {
          clearTimeout(this.disconnectTimer)
          this.disconnectTimer = null
        }
      }
    }

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState
      console.log('Peer connection state:', state)
      if (state === 'connected') {
        if (this.disconnectTimer) {
          clearTimeout(this.disconnectTimer)
          this.disconnectTimer = null
        }
        this.setCallState('connected')
      } else if (state === 'disconnected') {
        console.warn('WebRTC disconnected, initiating recovery...')
        if (!this.disconnectTimer) {
          this.disconnectTimer = setTimeout(() => {
            this.disconnectTimer = null
            if (this.peerConnection?.connectionState === 'disconnected') {
              console.warn('Still disconnected after grace period, attempting ICE restart...')
              this.restartIce()
            }
          }, 3000)
        }
      } else if (state === 'failed') {
        console.warn('WebRTC failed, attempting immediate ICE restart...')
        if (this.disconnectTimer) {
          clearTimeout(this.disconnectTimer)
          this.disconnectTimer = null
        }
        this.restartIce()
      } else if (state === 'closed') {
        if (this.disconnectTimer) {
          clearTimeout(this.disconnectTimer)
          this.disconnectTimer = null
        }
        this.setCallState('ended')
      }
    }

    // Attach local stream tracks to connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream)
      })
    }
  }

  /**
   * Initiates an outgoing call
   */
  async startCall({ isVideo = true, callerName = 'Partner' }) {
    try {
      await this.acquireMedia({ isVideo })
      this.createPeerConnection()
      this.setCallState('outgoing')

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      })
      await this.peerConnection.setLocalDescription(offer)

      this.signalingChannel.send({
        type: 'broadcast',
        event: 'call-offer',
        payload: {
          sdp: offer,
          isVideo,
          callerId: this.currentUserId,
          callerName,
        },
      })
    } catch (err) {
      this.cleanup()
      this.onError(err.message || 'Could not start call')
      throw err
    }
  }

  /**
   * Answers an incoming call
   */
  async answerCall(incomingOffer) {
    try {
      await this.acquireMedia({ isVideo: incomingOffer.isVideo })
      this.createPeerConnection()
      this.setCallState('connecting')

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(incomingOffer.sdp))
      this.processPendingCandidates()

      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: incomingOffer.isVideo,
      })
      await this.peerConnection.setLocalDescription(answer)

      this.signalingChannel.send({
        type: 'broadcast',
        event: 'call-answer',
        payload: {
          sdp: answer,
          calleeId: this.currentUserId,
          callerId: incomingOffer.callerId,
        },
      })
    } catch (err) {
      this.cleanup()
      this.onError(err.message || 'Could not answer call')
      throw err
    }
  }

  /**
   * Rejects an incoming call
   */
  rejectCall(callerId) {
    if (this.signalingChannel) {
      this.signalingChannel.send({
        type: 'broadcast',
        event: 'call-reject',
        payload: { callerId, calleeId: this.currentUserId },
      })
    }
    this.cleanup()
    this.setCallState('idle')
  }

  /**
   * Ends an active or pending call
   */
  endCall() {
    if (this.signalingChannel) {
      this.signalingChannel.send({
        type: 'broadcast',
        event: 'call-end',
        payload: { senderId: this.currentUserId },
      })
    }
    this.cleanup()
    this.setCallState('ended')
  }

  /**
   * Toggles microphone audio on/off
   */
  toggleMicrophone(enabled) {
    if (!this.localStream) return false
    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = enabled !== undefined ? enabled : !audioTrack.enabled
      return audioTrack.enabled
    }
    return false
  }

  /**
   * Toggles camera video on/off
   */
  toggleCamera(enabled) {
    if (!this.localStream) return false
    const videoTrack = this.localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = enabled !== undefined ? enabled : !videoTrack.enabled
      return videoTrack.enabled
    }
    return false
  }

  /**
   * Flips between front (user) and rear (environment) camera on mobile
   */
  async switchCamera() {
    if (!this.localStream || !this.isVideoCall) return

    const newFacingMode = this.facingMode === 'user' ? 'environment' : 'user'
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      const newVideoTrack = newStream.getVideoTracks()[0]

      const sender = this.peerConnection?.getSenders().find((s) => s.track && s.track.kind === 'video')
      if (sender) {
        await sender.replaceTrack(newVideoTrack)
      }

      // Stop old video track
      const oldTrack = this.localStream.getVideoTracks()[0]
      if (oldTrack) oldTrack.stop()

      this.localStream.removeTrack(oldTrack)
      this.localStream.addTrack(newVideoTrack)
      this.facingMode = newFacingMode

      return newFacingMode
    } catch (err) {
      console.warn('Switch camera error:', err)
      throw err
    }
  }

  /**
   * Starts sharing local screen / movie player window to partner with audio
   */
  async startScreenShare() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Screen / Movie streaming is not supported on this browser.')
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true, // Captures device / movie audio
      })

      const videoTrack = displayStream.getVideoTracks()[0]
      const audioTrack = displayStream.getAudioTracks()[0]

      videoTrack.onended = () => {
        this.stopScreenShare()
      }

      // Replace or add video track in peer connection
      const videoSender = this.peerConnection?.getSenders().find((s) => s.track && s.track.kind === 'video')
      if (videoSender) {
        await videoSender.replaceTrack(videoTrack)
      } else if (this.peerConnection) {
        this.peerConnection.addTrack(videoTrack, displayStream)
      }

      // If audio track is provided by system, stream it as well
      if (audioTrack) {
        const audioSender = this.peerConnection?.getSenders().find((s) => s.track && s.track.kind === 'audio')
        if (audioSender) {
          await audioSender.replaceTrack(audioTrack)
        } else if (this.peerConnection) {
          this.peerConnection.addTrack(audioTrack, displayStream)
        }
      }

      this.screenStream = displayStream
      return displayStream
    } catch (err) {
      console.warn('Screen share error:', err)
      throw err
    }
  }

  /**
   * Stops screen share and restores local camera/mic stream
   */
  async stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => {
        try {
          t.stop()
        } catch (e) {
          // ignore
        }
      })
      this.screenStream = null
    }

    // Restore camera video track
    const cameraVideoTrack = this.localStream?.getVideoTracks()[0]
    const videoSender = this.peerConnection?.getSenders().find((s) => s.track && s.track.kind === 'video')
    if (videoSender && cameraVideoTrack) {
      await videoSender.replaceTrack(cameraVideoTrack)
    }

    // Restore mic audio track
    const micAudioTrack = this.localStream?.getAudioTracks()[0]
    const audioSender = this.peerConnection?.getSenders().find((s) => s.track && s.track.kind === 'audio')
    if (audioSender && micAudioTrack) {
      await audioSender.replaceTrack(micAudioTrack)
    }
  }

  /**
   * Attempts ICE restart if connection was interrupted (e.g. mobile cell to wifi switch)
   */
  async restartIce() {
    if (!this.peerConnection) return
    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true })
      await this.peerConnection.setLocalDescription(offer)
      this.signalingChannel?.send({
        type: 'broadcast',
        event: 'call-offer',
        payload: {
          sdp: offer,
          isVideo: this.isVideoCall,
          callerId: this.currentUserId,
          isIceRestart: true,
        },
      })
    } catch (e) {
      console.error('ICE restart failed:', e)
    }
  }

  /**
   * Releases camera, microphone, and WebRTC peer connection resources cleanly
   */
  cleanup() {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer)
      this.disconnectTimer = null
    }

    if (this.screenStream) {
      this.stopScreenShare().catch(() => {})
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch (e) {
          // ignore
        }
      })
      this.localStream = null
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close()
      } catch (e) {
        // ignore
      }
      this.peerConnection = null
    }

    this.remoteStream = null
    this.pendingIceCandidates = []
  }

  destroy() {
    this.cleanup()
    if (this.signalingChannel) {
      this.signalingChannel.unsubscribe()
      this.signalingChannel = null
    }
  }
}
