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
} from 'lucide-react'
import { useCall } from '../../context/CallContext'

export const CallModal = () => {
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
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCam,
    switchCam,
    dismissCallError,
  } = useCall()

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, callState])

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, callState])

  if (callState === 'idle' && !callError) return null

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg animate-fade-in text-white p-4">
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
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-rose-500/50 animate-pulse">
              <Heart className="w-14 h-14 fill-current text-white animate-heartbeat" />
            </div>
            <span className="absolute -bottom-1 -right-1 p-2 rounded-full bg-emerald-500 text-white shadow-md">
              {incomingCallData?.isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold font-romantic text-rose-300">
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
          <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-rose-500/40 animate-pulse">
            <Heart className="w-14 h-14 fill-current text-white animate-heartbeat" />
          </div>

          <div>
            <h2 className="text-2xl font-bold font-romantic text-rose-300">
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
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-rose-500/30 animate-pulse">
                  <Heart className="w-16 h-16 fill-current text-white animate-heartbeat" />
                </div>
                <h3 className="text-xl font-bold font-romantic text-rose-300">
                  {partner?.display_name || 'My Love'}
                </h3>
                <span className="text-xs text-slate-400">Audio Call Active</span>
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

            {/* Top Info Bar */}
            <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold">{partner?.display_name || 'My Love'}</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-mono text-rose-300">{formatDuration(callDuration)}</span>
            </div>
          </div>

          {/* Bottom Floating Control Bar */}
          <div className="absolute bottom-6 inset-x-0 mx-auto max-w-sm flex items-center justify-center gap-3 sm:gap-4 bg-black/60 backdrop-blur-xl py-3 px-5 rounded-full border border-white/15 z-30 shadow-2xl">
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
