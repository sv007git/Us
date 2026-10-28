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
  EyeOff,
  Undo2,
  Smile,
} from 'lucide-react'
import { format } from 'date-fns'
import { useTheme } from '../../context/ThemeContext'
import { REACTION_EMOJIS } from '../../lib/reactionHelper'

export const MessageBubble = ({
  message,
  isOwn,
  partnerName,
  repliedMessage,
  onReply,
  onEdit,
  onDelete,
  onUnsend,
  onDeleteForMe,
  onOpenLightbox,
  onToggleReaction,
  currentUserId,
}) => {
  const { currentTheme } = useTheme()
  const [showMenu, setShowMenu] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
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
  const isRead = Boolean(
    message.is_read === true ||
    message.read_at != null ||
    media_metadata?.is_read === true ||
    (Array.isArray(media_metadata?.read_by) &&
      media_metadata.read_by.some((uid) => uid !== message.sender_id))
  )
  const reactions = media_metadata?.reactions || {}
  const reactionEntries = Object.entries(reactions).filter(
    ([_, users]) => Array.isArray(users) && users.length > 0
  )

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
        <div className="flex items-end gap-1.5 relative">
          {/* Reaction Picker for Sticker */}
          {showReactionPicker && (
            <div
              className={`absolute bottom-full mb-1 z-30 ${
                isOwn ? 'right-0' : 'left-0'
              } flex items-center gap-1 p-1 bg-white/95 dark:bg-midnight-900/95 backdrop-blur-md border ${
                currentTheme.border
              } rounded-full shadow-2xl animate-scale-up`}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onToggleReaction?.(id, emoji)
                    setShowReactionPicker(false)
                  }}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-lg hover:scale-125 transition-transform"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {isOwn && (
            <div className="flex items-center gap-1 opacity-75 sm:opacity-0 group-hover:opacity-100 transition mb-1">
              <button
                type="button"
                onClick={() => {
                  setShowReactionPicker((prev) => !prev)
                  setShowMenu(false)
                }}
                className={`p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:${currentTheme.activeText} active:scale-95 transition`}
                title="React to sticker"
                aria-label="React to sticker"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onReply?.(message)}
                className={`p-1.5 rounded-full ${currentTheme.activeText} hover:bg-white/80 dark:hover:bg-midnight-800 transition`}
                title="Reply"
                aria-label="Reply to sticker"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="text-5xl sm:text-6xl p-1 select-none animate-bounce-short hover:scale-110 transition-transform">
            {content}
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mb-1">
            <span>{formattedTime}</span>
            {isOwn && (
              isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-sky-400 fill-current" title="Read" />
              ) : (
                <Check className="w-3.5 h-3.5 text-slate-400" title="Sent" />
              )
            )}
          </span>

          {!isOwn && (
            <div className="flex items-center gap-1 opacity-75 sm:opacity-0 group-hover:opacity-100 transition mb-1">
              <button
                type="button"
                onClick={() => {
                  setShowReactionPicker((prev) => !prev)
                  setShowMenu(false)
                }}
                className={`p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:${currentTheme.activeText} active:scale-95 transition`}
                title="React to sticker"
                aria-label="React to sticker"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onReply?.(message)}
                className={`p-1.5 rounded-full ${currentTheme.activeText} hover:bg-white/80 dark:hover:bg-midnight-800 transition`}
                title="Reply"
                aria-label="Reply to sticker"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Reaction badges for sticker */}
        {reactionEntries.length > 0 && (
          <div className={`flex flex-wrap items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {reactionEntries.map(([emoji, userIds]) => {
              const hasReacted = currentUserId && userIds.includes(currentUserId)
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction?.(id, emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs shadow-sm transition active:scale-95 ${
                    hasReacted
                      ? `${currentTheme.badge} font-bold ring-1 ring-white/30`
                      : 'bg-white/90 dark:bg-midnight-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                  title={`${userIds.length} reaction${userIds.length > 1 ? 's' : ''}`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px]">{userIds.length}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-col my-1.5 ${isOwn ? 'items-end' : 'items-start'} group relative`}>
      {/* Sender Name for Received Message */}
      {!isOwn && (
        <span className={`text-[11px] font-semibold ${currentTheme.activeText} mb-0.5 ml-2`}>
          {partnerName || 'My Love'}
        </span>
      )}

      <div className="flex items-center gap-1.5 max-w-full">
        {/* Left side actions for own messages */}
        {isOwn && (
          <div className="flex items-center gap-0.5 sm:gap-1 opacity-75 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowReactionPicker((prev) => !prev)
                setShowMenu(false)
              }}
              className="p-1 sm:p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-rose-500 active:scale-95 transition"
              title="React to message"
              aria-label="React with emoji"
            >
              <Smile className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onReply?.(message)}
              className="p-1 sm:p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95 transition"
              title="Reply"
              aria-label="Reply to message"
            >
              <Reply className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMenu((prev) => !prev)
                setShowReactionPicker(false)
              }}
              className="p-1 sm:p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95 transition"
              title="Message options"
              aria-label="Message options"
            >
              <MoreVertical className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        )}

        <div className="relative max-w-[85%] sm:max-w-[70%] w-fit">
          {/* Floating WhatsApp-Style Emoji Picker Bar Popup */}
          {showReactionPicker && (
            <div
              className={`absolute bottom-full mb-1.5 z-30 ${
                isOwn ? 'right-0' : 'left-0'
              } flex items-center gap-1 p-1 bg-white/95 dark:bg-midnight-900/95 backdrop-blur-md border ${
                currentTheme.border
              } rounded-full shadow-2xl animate-scale-up`}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onToggleReaction?.(id, emoji)
                    setShowReactionPicker(false)
                  }}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-midnight-800 text-base sm:text-lg hover:scale-125 transition-transform"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Reply Quote Banner */}
          {repliedMessage && (
            <div
              className={`mb-1 p-2 rounded-xl text-xs border-l-4 flex items-start gap-1.5 backdrop-blur-sm ${
                isOwn
                  ? 'bg-black/15 text-white/95 border-white/70'
                  : `bg-slate-100/80 dark:bg-midnight-800/80 border-slate-400 text-slate-700 dark:text-slate-300`
              }`}
            >
              <CornerDownRight
                className={`w-3.5 h-3.5 mt-0.5 ${isOwn ? 'text-white' : currentTheme.activeText} shrink-0`}
              />
              <div className="truncate">
                <span className="font-semibold block text-[10px] uppercase opacity-80">
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
            className={`rounded-2xl p-2.5 sm:p-3.5 shadow-sm text-sm break-words relative transition-all w-fit max-w-full ${
              isOwn
                ? `bg-gradient-to-r ${currentTheme.primary} text-white rounded-br-sm shadow-sm`
                : `bg-white/95 dark:bg-midnight-900/90 border ${currentTheme.border} text-slate-800 dark:text-slate-100 rounded-bl-sm shadow-sm`
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
                      ? 'bg-white text-slate-800 hover:bg-slate-100 shadow-sm'
                      : `${currentTheme.badge} hover:opacity-90 shadow-sm`
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
                        isOwn ? 'bg-white' : currentTheme.badge.split(' ')[0]
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

            {/* 5. Text Content + Timestamp & Status in a single line layout */}
            {content && message_type !== 'sticker' && (
              <div className="select-text leading-relaxed">
                <div className="flex flex-wrap items-end gap-x-2 gap-y-0.5 min-w-0">
                  <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-w-0">{content}</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] select-none ml-auto shrink-0 leading-none pb-0.5 ${
                      isOwn ? 'text-white/85' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {is_edited && <span className="italic text-[9px] opacity-80">edited</span>}
                    <span>{formattedTime}</span>
                    {isOwn && (
                      isRead ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-200 fill-current" title="Read" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-white/80" title="Sent" />
                      )
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Meta footer for media-only messages without text or audio notes */}
            {(!content || message_type === 'audio') && message_type !== 'sticker' && (
              <div
                className={`flex items-center justify-end space-x-1 text-[10px] mt-1 select-none ${
                  isOwn ? 'text-white/85' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {is_edited && <span className="italic text-[9px] opacity-80">edited</span>}
                <span>{formattedTime}</span>
                {isOwn && (
                  isRead ? (
                    <CheckCheck className="w-3.5 h-3.5 text-sky-200 fill-current" title="Read" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-white/80" title="Sent" />
                  )
                )}
              </div>
            )}
          </div>

          {/* WhatsApp-Style Reaction Badges Row */}
          {reactionEntries.length > 0 && (
            <div
              className={`flex flex-wrap items-center gap-1 mt-1 ${
                isOwn ? 'justify-end' : 'justify-start'
              }`}
            >
              {reactionEntries.map(([emoji, userIds]) => {
                const hasReacted = currentUserId && userIds.includes(currentUserId)
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onToggleReaction?.(id, emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs shadow-sm transition active:scale-95 ${
                      hasReacted
                        ? `${currentTheme.badge} font-bold ring-1 ring-white/30`
                        : 'bg-white/90 dark:bg-midnight-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    title={`${userIds.length} reaction${userIds.length > 1 ? 's' : ''}`}
                  >
                    <span>{emoji}</span>
                    <span className="text-[10px]">{userIds.length}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Message Options Dropdown Menu */}
          {showMenu && (
            <div
              className={`absolute z-30 bottom-full mb-1 py-1 w-36 bg-white dark:bg-midnight-900 border ${
                currentTheme.border
              } rounded-xl shadow-xl text-xs font-medium text-slate-700 dark:text-slate-200 animate-scale-up ${
                isOwn ? 'right-0' : 'left-0'
              }`}
            >
              <button
                onClick={() => {
                  setShowMenu(false)
                  setShowReactionPicker(true)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Smile className={`w-3.5 h-3.5 ${currentTheme.activeText}`} /> React
              </button>

              <button
                onClick={() => {
                  onReply?.(message)
                  setShowMenu(false)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Reply className="w-3.5 h-3.5 text-slate-500" /> Reply
              </button>

              <button
                onClick={handleCopy}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
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
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-500" /> Edit
                </button>
              )}

              {isOwn && (
                <button
                  onClick={() => {
                    if (onUnsend) onUnsend(message.id)
                    else onDelete?.(message.id, 'everyone')
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-1.5 text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                  title="Unsend for everyone"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Unsend
                </button>
              )}

              <button
                onClick={() => {
                  if (onDeleteForMe) onDeleteForMe(message.id)
                  else onDelete?.(message.id, 'me')
                  setShowMenu(false)
                }}
                className="w-full px-3 py-1.5 text-left text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                title="Delete for me only"
              >
                <EyeOff className="w-3.5 h-3.5" /> Delete for me
              </button>
            </div>
          )}
        </div>

        {/* Right side actions for partner messages */}
        {!isOwn && (
          <div className="flex items-center gap-0.5 sm:gap-1 opacity-75 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowReactionPicker((prev) => !prev)
                setShowMenu(false)
              }}
              className="p-1 sm:p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-rose-500 active:scale-95 transition"
              title="React to message"
              aria-label="React with emoji"
            >
              <Smile className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onReply?.(message)}
              className="p-1 sm:p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95 transition"
              title="Reply"
              aria-label="Reply to message"
            >
              <Reply className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMenu((prev) => !prev)
                setShowReactionPicker(false)
              }}
              className="p-1 sm:p-1.5 rounded-full bg-white dark:bg-midnight-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95 transition"
              title="Message options"
              aria-label="Message options"
            >
              <MoreVertical className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
