import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
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
  Camera,
  Mic,
  MicOff,
  Paperclip,
  Smile,
  X,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  Clock,
  CheckCheck,
  Flame,
  Laugh,
  Monitor,
  MonitorOff,
  FolderPlus,
  Radio,
  Clapperboard,
} from 'lucide-react'
import { WatchSyncEngine, normalizeVideoUrl } from '../../lib/syncEngine'
import { useAuth } from '../../context/AuthContext'
import { useCouple } from '../../context/CoupleContext'
import { useCall } from '../../context/CallContext'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../lib/supabaseClient'
import { uploadCoupleMedia, getSignedMediaUrl } from '../../lib/storageHelper'
import { VoiceRecorder } from '../Chat/VoiceRecorder'
import { GifPicker } from '../Chat/GifPicker'
import confetti from 'canvas-confetti'

import { REACTION_EMOJIS, toggleMessageReaction } from '../../lib/reactionHelper'

// High-quality public test video sample so couples can test sync immediately
const DEFAULT_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'

export const WatchRoom = () => {
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
    isCallMinimized,
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
  const [partnerLocalMovieNotice, setPartnerLocalMovieNotice] = useState(null)
  const localVideoInputRef = useRef(null)

  // Screenshot and rich attachment states
  const [isCapturing, setIsCapturing] = useState(false)
  const [pendingAttachment, setPendingAttachment] = useState(null) // { type, previewUrl, blob, file, timestamp, name }
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false)
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false)
  const [activeReactionPickerId, setActiveReactionPickerId] = useState(null)

  // In-video companion chat messages
  const [roomMessages, setRoomMessages] = useState([])
  const [chatText, setChatText] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Audio player state for voice notes
  const [playingAudioId, setPlayingAudioId] = useState(null)
  const [audioProgress, setAudioProgress] = useState(0)

  // Floating in-video call dock state
  const [isCallDocked, setIsCallDocked] = useState(true)

  const videoRef = useRef(null)
  const syncEngineRef = useRef(null)
  const toastTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const chatMessagesEndRef = useRef(null)
  const companionAudioRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)

  // Dedicated audio playback for in-movie call dock (ensures partner is 100% audible)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
      remoteAudioRef.current.muted = false
      remoteAudioRef.current.volume = 1.0
      remoteAudioRef.current.play().catch((e) => {
        console.warn('In-movie call audio autoplay catch:', e)
      })
    }
  }, [remoteStream, callState])

  // Attach remote and local call streams to in-movie video PIP
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch(() => {})
    }
  }, [remoteStream, callState])

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, callState])

  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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

  // Initialize WatchSyncEngine & Realtime Watch Chat
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

    // Listen to watch-chat, watch-reaction, and video-url-changed broadcasts on sync channel
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
        .on('broadcast', { event: 'watch-chat' }, ({ payload }) => {
          if (payload && payload.id && payload.senderId !== user.id) {
            setRoomMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev
              return [...prev, payload]
            })
            setTimeout(scrollToBottom, 60)
          }
        })
        .on('broadcast', { event: 'watch-reaction' }, ({ payload }) => {
          if (payload?.messageId && payload?.reactions) {
            setRoomMessages((prev) =>
              prev.map((m) =>
                m.id === payload.messageId
                  ? { ...m, media_metadata: { ...(m.media_metadata || {}), reactions: payload.reactions } }
                  : m
              )
            )
          }
        })
        .on('broadcast', { event: 'local-movie-announced' }, ({ payload }) => {
          if (payload && payload.senderId !== user.id) {
            setPartnerLocalMovieNotice(payload)
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

    // Fetch recent messages tagged for watch sessions or chat history
    supabase
      ?.from('messages')
      .select('*')
      .eq('couple_space_id', coupleSpace.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(async ({ data }) => {
        if (data) {
          const resolved = await Promise.all(
            data.reverse().map(async (msg) => {
              let url = msg.media_url
              if (url && !url.startsWith('http')) {
                url = (await getSignedMediaUrl(url, 86400)) || url
              }
              return {
                id: msg.id,
                senderId: msg.sender_id,
                senderName:
                  msg.sender_id === user.id
                    ? profile?.display_name || 'You'
                    : partner?.display_name || 'Partner',
                text: msg.content || '',
                message_type: msg.message_type,
                media_url: url,
                media_metadata: msg.media_metadata || {},
                time: new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              }
            })
          )
          setRoomMessages(resolved)
          setTimeout(scrollToBottom, 100)
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

  // ===================================================================
  // LOCAL DEVICE MOVIE STREAMING & VAULT UPLOAD
  // ===================================================================
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

  // ===================================================================
  // SCREENSHOT CAPTURE FUNCTIONALITY
  // ===================================================================
  const handleCaptureScreenshot = () => {
    if (!videoRef.current) return
    setIsCapturing(true)

    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 360
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const timestamp = formatSeconds(video.currentTime)

      canvas.toBlob(
        (blob) => {
          setIsCapturing(false)
          if (blob) {
            const previewUrl = URL.createObjectURL(blob)
            const file = new File([blob], `scene_${Math.floor(video.currentTime)}s.jpg`, {
              type: 'image/jpeg',
            })
            setPendingAttachment({
              type: 'screenshot',
              file,
              previewUrl,
              timestamp,
              name: `Scene at ${timestamp}`,
            })
            confetti({ particleCount: 20, spread: 50, origin: { y: 0.5 } })
          }
        },
        'image/jpeg',
        0.85
      )
    } catch (err) {
      setIsCapturing(false)
      console.warn('Canvas snapshot restriction due to cross-origin headers:', err)
      // Fallback: create bookmark tag
      setPendingAttachment({
        type: 'scene_bookmark',
        timestamp: formatSeconds(videoRef.current.currentTime),
        previewUrl: null,
        name: `Scene bookmark at ${formatSeconds(videoRef.current.currentTime)}`,
      })
    }
  }

  // File Picker for custom image attachments
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setPendingAttachment({
      type: 'image',
      file,
      previewUrl,
      timestamp: formatSeconds(currentTime),
      name: file.name,
    })
    e.target.value = ''
  }

  // ===================================================================
  // COMPANION CHAT: SEND MESSAGE & MEDIA
  // ===================================================================
  const handleSendRoomChat = async (e) => {
    e?.preventDefault()
    if (!chatText.trim() && !pendingAttachment) return
    if (!user?.id || !coupleSpace?.id) return

    setIsSending(true)
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    let messageType = 'text'
    let mediaUrl = null
    let metadata = {
      is_watch_reaction: true,
      movie_timestamp: currentTime,
      reactions: {},
    }

    try {
      // 1. Process Attachment if present
      if (pendingAttachment) {
        if (pendingAttachment.file) {
          messageType = 'image'
          metadata.is_screenshot = pendingAttachment.type === 'screenshot'
          metadata.timestamp = pendingAttachment.timestamp

          try {
            const uploadRes = await uploadCoupleMedia({
              coupleSpaceId: coupleSpace.id,
              file: pendingAttachment.file,
              category: 'media',
            })
            mediaUrl = uploadRes.signedUrl || uploadRes.path
          } catch (uploadErr) {
            console.warn('Storage upload fallback to data URL:', uploadErr)
            mediaUrl = pendingAttachment.previewUrl
          }
        } else if (pendingAttachment.type === 'scene_bookmark') {
          metadata.is_scene_bookmark = true
          metadata.timestamp = pendingAttachment.timestamp
        }
      }

      const content = chatText.trim() || (pendingAttachment?.type === 'screenshot' ? `📸 Captured scene at ${pendingAttachment.timestamp}` : '')

      // 2. Insert to Supabase DB for persistence
      let createdMsgId = String(Date.now())
      try {
        const { data: dbMsg } = await supabase
          .from('messages')
          .insert({
            couple_space_id: coupleSpace.id,
            sender_id: user.id,
            content,
            message_type: messageType,
            media_url: mediaUrl,
            media_metadata: metadata,
          })
          .select()
          .single()

        if (dbMsg?.id) createdMsgId = dbMsg.id
      } catch (err) {
        console.warn('Could not persist watch chat to database:', err)
      }

      const newMsg = {
        id: createdMsgId,
        senderId: user.id,
        senderName: profile?.display_name || 'You',
        text: content,
        message_type: messageType,
        media_url: mediaUrl,
        media_metadata: metadata,
        time: timestampStr,
      }

      // 3. Local update and Broadcast to partner
      setRoomMessages((prev) => [...prev, newMsg])
      syncEngineRef.current?.channel?.send({
        type: 'broadcast',
        event: 'watch-chat',
        payload: newMsg,
      })

      // 4. Reset composer
      setChatText('')
      setPendingAttachment(null)

      if (content.includes('❤️') || content.includes('love') || messageType === 'image') {
        confetti({ particleCount: 25, spread: 60, origin: { y: 0.7 } })
      }
      setTimeout(scrollToBottom, 60)
    } catch (err) {
      console.error('Error sending room chat:', err)
    } finally {
      setIsSending(false)
    }
  }

  // Send Voice Note from inline recorder
  const handleSendAudio = async (data, fallbackDuration) => {
    if (!user?.id || !coupleSpace?.id) return
    setIsVoiceRecorderOpen(false)

    try {
      const audioFile =
        data?.file ||
        (data instanceof Blob
          ? new File([data], `voice_note_${Date.now()}.webm`, { type: (data.type || 'audio/webm').split(';')[0] })
          : null)
      const duration = data?.duration ?? fallbackDuration ?? 0
      if (!audioFile) return

      let mediaUrl = null

      try {
        const uploadRes = await uploadCoupleMedia({
          coupleSpaceId: coupleSpace.id,
          file: audioFile,
          category: 'media',
        })
        mediaUrl = uploadRes.signedUrl || uploadRes.path
      } catch (err) {
        mediaUrl = URL.createObjectURL(audioFile)
      }

      const metadata = {
        duration: audioDuration,
        is_watch_reaction: true,
        reactions: {},
      }

      let createdMsgId = String(Date.now())
      try {
        const { data: dbMsg } = await supabase
          .from('messages')
          .insert({
            couple_space_id: coupleSpace.id,
            sender_id: user.id,
            content: '',
            message_type: 'audio',
            media_url: mediaUrl,
            media_metadata: metadata,
          })
          .select()
          .single()
        if (dbMsg?.id) createdMsgId = dbMsg.id
      } catch (e) {
        console.warn('Database save voice note error:', e)
      }

      const newMsg = {
        id: createdMsgId,
        senderId: user.id,
        senderName: profile?.display_name || 'You',
        text: '',
        message_type: 'audio',
        media_url: mediaUrl,
        media_metadata: metadata,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setRoomMessages((prev) => [...prev, newMsg])
      syncEngineRef.current?.channel?.send({
        type: 'broadcast',
        event: 'watch-chat',
        payload: newMsg,
      })

      confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } })
      setTimeout(scrollToBottom, 60)
    } catch (err) {
      console.error('Voice note send error:', err)
    }
  }

  // Send GIF from Picker
  const handleSelectGif = async ({ url, title }) => {
    setIsGifPickerOpen(false)
    if (!user?.id || !coupleSpace?.id) return

    const metadata = { is_watch_reaction: true, reactions: {} }
    let createdMsgId = String(Date.now())

    try {
      const { data: dbMsg } = await supabase
        .from('messages')
        .insert({
          couple_space_id: coupleSpace.id,
          sender_id: user.id,
          content: title || 'Shared GIF',
          message_type: 'gif',
          media_url: url,
          media_metadata: metadata,
        })
        .select()
        .single()
      if (dbMsg?.id) createdMsgId = dbMsg.id
    } catch (e) {
      console.warn('Database GIF save warning:', e)
    }

    const newMsg = {
      id: createdMsgId,
      senderId: user.id,
      senderName: profile?.display_name || 'You',
      text: title || '',
      message_type: 'gif',
      media_url: url,
      media_metadata: metadata,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setRoomMessages((prev) => [...prev, newMsg])
    syncEngineRef.current?.channel?.send({
      type: 'broadcast',
      event: 'watch-chat',
      payload: newMsg,
    })

    confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } })
    setTimeout(scrollToBottom, 60)
  }

  // ===================================================================
  // WHATSAPP-STYLE REACTIONS ON MESSAGES
  // ===================================================================
  const handleToggleReaction = (messageId, emoji) => {
    if (!user?.id) return
    setActiveReactionPickerId(null)

    setRoomMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg

        const reactions = toggleMessageReaction(msg.media_metadata?.reactions, emoji, user.id)
        const updatedMetadata = { ...(msg.media_metadata || {}), reactions }

        // Sync to Supabase if valid UUID
        if (typeof msg.id === 'string' && msg.id.length > 20) {
          supabase
            .from('messages')
            .update({ media_metadata: updatedMetadata })
            .eq('id', msg.id)
            .then(() => {})
        }

        // Broadcast reaction to partner
        syncEngineRef.current?.channel?.send({
          type: 'broadcast',
          event: 'watch-reaction',
          payload: { messageId, reactions },
        })

        return { ...msg, media_metadata: updatedMetadata }
      })
    )

    confetti({ particleCount: 15, spread: 40, origin: { y: 0.6 } })
  }

  // Play/Pause voice note audio
  const handleTogglePlayAudio = (id, url) => {
    if (playingAudioId === id) {
      companionAudioRef.current?.pause()
      setPlayingAudioId(null)
    } else {
      if (companionAudioRef.current) {
        companionAudioRef.current.src = url
        companionAudioRef.current.play()
        setPlayingAudioId(id)
      }
    }
  }

  // Seek video when clicking screenshot timestamp in chat
  const handleJumpToScene = (timestampStr) => {
    if (!videoRef.current || !timestampStr) return
    const parts = timestampStr.split(':')
    if (parts.length === 2) {
      const targetSec = parseInt(parts[0], 10) * 60 + parseFloat(parts[1])
      videoRef.current.currentTime = targetSec
      setCurrentTime(targetSec)
      syncEngineRef.current?.broadcastAction('seek')
      confetti({ particleCount: 15, spread: 40, origin: { y: 0.4 } })
    }
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 pb-20 space-y-4 animate-fade-in">
      {/* Hidden file input for custom attachments */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Hidden audio element for companion chat voice note playback */}
      <audio
        ref={companionAudioRef}
        onEnded={() => setPlayingAudioId(null)}
        onTimeUpdate={() => {
          if (companionAudioRef.current) {
            const cur = companionAudioRef.current.currentTime
            const dur = companionAudioRef.current.duration || 1
            setAudioProgress((cur / dur) * 100)
          }
        }}
        className="hidden"
      />

      {/* Header Banner with In-Movie Call Controls */}
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
                className="px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition"
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
                className={`px-3 py-1.5 rounded-full ${currentTheme.buttonGrad} text-white text-xs font-semibold flex items-center gap-1.5 shadow-md ${currentTheme.shadow} active:scale-95 transition`}
                title="Start Video Call while watching movie"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video Call</span>
              </button>
            </>
          )}

          {(callState === 'outgoing' || callState === 'incoming') && (
            <div className="px-3 py-1.5 rounded-full bg-amber-500/90 text-white text-xs font-semibold flex items-center gap-1.5 animate-pulse">
              <Phone className="w-3.5 h-3.5 animate-bounce" />
              <span>Connecting call...</span>
            </div>
          )}

          {callState === 'connected' && (
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-emerald-500/50 px-3 py-1 rounded-full text-white text-xs shadow-md">
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
      <div className={`relative rounded-3xl overflow-hidden bg-black shadow-2xl border ${currentTheme.borderLight} group`}>
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

        {/* Shutter flash animation when capturing screenshot */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-30 animate-fade-out pointer-events-none" />
        )}

        {/* IN-MOVIE FLOATING PARTNER VIDEO OVERLAY (When Call is Active) */}
        {callState === 'connected' && isCallDocked && (
          <div className={`absolute top-3 right-3 z-20 w-32 sm:w-44 aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden border-2 ${currentTheme.border} shadow-2xl bg-black/90 backdrop-blur-md animate-scale-up`}>
            <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" aria-hidden="true" />
            {isVideoCall ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
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

            {/* Quick overlay close/undock button */}
            <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-bold text-white shadow-sm">
                {partner?.display_name || 'Partner'}
              </span>
            </div>
          </div>
        )}

        {videoError && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center text-white">
            <Info className={`w-8 h-8 ${currentTheme.activeText} mb-2`} />
            <p className="text-sm font-semibold">{videoError}</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Please check that the URL points to a direct video file (.mp4, .webm) and allows CORS playback.
            </p>
            <button
              onClick={() => {
                setVideoUrl(DEFAULT_VIDEO_URL)
                setVideoError(null)
              }}
              className={`mt-4 px-4 py-1.5 rounded-full ${currentTheme.buttonGrad} text-xs font-semibold text-white transition`}
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
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/80 transition"
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
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/80 transition"
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
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/80 transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* 📸 CAPTURE MOMENT / SCREENSHOT BUTTON ON VIDEO PLAYER */}
              <button
                onClick={handleCaptureScreenshot}
                disabled={isCapturing}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full ${currentTheme.buttonGrad} text-white text-xs font-semibold flex items-center gap-1.5 shadow-md ${currentTheme.shadow} active:scale-95 transition`}
                title="Take a screenshot of this movie scene to share with your partner"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Capture Moment</span>
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

      {/* Partner Local Movie Announcement Card */}
      {partnerLocalMovieNotice && (
        <div className={`glass rounded-3xl p-3.5 border ${currentTheme.border} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in ${currentTheme.softBg}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={`w-9 h-9 rounded-2xl ${currentTheme.buttonGrad} text-white flex items-center justify-center shrink-0 shadow-md`}>
              <Clapperboard className="w-5 h-5" />
            </div>
            <div className="truncate">
              <span className={`text-xs font-bold ${currentTheme.activeText} block truncate`}>
                {partnerLocalMovieNotice.senderName} loaded a local movie:
              </span>
              <span className="text-xs text-slate-800 dark:text-slate-100 font-semibold block truncate">
                🎬 {partnerLocalMovieNotice.fileName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => localVideoInputRef.current?.click()}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl ${currentTheme.buttonGrad} text-white text-xs font-semibold shadow-md active:scale-95 transition`}
            >
              Select My Copy to Sync
            </button>
            <button
              type="button"
              onClick={() => setPartnerLocalMovieNotice(null)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Stream Movie from Local Device Card */}
      <div className={`glass rounded-3xl p-4 border ${currentTheme.border} space-y-3`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Film className={`w-3.5 h-3.5 ${currentTheme.activeText}`} /> Play & Stream Movie from Local Device
          </h3>
          {localMovieFile && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Playing Local File
            </span>
          )}
        </div>

        {/* Buttons: Pick File from Device & Stream Screen */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => localVideoInputRef.current?.click()}
            className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-2xl ${currentTheme.buttonGrad} hover:opacity-95 text-white text-xs font-bold shadow-md ${currentTheme.shadow} active:scale-95 transition flex items-center justify-center gap-2`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>{localMovieFile ? 'Change Local Movie File' : 'Choose Movie from Device'}</span>
          </button>

          {typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia && (
            <button
              type="button"
              onClick={isScreenSharing ? stopScreenShare : handleStartLiveStream}
              className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-2xl text-xs font-bold shadow-md active:scale-95 transition flex items-center justify-center gap-2 ${
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
          <div className={`p-3 rounded-2xl ${currentTheme.softBg} border ${currentTheme.borderLight} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in`}>
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
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border ${currentTheme.border} ${currentTheme.activeText} text-xs font-semibold ${currentTheme.softHover} transition flex items-center justify-center gap-1.5 disabled:opacity-50`}
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
      <div className={`glass rounded-3xl p-4 border ${currentTheme.border} space-y-3`}>
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <LinkIcon className={`w-3.5 h-3.5 ${currentTheme.activeText}`} /> Watch via Google Drive or Web Link (Synced for Both)
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Upload your movie to Google Drive, set link sharing to <strong>"Anyone with the link can view"</strong>, and paste the link below. Play, pause, seek, and mute will synchronize live for both of you!
          </p>
        </div>

        <form onSubmit={handleLoadUrl} className="flex gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Paste Google Drive link (https://drive.google.com/...) or direct video URL"
            className={`flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${currentTheme.ring}`}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-xl ${currentTheme.buttonGrad} text-white text-xs font-semibold shadow-md ${currentTheme.shadow} active:scale-95 transition whitespace-nowrap`}
          >
            Load for Both
          </button>
        </form>

        {/* Uploaded Vault Videos Quick-Select */}
        {vaultVideos.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
              Or pick from videos shared in your chat vault:
            </span>
            <div className="flex flex-wrap gap-2">
              {vaultVideos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setVideoUrl(v.media_url)
                    setLocalMovieFile(null)
                  }}
                  className={`px-2.5 py-1 rounded-lg ${currentTheme.softBg} ${currentTheme.activeText} ${currentTheme.softHover} text-xs font-medium truncate max-w-[200px]`}
                >
                  🎬 {v.content || 'Uploaded Video'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================
          COMPANION CHAT: SCREENSHOTS, VOICE NOTES, GIFS & WHATSAPP REACTIONS
         =================================================================== */}
      <div className={`glass rounded-3xl p-4 border ${currentTheme.border} space-y-3`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Heart className={`w-3.5 h-3.5 ${currentTheme.activeText} fill-current`} /> Movie Night Chat & Reactions
          </h3>
          <span className="text-[11px] text-slate-400">
            Watching with <span className={`font-semibold ${currentTheme.activeText}`}>{partner?.display_name || 'Partner'}</span>
          </span>
        </div>

        {/* Messages Stream */}
        <div className="h-64 sm:h-72 overflow-y-auto space-y-3 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 text-xs">
          {roomMessages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Camera className={`w-8 h-8 ${currentTheme.activeText} mx-auto animate-pulse opacity-70`} />
              <p className="font-medium text-slate-500 dark:text-slate-400">No reactions yet!</p>
              <p className="text-[11px]">
                Click 📸 <strong>Capture Moment</strong> to snap screenshots of your favorite scenes, send voice notes, and react!
              </p>
            </div>
          ) : (
            roomMessages.map((msg) => {
              const isOwn = msg.senderId === user?.id
              const reactions = msg.media_metadata?.reactions || {}

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group relative`}
                >
                  <div className="flex items-baseline gap-1 text-[10px] text-slate-400 px-1 mb-0.5">
                    <span className={`font-semibold ${currentTheme.activeText}`}>
                      {isOwn ? 'You' : msg.senderName}
                    </span>
                    <span>•</span>
                    <span>{msg.time}</span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-md rounded-2xl p-2.5 shadow-sm relative transition ${
                      isOwn
                        ? `${currentTheme.bubbleOwn} text-white rounded-tr-none`
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                    }`}
                  >
                    {/* Render Image or Screenshot Attachment */}
                    {msg.message_type === 'image' && msg.media_url && (
                      <div className="mb-1.5 rounded-xl overflow-hidden relative group/img">
                        <img
                          src={msg.media_url}
                          alt={msg.text || 'Screenshot'}
                          loading="lazy"
                          className="max-h-48 w-full object-cover rounded-xl"
                        />
                        {msg.media_metadata?.timestamp && (
                          <button
                            type="button"
                            onClick={() => handleJumpToScene(msg.media_metadata.timestamp)}
                            className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-mono flex items-center gap-1 hover:opacity-90 transition"
                            title="Click to jump to this movie scene!"
                          >
                            <Camera className={`w-3 h-3 ${currentTheme.activeText}`} />
                            <span>Scene at {msg.media_metadata.timestamp} (Jump)</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Render Voice Note */}
                    {msg.message_type === 'audio' && msg.media_url && (
                      <div className="flex items-center gap-2 py-1 min-w-[170px]">
                        <button
                          type="button"
                          onClick={() => handleTogglePlayAudio(msg.id, msg.media_url)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 ${
                            isOwn ? `bg-white ${currentTheme.activeText}` : `${currentTheme.buttonGrad} text-white`
                          }`}
                        >
                          {playingAudioId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${isOwn ? 'bg-white' : currentTheme.buttonGrad} transition-all`}
                              style={{ width: `${playingAudioId === msg.id ? audioProgress : 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] mt-0.5 opacity-80">
                            <span>Voice Note</span>
                            <span>
                              {msg.media_metadata?.duration
                                ? `${Math.floor(msg.media_metadata.duration / 60)}:${
                                    msg.media_metadata.duration % 60 < 10 ? '0' : ''
                                  }${msg.media_metadata.duration % 60}`
                                : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Render GIF */}
                    {msg.message_type === 'gif' && msg.media_url && (
                      <div className="mb-1 rounded-xl overflow-hidden">
                        <img
                          src={msg.media_url}
                          alt={msg.text || 'GIF'}
                          loading="lazy"
                          className="max-h-44 w-auto rounded-xl object-contain"
                        />
                      </div>
                    )}

                    {/* Text Message Content */}
                    {msg.text && (
                      <p className="whitespace-pre-wrap leading-relaxed select-text font-medium">
                        {msg.text}
                      </p>
                    )}

                    {/* WhatsApp-Style Reactions Badge Display */}
                    {Object.keys(reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-black/10 dark:border-white/10">
                        {Object.entries(reactions).map(([emoji, userIds]) => {
                          const hasReacted = userIds.includes(user?.id)
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] shadow-sm transition active:scale-95 ${
                                hasReacted
                                  ? `${currentTheme.badge} font-bold border ${currentTheme.border}`
                                  : 'bg-white/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px]">{userIds.length}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Hover Reaction Trigger Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveReactionPickerId(
                          activeReactionPickerId === msg.id ? null : msg.id
                        )
                      }
                      className={`absolute -top-3 ${
                        isOwn ? '-left-3' : '-right-3'
                      } p-1 rounded-full bg-white dark:bg-slate-800 border ${currentTheme.borderLight} shadow-md text-slate-400 hover:${currentTheme.activeText} opacity-80 sm:opacity-0 group-hover:opacity-100 transition`}
                      title="React to message"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    {/* WhatsApp-Style Emoji Picker Bar Popup */}
                    {activeReactionPickerId === msg.id && (
                      <div
                        className={`absolute bottom-full mb-1 z-30 ${
                          isOwn ? 'right-0' : 'left-0'
                        } flex items-center gap-1 p-1 bg-white dark:bg-slate-800 border ${currentTheme.border} rounded-full shadow-2xl animate-scale-up`}
                      >
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className={`p-1 rounded-full ${currentTheme.softHover} text-base hover:scale-125 transition-transform`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={chatMessagesEndRef} />
        </div>

        {/* Attachment Preview Card (Screenshot or selected image) */}
        {pendingAttachment && (
          <div className={`p-2.5 rounded-2xl ${currentTheme.softBg} border ${currentTheme.border} flex items-center justify-between gap-3 animate-fade-in`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              {pendingAttachment.previewUrl ? (
                <img
                  src={pendingAttachment.previewUrl}
                  alt="Attachment preview"
                  className={`w-12 h-12 object-cover rounded-xl border ${currentTheme.border} shrink-0`}
                />
              ) : (
                <div className={`w-10 h-10 rounded-xl ${currentTheme.softBg} flex items-center justify-center shrink-0`}>
                  <Camera className={`w-5 h-5 ${currentTheme.activeText}`} />
                </div>
              )}
              <div className="truncate">
                <span className={`text-xs font-bold ${currentTheme.activeText} block truncate`}>
                  {pendingAttachment.type === 'screenshot' ? '📸 Movie Screenshot' : '🖼️ Image Attachment'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                  {pendingAttachment.name || `At ${pendingAttachment.timestamp}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              className="p-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Inline Voice Recorder Overlay */}
        {isVoiceRecorderOpen && (
          <div className="animate-fade-in">
            <VoiceRecorder
              onSendAudio={handleSendAudio}
              onCancel={() => setIsVoiceRecorderOpen(false)}
            />
          </div>
        )}

        {/* Composer Form with Quick Attachment Actions */}
        {!isVoiceRecorderOpen && (
          <form onSubmit={handleSendRoomChat} className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              {/* Attachment / Action buttons */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Quick Screenshot Button */}
                <button
                  type="button"
                  onClick={handleCaptureScreenshot}
                  disabled={isCapturing}
                  className={`p-1.5 sm:p-2 rounded-xl border ${currentTheme.border} bg-white dark:bg-slate-800 ${currentTheme.activeText} ${currentTheme.softHover} transition`}
                  title="Capture screenshot from movie"
                >
                  <Camera className="w-4 h-4" />
                </button>

                {/* Attach File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:${currentTheme.activeText} hover:bg-slate-50 dark:hover:bg-slate-700 transition`}
                  title="Attach an image"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Voice Note Button */}
                <button
                  type="button"
                  onClick={() => setIsVoiceRecorderOpen(true)}
                  className={`p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:${currentTheme.activeText} hover:bg-slate-50 dark:hover:bg-slate-700 transition`}
                  title="Record a voice note"
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* GIF Button */}
                <button
                  type="button"
                  onClick={() => setIsGifPickerOpen(true)}
                  className={`px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:${currentTheme.activeText} hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1`}
                  title="Send a GIF or sticker"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${currentTheme.activeText}`} />
                  <span>GIF</span>
                </button>
              </div>

              {/* Text Input & Send */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder={
                    pendingAttachment
                      ? 'Add a caption for this screenshot...'
                      : 'Send note, comment or reaction...'
                  }
                  className={`flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${currentTheme.ring}`}
                />

                <button
                  type="submit"
                  disabled={isSending || (!chatText.trim() && !pendingAttachment)}
                  className={`p-2 rounded-xl ${currentTheme.buttonGrad} text-white hover:opacity-95 disabled:opacity-40 transition shadow-md ${currentTheme.shadow} active:scale-95 shrink-0`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* GIF Picker Modal */}
      <GifPicker
        isOpen={isGifPickerOpen}
        onClose={() => setIsGifPickerOpen(false)}
        onSelectMedia={handleSelectGif}
      />

      {/* Educational Note about DRM & Streaming Services */}
      <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-700 dark:text-slate-300">Supported Media Notice:</strong>{' '}
          This synchronized player supports direct HTTPS MP4, WebM, and user-uploaded videos from your private storage. You can snap screenshots, send voice notes, attach photos, and talk live with your partner while watching!
        </p>
      </div>
    </div>
  )
}
