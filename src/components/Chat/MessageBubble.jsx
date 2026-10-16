import React, { useState, useRef } from 'react'
import {
  Play,
  Pause,
  Download,
  MoreVertical,
  Reply,
  Copy,
  Trash2,
  Edit2,
  Check,
  CheckCheck,
  CornerDownRight,
  Sparkles,
} from 'lucide-react'
import { format } from 'date-fns'

export const MessageBubble = ({
  message,
  isOwn,
  partnerName,
  repliedMessage,
  onReply,
  onEdit,
  onDelete,
  onOpenLightbox,
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const audioRef = useRef(null)

  const {
    id,
    content,
    message_type = 'text',
    media_url,
    media_metadata = {},
    is_edited,
    created_at,
  } = message

  const formattedTime = created_at ? format(new Date(created_at), 'h:mm a') : ''

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (isPlayingAudio) {
      audioRef.current.pause()
      setIsPlayingAudio(false)
    } else {
      audioRef.current.play()
      setIsPlayingAudio(true)
    }
  }

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return
    const cur = audioRef.current.currentTime
    const dur = audioRef.current.duration || media_metadata?.duration || 1
    setAudioProgress((cur / dur) * 100)
  }

  const handleAudioEnded = () => {
    setIsPlayingAudio(false)
    setAudioProgress(0)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || media_url || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
    setShowMenu(false)
  }

  // Large sticker rendering (no background bubble)
  if (message_type === 'sticker') {
    return (
      <div className={`flex flex-col my-1 ${isOwn ? 'items-end' : 'items-start'} group relative`}>
        <div className="flex items-end gap-1.5">
          {isOwn && (
            <button
              type="button"
              onClick={() => onReply?.(message)}
              className="p-1.5 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-midnight-800 opacity-75 sm:opacity-0 group-hover:opacity-100 transition mb-1"
              title="Reply"
              aria-label="Reply to sticker"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="text-5xl sm:text-6xl p-1 select-none animate-bounce-short hover:scale-110 transition-transform">
            {content}
          </div>
          <span className="text-[10px] text-slate-400 mb-1">{formattedTime}</span>
          {!isOwn && (
            <button
              type="button"
              onClick={() => onReply?.(message)}
              className="p-1.5 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-midnight-800 opacity-75 sm:opacity-0 group-hover:opacity-100 transition mb-1"
              title="Reply"
              aria-label="Reply to sticker"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col my-1.5 ${isOwn ? 'items-end' : 'items-start'} group relative`}>
      {/* Sender Name for Received Message in Group Context */}
      {!isOwn && (
        <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 mb-0.5 ml-2">
          {partnerName || 'My Love'}
        </span>
      )}

      <div className="flex items-center gap-1.5 max-w-full">
        {/* Left side actions for own messages */}
        {isOwn && (
          <div className="flex items-center gap-1 opacity-75 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={() => onReply?.(message)}
              className="p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-rose-200/60 dark:border-rose-900/40 shadow-sm text-rose-500 hover:text-rose-600 active:scale-95 transition"
              title="Reply"
              aria-label="Reply to message"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-slate-700 active:scale-95 transition"
              title="Message options"
              aria-label="Message options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {/* Reply Quote Banner */}
        {repliedMessage && (
          <div
            className={`mb-1 p-2 rounded-xl text-xs border-l-4 flex items-start gap-1.5 backdrop-blur-sm ${
              isOwn
                ? 'bg-rose-100/60 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-200'
                : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-400 text-slate-700 dark:text-slate-300'
            }`}
          >
            <CornerDownRight className="w-3.5 h-3.5 mt-0.5 text-rose-500 shrink-0" />
            <div className="truncate">
              <span className="font-semibold block text-[10px] uppercase opacity-75">
                {repliedMessage.sender_id === message.sender_id ? 'You' : partnerName}
              </span>
              <span className="truncate block">
                {repliedMessage.message_type === 'image'
                  ? '📷 Photo'
                  : repliedMessage.message_type === 'video'
                  ? '🎬 Video'
                  : repliedMessage.message_type === 'audio'
                  ? '🎙️ Voice Note'
                  : repliedMessage.content}
              </span>
            </div>
          </div>
        )}

        {/* Message Bubble Body */}
        <div
          className={`rounded-2xl p-3 sm:p-3.5 shadow-sm text-sm break-words relative transition-all ${
            isOwn
              ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white rounded-br-sm shadow-rose-500/10'
              : 'bg-white/95 dark:bg-midnight-900/90 border border-rose-100 dark:border-rose-950/40 text-slate-800 dark:text-slate-100 rounded-bl-sm shadow-slate-200/50 dark:shadow-none'
          }`}
        >
          {/* 1. Image Media */}
          {message_type === 'image' && media_url && (
            <div className="mb-1 rounded-xl overflow-hidden cursor-pointer group/img">
              <img
                src={media_url}
                alt={content || 'Shared photo'}
                onClick={() =>
                  onOpenLightbox({
                    url: media_url,
                    type: 'image',
                    name: content || 'Shared Photo',
                    size: media_metadata?.size,
                  })
                }
                loading="lazy"
                className="max-h-72 w-auto max-w-full rounded-xl object-cover hover:opacity-95 transition"
              />
            </div>
          )}

          {/* 2. Video Media */}
          {message_type === 'video' && media_url && (
            <div className="mb-1 rounded-xl overflow-hidden bg-black/20">
              <video
                src={media_url}
                controls
                playsInline
                preload="metadata"
                className="max-h-72 w-auto max-w-full rounded-xl"
              />
            </div>
          )}

          {/* 3. Audio Voice Note */}
          {message_type === 'audio' && media_url && (
            <div className="flex items-center gap-2.5 py-1 min-w-[200px]">
              <button
                type="button"
                onClick={toggleAudio}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition shrink-0 ${
                  isOwn
                    ? 'bg-white text-rose-500 hover:bg-rose-50'
                    : 'bg-rose-500 text-white hover:bg-rose-600'
                }`}
              >
                {isPlayingAudio ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <div className="flex-1 flex flex-col justify-center">
                <div
                  className={`w-full h-1.5 rounded-full overflow-hidden ${
                    isOwn ? 'bg-white/30' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`h-full transition-all duration-100 ${
                      isOwn ? 'bg-white' : 'bg-rose-500'
                    }`}
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] mt-1 opacity-80">
                  <span>Voice Note</span>
                  <span>
                    {media_metadata?.duration
                      ? `${Math.floor(media_metadata.duration / 60)}:${
                          media_metadata.duration % 60 < 10 ? '0' : ''
                        }${media_metadata.duration % 60}`
                      : ''}
                  </span>
                </div>
              </div>

              <audio
                ref={audioRef}
                src={media_url}
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={handleAudioEnded}
                className="hidden"
              />
            </div>
          )}

          {/* 4. GIF */}
          {message_type === 'gif' && media_url && (
            <div className="mb-1 rounded-xl overflow-hidden cursor-pointer">
              <img
                src={media_url}
                alt={content || 'Shared GIF'}
                onClick={() =>
                  onOpenLightbox({
                    url: media_url,
                    type: 'image',
                    name: content || 'Shared GIF',
                  })
                }
                loading="lazy"
                className="max-h-60 w-auto max-w-full rounded-xl object-contain"
              />
            </div>
          )}

          {/* 5. Text Content */}
          {content && message_type !== 'sticker' && (
            <p className="whitespace-pre-wrap leading-relaxed select-text">{content}</p>
          )}

          {/* Meta footer: Timestamp + Edited + Status */}
          <div
            className={`flex items-center justify-end space-x-1 text-[10px] mt-1 select-none ${
              isOwn ? 'text-rose-100/80' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {is_edited && <span className="italic">edited</span>}
            <span>{formattedTime}</span>
            {isOwn && <CheckCheck className="w-3.5 h-3.5 text-rose-100" />}
          </div>
        </div>

        {/* Message Options Dropdown Menu */}
        {showMenu && (
          <div
            className={`absolute z-30 bottom-full mb-1 py-1 w-32 bg-white dark:bg-midnight-900 border border-rose-200 dark:border-rose-900/40 rounded-xl shadow-xl text-xs font-medium text-slate-700 dark:text-slate-200 animate-scale-up ${
              isOwn ? 'right-0' : 'left-0'
            }`}
          >
            <button
              onClick={() => {
                onReply?.(message)
                setShowMenu(false)
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Reply className="w-3.5 h-3.5 text-rose-500" /> Reply
            </button>

            <button
              onClick={handleCopy}
              className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              {copied ? 'Copied!' : 'Copy'}
            </button>

            {isOwn && message_type === 'text' && (
              <button
                onClick={() => {
                  onEdit?.(message)
                  setShowMenu(false)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-500" /> Edit
              </button>
            )}

            {isOwn && (
              <button
                onClick={() => {
                  onDelete?.(message.id)
                  setShowMenu(false)
                }}
                className="w-full px-3 py-1.5 text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right side actions for partner messages */}
      {!isOwn && (
        <div className="flex items-center gap-1 opacity-75 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={() => onReply?.(message)}
            className="p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-rose-200/60 dark:border-rose-900/40 shadow-sm text-rose-500 hover:text-rose-600 active:scale-95 transition"
            title="Reply"
            aria-label="Reply to message"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-slate-700 active:scale-95 transition"
            title="Message options"
            aria-label="Message options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  </div>
  )
}
