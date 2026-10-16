import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { WebRtcCallManager } from '../lib/webrtc'
import { playOutgoingRinging, playIncomingRingtone, playCallEndTone, stopCallAudio } from '../lib/audioRing'
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

  const managerRef = useRef(null)
  const durationIntervalRef = useRef(null)

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
        } else if (state === 'connected') {
          stopCallAudio()
        } else if (state === 'ended') {
          playCallEndTone()
          setIsCallMinimized(false)
          setTimeout(() => {
            setCallState('idle')
            setIncomingCallData(null)
            setLocalStream(null)
            setRemoteStream(null)
            setCallDuration(0)
            setIsCallMinimized(false)
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
  }, [coupleSpace?.id, user?.id])

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
    setCallState('ended')
    setTimeout(() => {
      setCallState('idle')
      setIncomingCallData(null)
      setLocalStream(null)
      setRemoteStream(null)
      setCallDuration(0)
    }, 1500)
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
      const newMode = await managerRef.current.switchCamera()
      setFacingMode(newMode)
    } catch (err) {
      setCallError('Could not switch camera: ' + err.message)
    }
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
      }}
    >
      {children}
    </CallContext.Provider>
  )
}

export const useCall = () => {
  const context = useContext(CallContext)
  if (!context) throw new Error('useCall must be used within CallProvider')
  return context
}
