import React, { useState, useEffect, useRef } from 'react'
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Link as LinkIcon,
  Upload,
  Info,
  Heart,
  Users,
  X,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  Monitor,
  MonitorOff,
  FolderPlus,
  Radio,
} from 'lucide-react'
import { WatchSyncEngine, normalizeVideoUrl } from '../../lib/syncEngine'
import { useAuth } from '../../context/AuthContext'
import { useCouple } from '../../context/CoupleContext'
import { useCall } from '../../context/CallContext'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../lib/supabaseClient'
import { uploadCoupleMedia, getSignedMediaUrl } from '../../lib/storageHelper'
import confetti from 'canvas-confetti'

// High-quality public test video sample so couples can test sync immediately
const DEFAULT_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'

export const WatchRoom = ({ currentTab = 'watch' }) => {
  const { currentTheme } = useTheme()
  const { user, profile } = useAuth()
  const { coupleSpace, partner } = useCouple()
  const {
    callState,
    isVideoCall,
    localStream,
    remoteStream,
    isMicMuted,
    isCamOff,
    callDuration,
    startCall,
    endCall,
    toggleMic,
    toggleCam,
    minimizeCall,
    maximizeCall,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
  } = useCall()

  // Video playback states
  const [videoUrl, setVideoUrl] = useState(DEFAULT_VIDEO_URL)
  const [inputUrl, setInputUrl] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [partnerActionToast, setPartnerActionToast] = useState(null)
  const [videoError, setVideoError] = useState(null)
  const [vaultVideos, setVaultVideos] = useState([])

  // Local device movie streaming & cloud vault upload states
  const [localMovieFile, setLocalMovieFile] = useState(null)
  const [isUploadingLocalMovie, setIsUploadingLocalMovie] = useState(false)
  const [localMovieUploadProgress, setLocalMovieUploadProgress] = useState(0)
  const localVideoInputRef = useRef(null)

  // Floating in-video call dock state
  const [isCallDocked, setIsCallDocked] = useState(true)

  const videoRef = useRef(null)
  const videoContainerRef = useRef(null)
  const syncEngineRef = useRef(null)
  const toastTimeoutRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)

  // Dedicated audio playback for in-movie call dock (ensures partner is 100% audible)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      if (remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream
      }
      remoteAudioRef.current.muted = false
      remoteAudioRef.current.volume = 1.0
      remoteAudioRef.current.play().catch((e) => {
        console.warn('In-movie call audio autoplay catch:', e)
      })
    }
  }, [remoteStream, callState])

  // Attach remote stream to in-movie video PIP (UNMUTED so partner voice is clear)
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

  // Attach local stream to miniature preview (MUTED to prevent local echo)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream
      }
      localVideoRef.current.muted = true
      localVideoRef.current.play().catch(() => {})
    }
  }, [localStream, callState, isVideoCall])

  // Format seconds into MM:SS
  const formatSeconds = (sec) => {
    if (isNaN(sec) || sec === null) return '0:00'
    const mins = Math.floor(sec / 60)
    const secs = Math.floor(sec % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Format call duration
  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Initialize WatchSyncEngine
  useEffect(() => {
    if (!coupleSpace?.id || !user?.id) return

    const engine = new WatchSyncEngine({
      coupleSpaceId: coupleSpace.id,
      currentUserId: user.id,
      currentUserName: profile?.display_name || 'Partner',
      videoElement: videoRef.current,
      onPartnerAction: ({ action, by, time, isMuted: remoteMuted }) => {
        if (remoteMuted !== undefined) {
          setIsMuted(remoteMuted)
        }
        const text = `${by} ${
          action === 'seek'
            ? `jumped to ${Math.floor(time)}s`
            : action === 'play'
            ? 'played the movie'
            : action === 'pause'
            ? 'paused the movie'
            : action === 'mute'
            ? 'muted the movie'
            : action === 'unmute'
            ? 'unmuted the movie'
            : 'synced the movie'
        }`
        setPartnerActionToast(text)
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = setTimeout(() => setPartnerActionToast(null), 3000)
      },
    })

    engine.init()
    syncEngineRef.current = engine

    // Listen to video-url-changed broadcast on sync channel
    if (engine.channel) {
      engine.channel
        .on('broadcast', { event: 'video-url-changed' }, ({ payload }) => {
          if (payload && payload.senderId !== user.id && payload.url) {
            setVideoUrl(payload.url)
            setLocalMovieFile(null)
            setVideoError(null)
            setPartnerActionToast(`${payload.senderName || 'Your partner'} loaded a movie 🎬`)
            confetti({ particleCount: 30, spread: 60, origin: { y: 0.5 } })
          }
        })
        .on('broadcast', { event: 'local-movie-announced' }, ({ payload }) => {
          if (payload && payload.senderId !== user.id) {
            setPartnerActionToast(`${payload.senderName} loaded local movie: ${payload.fileName}`)
          }
        })
    }

    // Fetch initial state from watch_sessions if exists
    supabase
      ?.from('watch_sessions')
      .select('*')
      .eq('couple_space_id', coupleSpace.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.video_url) {
          setVideoUrl(data.video_url)
          if (data.playback_position && videoRef.current) {
            videoRef.current.currentTime = parseFloat(data.playback_position)
          }
        }
      })

    // Fetch uploaded videos from storage vault
    supabase
      ?.from('messages')
      .select('id, content, media_url, created_at')
      .eq('couple_space_id', coupleSpace.id)
      .eq('message_type', 'video')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setVaultVideos(data)
      })

    return () => {
      engine.destroy()
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [coupleSpace?.id, user?.id, profile?.display_name, partner?.display_name])

  // Attach video element whenever videoUrl updates
  useEffect(() => {
    if (videoRef.current && syncEngineRef.current) {
      syncEngineRef.current.setVideoElement(videoRef.current)
    }
  }, [videoUrl])

  // Video event handlers
  const handlePlay = () => {
    setIsPlaying(true)
    syncEngineRef.current?.broadcastAction('play')
  }

  const handlePause = () => {
    setIsPlaying(false)
    syncEngineRef.current?.broadcastAction('pause')
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setVideoError(null)
    }
  }

  const handleSeek = (e) => {
    const target = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = target
      setCurrentTime(target)
      syncEngineRef.current?.broadcastAction('seek')
    }
  }

  const handleTogglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {
        setVideoError('Click anywhere on the video to allow playback.')
      })
    } else {
      videoRef.current.pause()
    }
  }

  const handleSpeedChange = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setPlaybackRate(rate)
      syncEngineRef.current?.broadcastAction('rate')
    }
  }

  const handleToggleFullscreen = () => {
    const el = videoContainerRef.current || videoRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {})
      } else if (videoRef.current?.webkitEnterFullscreen) {
        videoRef.current.webkitEnterFullscreen()
      }
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  const handleLoadUrl = async (e) => {
    e.preventDefault()
    if (!inputUrl.trim()) return
    const raw = inputUrl.trim()
    const normalized = normalizeVideoUrl(raw)
    setVideoUrl(normalized)
    setInputUrl('')
    setLocalMovieFile(null)
    setVideoError(null)

    // Broadcast to partner so both screens load the movie simultaneously
    syncEngineRef.current?.channel?.send({
      type: 'broadcast',
      event: 'video-url-changed',
      payload: {
        url: normalized,
        rawUrl: raw,
        senderId: user.id,
        senderName: profile?.display_name || 'Partner',
      },
    })

    // Persist to database watch_sessions
    try {
      await supabase?.from('watch_sessions').upsert(
        {
          couple_space_id: coupleSpace.id,
          video_url: normalized,
          playback_position: 0,
          is_playing: false,
          last_updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'couple_space_id' }
      )
    } catch (err) {
      console.warn('Could not save movie URL to watch_sessions:', err)
    }

    confetti({ particleCount: 25, spread: 60, origin: { y: 0.5 } })
  }

  // Local device movie selection
  const handleLocalVideoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLocalMovieFile(file)
    const localBlobUrl = URL.createObjectURL(file)
    setVideoUrl(localBlobUrl)
    setVideoError(null)

    syncEngineRef.current?.channel?.send({
      type: 'broadcast',
      event: 'local-movie-announced',
      payload: {
        senderId: user.id,
        senderName: profile?.display_name || 'Partner',
        fileName: file.name,
        fileSize: file.size,
      },
    })

    confetti({ particleCount: 25, spread: 50, origin: { y: 0.5 } })
  }

  const handleStartLiveStream = async () => {
    try {
      if (callState === 'idle') {
        await startCall({ isVideo: true })
      }
      await startScreenShare()
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } })
      setPartnerActionToast('Streaming your movie/screen to your partner with audio!')
    } catch (err) {
      console.warn('Live stream error:', err)
      setVideoError('Could not start live stream: ' + err.message)
    }
  }

  const handleUploadMovieToVault = async () => {
    if (!localMovieFile || !coupleSpace?.id) return
    setIsUploadingLocalMovie(true)
    setLocalMovieUploadProgress(20)

    try {
      const uploadRes = await uploadCoupleMedia({
        coupleSpaceId: coupleSpace.id,
        file: localMovieFile,
        category: 'video',
      })

      setLocalMovieUploadProgress(85)
      const signedUrl = uploadRes.signedUrl || (await getSignedMediaUrl(uploadRes.path, 86400)) || uploadRes.path
      setVideoUrl(signedUrl)

      await supabase.from('messages').insert({
        couple_space_id: coupleSpace.id,
        sender_id: user.id,
        content: `🎬 Uploaded Movie: ${localMovieFile.name}`,
        message_type: 'video',
        media_url: uploadRes.path,
        media_metadata: { name: localMovieFile.name, size: localMovieFile.size },
      })

      syncEngineRef.current?.broadcastAction('url_change', { url: signedUrl })
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } })
      setPartnerActionToast(`Uploaded "${localMovieFile.name}" to Cloud Vault!`)
    } catch (err) {
      console.error('Vault movie upload error:', err)
      setVideoError('Upload to vault failed: ' + err.message)
    } finally {
      setIsUploadingLocalMovie(false)
      setLocalMovieUploadProgress(0)
    }
  }

  const handleEjectLocalMovie = () => {
    setLocalMovieFile(null)
    setVideoUrl(DEFAULT_VIDEO_URL)
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 pb-20 space-y-4 animate-fade-in">
      {/* Top Header Card (Aesthetically aligned with Memories page) */}
      <div className={`glass rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border ${currentTheme.border}`}>
        <div className="flex items-start sm:items-center space-x-3">
          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${currentTheme.primary} text-white flex items-center justify-center shadow-md ${currentTheme.shadow} shrink-0`}>
            <Film className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              Watch Together 🎬
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sync playback with {partner?.display_name || 'your partner'} and talk live.
            </p>
          </div>
        </div>

        {/* Live Audio / Video Call Controls in Watch Room */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          {callState === 'idle' && (
            <>
              <button
                onClick={() => {
                  startCall({ isVideo: false })
                  minimizeCall()
                }}
                className="py-2 px-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                title="Start Voice Call while watching movie"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Voice Call</span>
              </button>
              <button
                onClick={() => {
                  startCall({ isVideo: true })
                  minimizeCall()
                }}
                className={`py-2 px-3.5 rounded-full ${currentTheme.buttonGrad} hover:opacity-95 text-white text-xs font-semibold shadow-md ${currentTheme.shadow} active:scale-95 transition flex items-center gap-1.5`}
                title="Start Video Call while watching movie"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video Call</span>
              </button>
            </>
          )}

          {(callState === 'outgoing' || callState === 'incoming') && (
            <div className="px-3.5 py-1.5 rounded-full bg-amber-500/90 text-white text-xs font-semibold flex items-center gap-1.5 animate-pulse shadow-sm">
              <Phone className="w-3.5 h-3.5 animate-bounce" />
              <span>Connecting call...</span>
            </div>
          )}

          {callState === 'connected' && (
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-emerald-500/50 px-3 py-1.5 rounded-full text-white text-xs shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-emerald-300 font-bold">
                {formatCallDuration(callDuration)}
              </span>
              <div className="h-3 w-px bg-slate-700 mx-1" />
              <button
                onClick={toggleMic}
                className={`p-1 rounded-full transition ${isMicMuted ? 'text-amber-400' : 'text-slate-300 hover:text-white'}`}
                title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              {isVideoCall && (
                <button
                  onClick={toggleCam}
                  className={`p-1 rounded-full transition ${isCamOff ? 'text-amber-400' : 'text-slate-300 hover:text-white'}`}
                  title={isCamOff ? 'Turn Cam On' : 'Turn Cam Off'}
                >
                  {isCamOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                onClick={maximizeCall}
                className="p-1 rounded-full text-slate-300 hover:text-white transition"
                title="Fullscreen Call"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={endCall}
                className="p-1 rounded-full text-red-400 hover:text-red-300 transition"
                title="End Call"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {partnerActionToast && (
            <div className={`px-3 py-1 rounded-full ${currentTheme.badge} text-xs font-medium shadow-md flex items-center gap-1.5 animate-bounce-short`}>
              <Users className="w-3 h-3" />
              <span>{partnerActionToast}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Video Player Card */}
      <div
        ref={videoContainerRef}
        className={`relative rounded-3xl overflow-hidden bg-black shadow-xl border ${currentTheme.borderLight} group`}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={() =>
            setVideoError(
              'Cannot play this video URL. If using Google Drive, make sure file access is set to "Anyone with the link can view", or use direct MP4/WebM URLs.'
            )
          }
          className="w-full max-h-[55vh] aspect-video object-contain bg-black"
        />

        {/* IN-MOVIE FLOATING PARTNER OVERLAY (When Call is Active) */}
        {callState === 'connected' && isCallDocked && (
          <div className={`absolute top-3 right-3 z-20 w-32 sm:w-44 aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden border-2 ${currentTheme.border} shadow-2xl bg-black/90 backdrop-blur-md animate-scale-up`}>
            {/* Dedicated remote audio playback */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" aria-hidden="true" />
            {isVideoCall ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-white">
                <div className={`w-8 h-8 rounded-full ${currentTheme.buttonGrad} flex items-center justify-center mb-1 animate-pulse`}>
                  <Heart className="w-4 h-4 fill-current text-white animate-heartbeat" />
                </div>
                <span className={`text-[11px] font-bold ${currentTheme.activeText} truncate max-w-[100px]`}>
                  {partner?.display_name || 'My Love'}
                </span>
                <span className="text-[9px] text-emerald-400 font-mono">
                  {formatCallDuration(callDuration)}
                </span>
              </div>
            )}

            {/* Local thumbnail preview inside the video overlay */}
            {isVideoCall && (
              <div className="absolute top-1.5 right-1.5 w-10 h-14 sm:w-12 sm:h-16 rounded-lg overflow-hidden border border-white/40 shadow bg-black z-10">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isCamOff ? 'hidden' : ''}`}
                />
                {isCamOff && (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800 text-[8px] text-slate-400">
                    Off
                  </div>
                )}
              </div>
            )}

            {/* Overlay partner header and close/undock button */}
            <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-bold text-white shadow-sm">
                {partner?.display_name || 'Partner'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCallDocked(false)}
              className="absolute bottom-1.5 right-1.5 z-10 p-1 rounded-full bg-black/60 text-white/80 hover:text-white transition"
              title="Hide overlay"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Restore overlay button if hidden */}
        {callState === 'connected' && !isCallDocked && (
          <button
            type="button"
            onClick={() => setIsCallDocked(true)}
            className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold border border-white/20 flex items-center gap-1.5 shadow-lg hover:bg-black/80 transition"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Show Call</span>
          </button>
        )}

        {videoError && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center text-white">
            <Info className={`w-8 h-8 ${currentTheme.activeText} mb-2`} />
            <p className="text-sm font-semibold">{videoError}</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Please check that the URL points to a direct video file (.mp4, .webm) or Google Drive link with public view permissions.
            </p>
            <button
              onClick={() => {
                setVideoUrl(DEFAULT_VIDEO_URL)
                setVideoError(null)
              }}
              className={`mt-4 px-4 py-1.5 rounded-full ${currentTheme.buttonGrad} text-xs font-semibold text-white transition active:scale-95`}
            >
              Play Sample Video
            </button>
          </div>
        )}

        {/* Video Controls Bar */}
        <div className="p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2">
          {/* Progress Seek Bar */}
          <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
            <span>{formatSeconds(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-current"
            />
            <span>{formatSeconds(duration)}</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-white">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleTogglePlay}
                className="p-1.5 sm:p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    const target = Math.max(0, videoRef.current.currentTime - 10)
                    videoRef.current.currentTime = target
                    setCurrentTime(target)
                    syncEngineRef.current?.broadcastAction('seek')
                  }
                }}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/80 transition active:scale-95"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    const maxT = videoRef.current.duration || 999999
                    const target = Math.min(maxT, videoRef.current.currentTime + 10)
                    videoRef.current.currentTime = target
                    setCurrentTime(target)
                    syncEngineRef.current?.broadcastAction('seek')
                  }
                }}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/80 transition active:scale-95"
                title="Forward 10 seconds"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    const nextMuted = !isMuted
                    videoRef.current.muted = nextMuted
                    setIsMuted(nextMuted)
                    syncEngineRef.current?.broadcastAction(nextMuted ? 'mute' : 'unmute', { isMuted: nextMuted })
                  }
                }}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/80 transition active:scale-95"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={handleToggleFullscreen}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/80 transition active:scale-95"
                title="Toggle Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>

            {/* Speed selection */}
            <div className="flex items-center space-x-1 text-xs">
              {[1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-0.5 rounded-md transition ${
                    playbackRate === rate
                      ? `${currentTheme.buttonGrad} font-bold text-white`
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Local Video Input */}
      <input
        ref={localVideoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/x-matroska,video/*"
        onChange={handleLocalVideoSelect}
        className="hidden"
      />

      {/* 1. Stream Movie from Local Device Card */}
      <div className={`glass rounded-3xl p-4 sm:p-5 border ${currentTheme.border} space-y-3.5 shadow-sm`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${currentTheme.activeText} flex items-center gap-1.5`}>
            <Film className="w-3.5 h-3.5" /> Play & Stream Movie from Local Device
          </h3>
          {localMovieFile && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Playing Local File
            </span>
          )}
        </div>

        {/* Buttons: Pick File from Device & Stream Screen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => localVideoInputRef.current?.click()}
            className={`py-2.5 px-3.5 rounded-2xl ${currentTheme.buttonGrad} hover:opacity-95 text-white text-xs font-bold shadow-md ${currentTheme.shadow} active:scale-95 transition flex items-center justify-center gap-2`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>{localMovieFile ? 'Change Local Movie File' : 'Choose Movie from Device'}</span>
          </button>

          {typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia && (
            <button
              type="button"
              onClick={isScreenSharing ? stopScreenShare : handleStartLiveStream}
              className={`py-2.5 px-3.5 rounded-2xl text-xs font-bold shadow-md active:scale-95 transition flex items-center justify-center gap-2 ${
                isScreenSharing
                  ? `${currentTheme.badge} ring-2 ${currentTheme.ring}`
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {isScreenSharing ? (
                <>
                  <MonitorOff className="w-4 h-4" />
                  <span>Stop Streaming Screen</span>
                </>
              ) : (
                <>
                  <Radio className={`w-4 h-4 ${currentTheme.activeText}`} />
                  <span>Live Stream Screen & Audio</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Local Active Movie Info & Actions */}
        {localMovieFile && (
          <div className={`p-3.5 rounded-2xl ${currentTheme.softBg} border ${currentTheme.borderLight} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in`}>
            <div className="truncate max-w-full">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">
                🎬 {localMovieFile.name}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {(localMovieFile.size / (1024 * 1024)).toFixed(1)} MB • Loaded from local disk
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleUploadMovieToVault}
                disabled={isUploadingLocalMovie}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border ${currentTheme.border} ${currentTheme.activeText} text-xs font-semibold ${currentTheme.softHover} transition flex items-center justify-center gap-1.5 disabled:opacity-50`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingLocalMovie ? `Uploading ${localMovieUploadProgress}%...` : 'Upload to Cloud Vault'}</span>
              </button>
              <button
                type="button"
                onClick={handleEjectLocalMovie}
                className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 transition"
                title="Eject local movie"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Video Source Picker & Google Drive / URL input */}
      <div className={`glass rounded-3xl p-4 sm:p-5 border ${currentTheme.border} space-y-3.5 shadow-sm`}>
        <div className="flex flex-col gap-1">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${currentTheme.activeText} flex items-center gap-1.5`}>
            <LinkIcon className="w-3.5 h-3.5" /> Watch via Google Drive or Web Link (Synced for Both)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload your movie to Google Drive (set access to "Anyone with the link can view") or paste a video URL. Playback, pause, and seeking stay in 100% sync!
          </p>
        </div>

        <form onSubmit={handleLoadUrl} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Paste Google Drive link (https://drive.google.com/...) or direct video URL"
            className={`flex-1 min-w-0 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${currentTheme.ring}`}
          />
          <button
            type="submit"
            className={`py-2.5 px-5 rounded-2xl ${currentTheme.buttonGrad} text-white text-xs font-bold shadow-md ${currentTheme.shadow} active:scale-95 transition whitespace-nowrap self-stretch sm:self-auto`}
          >
            Load for Both
          </button>
        </form>

        {/* Uploaded Vault Videos Quick-Select */}
        {vaultVideos.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
              Or pick from videos shared in your vault:
            </span>
            <div className="flex flex-wrap gap-2">
              {vaultVideos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setVideoUrl(v.media_url)
                    setLocalMovieFile(null)
                  }}
                  className={`px-3 py-1 rounded-xl ${currentTheme.softBg} ${currentTheme.activeText} ${currentTheme.softHover} text-xs font-medium truncate max-w-[200px] border ${currentTheme.borderLight} transition active:scale-95`}
                >
                  🎬 {v.content || 'Uploaded Video'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
