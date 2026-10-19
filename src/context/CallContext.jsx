import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { WebRtcCallManager } from '../lib/webrtc'
import { playOutgoingRinging, playIncomingRingtone, playCallEndTone, stopCallAudio } from '../lib/audioRing'
import { showBrowserNotification } from '../lib/notificationHelper'
import { useAuth } from './AuthContext'
import { useCouple } from './CoupleContext'

const CallContext = createContext(null)

export const CallProvider = ({ children }) => {
  const { user, profile } = useAuth()
  const { coupleSpace, partner } = useCouple()

  const [callState, setCallState] = useState('idle') // idle, outgoing, incoming, connecting, connected, ended
  const [isVideoCall, setIsVideoCall] = useState(true)
  const [incomingCallData, setIncomingCallData] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [callDuration, setCallDuration] = useState(0)
  const [callError, setCallError] = useState(null)
  const [isCallMinimized, setIsCallMinimized] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const managerRef = useRef(null)
  const durationIntervalRef = useRef(null)
  const globalAudioRef = useRef(null)

  // Attach remote stream to dedicated global audio element for guaranteed audio playback
  useEffect(() => {
    const audioEl = globalAudioRef.current
    if (audioEl && remoteStream) {
      try {
        audioEl.srcObject = remoteStream
        audioEl.muted = false
        audioEl.volume = 1.0

        const playAudio = () => {
          const playPromise = audioEl.play()
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn('Audio autoPlay policy waiting for user interaction:', err)
            })
          }
        }
        playAudio()

        // Unlock audio on first touch/click in case browser autoplay policy held it
        const handleUnlock = () => {
          if (audioEl && audioEl.paused) {
            audioEl.play().catch(() => {})
          }
        }
        window.addEventListener('click', handleUnlock, { once: true })
        window.addEventListener('touchstart', handleUnlock, { once: true })

        return () => {
          window.removeEventListener('click', handleUnlock)
          window.removeEventListener('touchstart', handleUnlock)
        }
      } catch (err) {
        console.warn('Global audio attach warning:', err)
      }
    } else if (audioEl && !remoteStream) {
      audioEl.srcObject = null
    }
  }, [remoteStream, callState])

  // Initialize WebRTC signaling channel when user is paired
  useEffect(() => {
    if (!coupleSpace?.id || !user?.id) return

    const manager = new WebRtcCallManager({
      coupleSpaceId: coupleSpace.id,
      currentUserId: user.id,
      onRemoteStream: (stream) => {
        setRemoteStream(stream)
      },
      onCallStateChange: (state, metadata) => {
        setCallState(state)

        if (state === 'outgoing') {
          playOutgoingRinging()
        } else if (state === 'incoming') {
          playIncomingRingtone()
          setIncomingCallData(metadata)

          // Trigger browser notification for incoming call
          showBrowserNotification({
            title: `Incoming Call from ${metadata?.callerName || partner?.display_name || 'My Love'} 💖`,
            body: `${metadata?.isVideo ? '🎬 Incoming Video Call' : '🎙️ Incoming Voice Call'} — Click to answer!`,
            icon: partner?.avatar_url,
            tag: 'incoming-call',
            onClick: () => {
              window.focus()
            },
          })
        } else if (state === 'connected') {
          stopCallAudio()
        } else if (state === 'ended') {
          playCallEndTone()
          setIsCallMinimized(false)
          setIsScreenSharing(false)
          setTimeout(() => {
            setCallState('idle')
            setIncomingCallData(null)
            setLocalStream(null)
            setRemoteStream(null)
            setCallDuration(0)
            setIsCallMinimized(false)
            setIsScreenSharing(false)
            stopCallAudio()
          }, 2000)
        }
      },
      onError: (errMessage) => {
        stopCallAudio()
        setCallError(errMessage)
      },
    })

    manager.initSignaling((offerPayload) => {
      setIsVideoCall(offerPayload.isVideo)
    })

    managerRef.current = manager

    return () => {
      manager.destroy()
      stopCallAudio()
    }
  }, [coupleSpace?.id, user?.id, partner?.display_name, partner?.avatar_url])

  // Call duration counter
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0)
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [callState])

  const startCall = async ({ isVideo = true }) => {
    if (!managerRef.current) return
    setCallError(null)
    setIsVideoCall(isVideo)
    setIsMicMuted(false)
    setIsCamOff(false)
    setFacingMode('user')

    try {
      await managerRef.current.startCall({
        isVideo,
        callerName: profile?.display_name || user?.email || 'Partner',
      })
      setLocalStream(managerRef.current.localStream)
    } catch (err) {
      console.error('Failed to initiate call:', err)
      setCallError(err.message || 'Could not access media devices')
    }
  }

  const acceptCall = async () => {
    if (!managerRef.current || !incomingCallData) return
    stopCallAudio()
    setCallError(null)

    try {
      await managerRef.current.answerCall(incomingCallData)
      setLocalStream(managerRef.current.localStream)
    } catch (err) {
      console.error('Failed to answer call:', err)
      setCallError(err.message || 'Could not answer call')
    }
  }

  const rejectCall = () => {
    if (!managerRef.current || !incomingCallData) return
    stopCallAudio()
    managerRef.current.rejectCall(incomingCallData.callerId)
    setCallState('idle')
    setIncomingCallData(null)
  }

  const endCall = () => {
    stopCallAudio()
    if (managerRef.current) {
      managerRef.current.endCall()
    }
    setIsCallMinimized(false)
    setIsScreenSharing(false)
  }

  const toggleMic = () => {
    if (!managerRef.current) return
    const newState = !isMicMuted
    managerRef.current.toggleMicrophone(!newState)
    setIsMicMuted(newState)
  }

  const toggleCam = () => {
    if (!managerRef.current) return
    const newState = !isCamOff
    managerRef.current.toggleCamera(!newState)
    setIsCamOff(newState)
  }

  const switchCam = async () => {
    if (!managerRef.current) return
    try {
      const mode = await managerRef.current.switchCamera()
      setFacingMode(mode)
    } catch (err) {
      console.error('Failed switching camera:', err)
    }
  }

  const startScreenShare = async () => {
    if (!managerRef.current) return
    try {
      const stream = await managerRef.current.startScreenShare()
      setIsScreenSharing(true)
      const track = stream.getVideoTracks()[0]
      if (track) {
        track.onended = () => {
          setIsScreenSharing(false)
        }
      }
      return stream
    } catch (err) {
      console.error('Screen share error:', err)
      throw err
    }
  }

  const stopScreenShare = async () => {
    if (!managerRef.current) return
    await managerRef.current.stopScreenShare()
    setIsScreenSharing(false)
  }

  return (
    <CallContext.Provider
      value={{
        callState,
        isVideoCall,
        incomingCallData,
        localStream,
        remoteStream,
        isMicMuted,
        isCamOff,
        facingMode,
        callDuration,
        callError,
        partner,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMic,
        toggleCam,
        switchCam,
        isCallMinimized,
        setIsCallMinimized,
        minimizeCall: () => setIsCallMinimized(true),
        maximizeCall: () => setIsCallMinimized(false),
        dismissCallError: () => setCallError(null),
        isScreenSharing,
        startScreenShare,
        stopScreenShare,
      }}
    >
      {children}
      {/* Global audio element to guarantee remote call audio is always audible */}
      <audio
        ref={globalAudioRef}
        autoPlay
        playsInline
        className="sr-only"
        aria-hidden="true"
      />
    </CallContext.Provider>
  )
}

export const useCall = () => {
  const context = useContext(CallContext)
  if (!context) throw new Error('useCall must be used within CallProvider')
  return context
}
