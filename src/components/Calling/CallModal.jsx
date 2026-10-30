import React, { useEffect, useRef } from 'react'
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  SwitchCamera,
  Heart,
  AlertCircle,
  Volume2,
  Minimize2,
  Maximize2,
  Film,
  Monitor,
  MonitorOff,
} from 'lucide-react'
import { useCall } from '../../context/CallContext'
import { useTheme } from '../../context/ThemeContext'

export const CallModal = ({ currentTab = null }) => {
  const { currentTheme } = useTheme()
  const {
    callState,
    isVideoCall,
    incomingCallData,
    localStream,
    remoteStream,
    isMicMuted,
    isCamOff,
    callDuration,
    callError,
    partner,
    isCallMinimized,
    minimizeCall,
    maximizeCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCam,
    switchCam,
    dismissCallError,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
  } = useCall()

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)

  // Attach local stream to video element (MUTED to prevent local echo)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream
      }
      localVideoRef.current.muted = true
      localVideoRef.current.play().catch(() => {})
    }
  }, [localStream, callState, isVideoCall])

  // Attach remote stream to video element (UNMUTED so partner voice is clear)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream
      }
      remoteVideoRef.current.muted = false
      remoteVideoRef.current.volume = 1.0
      remoteVideoRef.current.play().catch(() => {})
    }
  }, [remoteStream, callState, isVideoCall])

  // Dedicated remote audio element to ensure audio is always crystal clear in both audio and video calls
  useEffect(() => {
    const audioEl = remoteAudioRef.current
    if (audioEl && remoteStream) {
      try {
        if (audioEl.srcObject !== remoteStream) {
          audioEl.srcObject = remoteStream
        }
        audioEl.muted = false
        audioEl.volume = 1.0

        const playAudio = () => {
          const p = audioEl.play()
          if (p !== undefined) {
            p.catch((err) => {
              console.warn('Remote audio autoplay waiting for user interaction:', err)
            })
          }
        }
        playAudio()

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
        console.warn('Remote audio attach warning:', err)
      }
    } else if (audioEl && !remoteStream) {
      audioEl.srcObject = null
    }
  }, [remoteStream, callState])

  if (callState === 'idle' && !callError) return null

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Floating Picture-in-Picture mode for browsing app tabs
  // When watching a movie in Watch tab, WatchRoom renders the integrated in-movie video dock
  if (isCallMinimized && (callState === 'connected' || callState === 'connecting')) {
    if (currentTab === 'watch') {
      return null
    }

    return (
      <div className={`fixed bottom-20 right-3 sm:right-6 z-50 w-44 sm:w-56 aspect-[3/4] sm:aspect-video rounded-3xl overflow-hidden shadow-2xl border-2 ${currentTheme.border} bg-slate-950/95 backdrop-blur-md animate-scale-up group`}>
        <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" aria-hidden="true" />

        <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
          {isVideoCall ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-3 text-center">
              <div className={`w-10 h-10 rounded-full ${currentTheme.buttonGrad} flex items-center justify-center shadow-lg ${currentTheme.shadow} animate-pulse mb-1`}>
                <Heart className="w-5 h-5 fill-current text-white animate-heartbeat" />
              </div>
              <span className={`text-xs font-bold ${currentTheme.activeText} truncate max-w-[120px]`}>
                {partner?.display_name || 'My Love'}
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Audio Connected
              </span>
            </div>
          )}

          {/* Local miniature preview */}
          {isVideoCall && (
            <div className="absolute top-2 right-2 w-12 h-16 sm:w-16 sm:h-20 rounded-xl overflow-hidden border border-white/30 shadow-md bg-black/80 z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCamOff ? 'hidden' : ''}`}
              />
              {isCamOff && (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <VideoOff className="w-3 h-3 text-slate-400" />
                </div>
              )}
            </div>
          )}

          {/* Top Duration Badge */}
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{formatDuration(callDuration)}</span>
          </div>

          {/* Controls Bar */}
          <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex items-center justify-around z-20">
            <button
              onClick={toggleMic}
              className={`p-1.5 rounded-full text-white transition ${
                isMicMuted ? 'bg-amber-500' : 'bg-white/20 hover:bg-white/30'
              }`}
              title={isMicMuted ? 'Unmute' : 'Mute'}
            >
              {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {isVideoCall && (
              <button
                onClick={toggleCam}
                className={`p-1.5 rounded-full text-white transition ${
                  isCamOff ? 'bg-amber-500' : 'bg-white/20 hover:bg-white/30'
                }`}
                title={isCamOff ? 'Cam On' : 'Cam Off'}
              >
                {isCamOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              onClick={maximizeCall}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              title="Fullscreen Call"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={endCall}
              className="p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95 transition"
              title="End Call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg animate-fade-in text-white p-4">
      {/* Permanent remote audio element for full-duplex sound in audio & video calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" aria-hidden="true" />

      {/* Call Error Banner */}
      {callError && (
        <div className="absolute top-6 inset-x-4 max-w-md mx-auto p-3.5 rounded-2xl bg-red-600/90 text-white text-xs shadow-2xl flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{callError}</span>
          </div>
          <button
            onClick={dismissCallError}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* State 1: Incoming Call Screen */}
      {callState === 'incoming' && (
        <div className="flex flex-col items-center justify-center text-center max-w-sm w-full space-y-6">
          <div className="relative">
            <div className={`w-28 h-28 rounded-full ${currentTheme.buttonGrad} flex items-center justify-center shadow-2xl ${currentTheme.shadow} animate-pulse overflow-hidden border-2 ${currentTheme.borderLight}`}>
              {partner?.avatar_url ? (
                <img
                  src={partner.avatar_url}
                  alt={incomingCallData?.callerName || partner?.display_name || 'Caller'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Heart className="w-14 h-14 fill-current text-white animate-heartbeat" />
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 p-2 rounded-full bg-emerald-500 text-white shadow-md">
              {incomingCallData?.isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </span>
          </div>

          <div>
            <h2 className={`text-2xl font-bold font-romantic ${currentTheme.activeText}`}>
              {incomingCallData?.callerName || partner?.display_name || 'My Love'}
            </h2>
            <p className="text-sm text-slate-300 mt-1 flex items-center justify-center gap-1.5">
              <Volume2 className="w-4 h-4 animate-bounce" />
              Incoming {incomingCallData?.isVideo ? 'Video' : 'Voice'} Call...
            </p>
          </div>

          <div className="flex items-center justify-center gap-8 pt-4 w-full">
            {/* Decline Button */}
            <button
              onClick={rejectCall}
              className="flex flex-col items-center gap-1.5 text-xs text-slate-300 group"
            >
              <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg shadow-red-600/40 active:scale-95 transition">
                <PhoneOff className="w-6 h-6 text-white" />
              </div>
              <span>Decline</span>
            </button>

            {/* Accept Button */}
            <button
              onClick={acceptCall}
              className="flex flex-col items-center gap-1.5 text-xs text-slate-300 group"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/40 active:scale-95 transition animate-pulse">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <span>Accept</span>
            </button>
          </div>
        </div>
      )}

      {/* State 2: Outgoing Call Screen */}
      {callState === 'outgoing' && (
        <div className="flex flex-col items-center justify-center text-center max-w-sm w-full space-y-6">
          <div className={`w-28 h-28 rounded-full ${currentTheme.buttonGrad} flex items-center justify-center shadow-2xl ${currentTheme.shadow} animate-pulse overflow-hidden border-2 ${currentTheme.borderLight}`}>
            {partner?.avatar_url ? (
              <img
                src={partner.avatar_url}
                alt={partner?.display_name || 'Partner'}
                className="w-full h-full object-cover"
              />
            ) : (
              <Heart className="w-14 h-14 fill-current text-white animate-heartbeat" />
            )}
          </div>

          <div>
            <h2 className={`text-2xl font-bold font-romantic ${currentTheme.activeText}`}>
              {partner?.display_name || 'My Love'}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Calling... (Waiting for answer)
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={endCall}
              className="flex flex-col items-center gap-1 text-xs text-slate-300"
            >
              <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg shadow-red-600/40 active:scale-95 transition">
                <PhoneOff className="w-6 h-6 text-white" />
              </div>
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* State 3: Connecting or Connected Active Call */}
      {(callState === 'connected' || callState === 'connecting') && (
        <div className="relative w-full h-full max-w-5xl max-h-[92vh] flex flex-col justify-between items-center rounded-3xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl">
          {/* Main Remote Video or Audio Avatar */}
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-slate-900">
            {isVideoCall ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className={`w-32 h-32 rounded-full ${currentTheme.buttonGrad} flex items-center justify-center shadow-2xl ${currentTheme.shadow} animate-pulse overflow-hidden border-2 ${currentTheme.borderLight}`}>
                    {partner?.avatar_url ? (
                      <img
                        src={partner.avatar_url}
                        alt={partner?.display_name || 'Partner'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Heart className="w-16 h-16 fill-current text-white animate-heartbeat" />
                    )}
                  </div>
                  {/* Glowing Soundwave Ring */}
                  <span className={`absolute inset-0 rounded-full border-2 ${currentTheme.border} animate-ping opacity-30`} />
                </div>
                <h3 className={`text-xl font-bold font-romantic ${currentTheme.activeText}`}>
                  {partner?.display_name || 'My Love'}
                </h3>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Audio Call Active & Connected</span>
                </div>
              </div>
            )}

            {/* Local Picture-in-Picture Preview (if video call) */}
            {isVideoCall && (
              <div className="absolute top-4 right-4 w-28 sm:w-40 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black/80 z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isCamOff ? 'hidden' : ''}`}
                />
                {isCamOff && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400 bg-slate-900">
                    <VideoOff className="w-5 h-5 text-slate-500 mb-1" />
                    <span>Camera Off</span>
                  </div>
                )}
              </div>
            )}

            {/* Top Info Bar with Minimize Button */}
            <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold">{partner?.display_name || 'My Love'}</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-mono text-rose-300">{formatDuration(callDuration)}</span>
              <span className="text-xs text-slate-500">|</span>
              <button
                onClick={minimizeCall}
                className="hover:text-rose-400 text-slate-300 flex items-center gap-1 text-[11px] font-medium transition active:scale-95"
                title="Minimize (Watch Movie together / Browse app)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Watch Together Mode</span>
              </button>
            </div>
          </div>

          {/* Bottom Floating Control Bar */}
          <div className="absolute bottom-6 inset-x-0 mx-auto max-w-md flex items-center justify-center gap-3 sm:gap-4 bg-black/60 backdrop-blur-xl py-3 px-5 rounded-full border border-white/15 z-30 shadow-2xl">
            {/* Mute Mic */}
            <button
              onClick={toggleMic}
              className={`p-3 rounded-full transition ${
                isMicMuted
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
              title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Toggle Camera (Video Calls) */}
            {isVideoCall && (
              <>
                <button
                  onClick={toggleCam}
                  className={`p-3 rounded-full transition ${
                    isCamOff
                      ? 'bg-amber-500 text-white'
                      : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                  title={isCamOff ? 'Turn on camera' : 'Turn off camera'}
                >
                  {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>

                {/* Flip camera between front & rear on mobile */}
                <button
                  onClick={switchCam}
                  className="p-3 rounded-full bg-white/15 hover:bg-white/25 text-white transition"
                  title="Switch camera"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Stream Screen / Local Movie Window */}
            {typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia && (
              <button
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                className={`p-3 rounded-full transition ${
                  isScreenSharing
                    ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title={isScreenSharing ? 'Stop streaming screen' : 'Stream movie/screen from device'}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </button>
            )}

            {/* Minimize to PiP button */}
            <button
              onClick={minimizeCall}
              className="p-3 rounded-full bg-white/15 hover:bg-white/25 text-white transition"
              title="Minimize to Watch Movie"
            >
              <Minimize2 className="w-5 h-5" />
            </button>

            {/* Hangup / End Call Button */}
            <button
              onClick={endCall}
              className="p-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/40 active:scale-95 transition"
              title="End call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* State 4: Call Ended Notification */}
      {callState === 'ended' && (
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
            <PhoneOff className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">Call Ended</h3>
          <p className="text-xs text-slate-400">Duration: {formatDuration(callDuration)}</p>
        </div>
      )}
    </div>
  )
}
