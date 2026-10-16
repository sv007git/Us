import React, { useState, useEffect, useRef } from 'react'
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Send,
  Sparkles,
  Link as LinkIcon,
  Upload,
  Info,
  Heart,
  Users,
} from 'lucide-react'
import { WatchSyncEngine } from '../../lib/syncEngine'
import { useAuth } from '../../context/AuthContext'
import { useCouple } from '../../context/CoupleContext'
import { supabase } from '../../lib/supabaseClient'
import confetti from 'canvas-confetti'

// High-quality public test video sample so couples can test sync immediately
const DEFAULT_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'

export const WatchRoom = () => {
  const { user, profile } = useAuth()
  const { coupleSpace, partner } = useCouple()

  const [videoUrl, setVideoUrl] = useState(DEFAULT_VIDEO_URL)
  const [inputUrl, setInputUrl] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [partnerActionToast, setPartnerActionToast] = useState(null)
  const [videoError, setVideoError] = useState(null)
  const [roomMessages, setRoomMessages] = useState([])
  const [chatText, setChatText] = useState('')
  const [vaultVideos, setVaultVideos] = useState([])

  const videoRef = useRef(null)
  const syncEngineRef = useRef(null)
  const toastTimeoutRef = useRef(null)

  // Initialize WatchSyncEngine
  useEffect(() => {
    if (!coupleSpace?.id || !user?.id) return

    const engine = new WatchSyncEngine({
      coupleSpaceId: coupleSpace.id,
      currentUserId: user.id,
      currentUserName: profile?.display_name || 'Partner',
      videoElement: videoRef.current,
      onPartnerAction: ({ action, by, time }) => {
        const text = `${by} ${action === 'seek' ? `jumped to ${Math.floor(time)}s` : action === 'play' ? 'played the movie' : 'paused the movie'}`
        setPartnerActionToast(text)
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = setTimeout(() => setPartnerActionToast(null), 3000)
      },
    })

    engine.init()
    syncEngineRef.current = engine

    // Fetch initial state from watch_sessions if exists
    supabase
      ?.from('watch_sessions')
      .select('*')
      .eq('couple_space_id', coupleSpace.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.video_url) {
          setVideoUrl(data.video_url)
        }
      })

    // Fetch uploaded couple media videos from storage vault
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
  }, [coupleSpace?.id, user?.id, profile?.display_name])

  // Attach video element to sync engine whenever ref changes
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
      videoRef.current.play().catch((e) => {
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

  const handleLoadUrl = (e) => {
    e.preventDefault()
    if (!inputUrl.trim()) return
    setVideoUrl(inputUrl.trim())
    setInputUrl('')
    setVideoError(null)
  }

  const handleSendRoomChat = (e) => {
    e.preventDefault()
    if (!chatText.trim()) return

    const newMsg = {
      id: Date.now(),
      senderName: profile?.display_name || 'You',
      text: chatText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setRoomMessages((prev) => [...prev.slice(-20), newMsg])
    setChatText('')

    if (chatText.includes('❤️') || chatText.includes('love')) {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } })
    }
  }

  const formatSeconds = (sec) => {
    if (isNaN(sec)) return '0:00'
    const mins = Math.floor(sec / 60)
    const secs = Math.floor(sec % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-3 sm:p-4 pb-20 space-y-4">
      {/* Header Banner */}
      <div className="glass rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-rose-200/60 dark:border-rose-900/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Watch Together 🎬
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Synchronized playback with {partner?.display_name || 'your partner'} in realtime.
            </p>
          </div>
        </div>

        {partnerActionToast && (
          <div className="px-3.5 py-1.5 rounded-full bg-rose-500 text-white text-xs font-medium shadow-md shadow-rose-500/30 flex items-center gap-1.5 animate-bounce-short">
            <Users className="w-3.5 h-3.5" />
            <span>{partnerActionToast}</span>
          </div>
        )}
      </div>

      {/* Main Video Player Card */}
      <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl border border-rose-900/30">
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={() => setVideoError('Cannot play this video URL. Direct MP4/WebM HTTPS URLs are supported.')}
          className="w-full max-h-[55vh] aspect-video object-contain bg-black"
        />

        {videoError && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center text-white">
            <Info className="w-8 h-8 text-rose-500 mb-2" />
            <p className="text-sm font-semibold">{videoError}</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Please check that the URL points to a direct video file (.mp4, .webm) and allows CORS playback.
            </p>
            <button
              onClick={() => {
                setVideoUrl(DEFAULT_VIDEO_URL)
                setVideoError(null)
              }}
              className="mt-4 px-4 py-1.5 rounded-full bg-rose-500 text-xs font-semibold text-white hover:bg-rose-600 transition"
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
              className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <span>{formatSeconds(duration)}</span>
          </div>

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleTogglePlay}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10)
                    syncEngineRef.current?.broadcastAction('seek')
                  }
                }}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 transition"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted
                    setIsMuted(!isMuted)
                  }
                }}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Speed selection */}
            <div className="flex items-center space-x-1 text-xs">
              {[1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-0.5 rounded-md transition ${
                    playbackRate === rate ? 'bg-rose-500 font-bold text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Video Source Picker & URL input */}
      <div className="glass rounded-3xl p-4 border border-rose-200/60 dark:border-rose-900/40 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <LinkIcon className="w-3.5 h-3.5 text-rose-500" /> Play Video by Direct URL
        </h3>

        <form onSubmit={handleLoadUrl} className="flex gap-2">
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Paste direct HTTPS video URL (e.g. https://.../movie.mp4)"
            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-500/20 active:scale-95 transition"
          >
            Load
          </button>
        </form>

        {/* Uploaded Vault Videos Quick-Select */}
        {vaultVideos.length > 0 && (
          <div className="pt-2 border-t border-rose-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
              Or pick from videos shared in your chat vault:
            </span>
            <div className="flex flex-wrap gap-2">
              {vaultVideos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVideoUrl(v.media_url)}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-medium truncate max-w-[200px]"
                >
                  🎬 {v.content || 'Uploaded Video'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Companion Mini-Chat for Movie Night */}
      <div className="glass rounded-3xl p-4 border border-rose-200/60 dark:border-rose-900/40 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" /> Movie Night Companion Chat
        </h3>

        <div className="h-32 overflow-y-auto space-y-2 p-2 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-rose-100 dark:border-slate-800 text-xs">
          {roomMessages.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              React and comment on scenes together while watching! 🍿
            </p>
          ) : (
            roomMessages.map((msg) => (
              <div key={msg.id} className="flex items-baseline gap-2">
                <span className="font-semibold text-rose-600 dark:text-rose-400">{msg.senderName}:</span>
                <span className="text-slate-700 dark:text-slate-200">{msg.text}</span>
                <span className="text-[10px] text-slate-400 ml-auto">{msg.time}</span>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendRoomChat} className="flex gap-2">
          <input
            type="text"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder="Send a movie reaction..."
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            type="submit"
            className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white hover:opacity-95 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Educational Note about DRM & Streaming Services */}
      <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-700 dark:text-slate-300">Supported Media Notice:</strong> This synchronized player supports direct HTTPS MP4, WebM, and user-uploaded videos from your private storage. DRM-protected proprietary services (such as Netflix, Prime, Disney+) strictly prohibit third-party embedding.
        </p>
      </div>
    </div>
  )
}
