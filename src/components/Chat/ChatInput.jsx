import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  X,
  Heart,
  CornerDownRight,
  Sparkles,
  Loader2,
  Film,
  Image as ImageIcon,
} from 'lucide-react'
import { VoiceRecorder } from './VoiceRecorder'
import { GifPicker } from './GifPicker'
import confetti from 'canvas-confetti'

export const ChatInput = ({
  onSendMessage,
  onSendMedia,
  replyingTo,
  onCancelReply,
  editingMessage,
  onSaveEdit,
  onCancelEdit,
  isUploading,
  uploadProgress,
}) => {
  const [text, setText] = useState('')
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  // Populate text if editing
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || '')
      textareaRef.current?.focus()
    }
  }, [editingMessage])

  // Focus input when replying
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus()
    }
  }, [replyingTo])

  // Auto-resize textarea
  const handleTextChange = (e) => {
    setText(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed && !editingMessage) return

    if (editingMessage) {
      onSaveEdit?.(editingMessage.id, trimmed)
      setText('')
      onCancelEdit?.()
    } else {
      onSendMessage?.(trimmed)
      setText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    onSendMedia?.(file)
    // Clear input so same file can be reselected if needed
    e.target.value = ''
  }

  const handleSendHeart = () => {
    confetti({
      particleCount: 30,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#f43f5e', '#fb7185', '#fda4af'],
    })
    onSendMessage?.('💖')
  }

  return (
    <div className="w-full glass border-t border-rose-200/60 dark:border-rose-900/40 p-2 sm:p-3 relative z-20">
      {/* Uploading progress bar banner */}
      {isUploading && (
        <div className="mb-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading your media securely to private storage...</span>
          </div>
          {uploadProgress > 0 && <span className="font-semibold">{uploadProgress}%</span>}
        </div>
      )}

      {/* Replying banner */}
      {replyingTo && (
        <div className="mb-2 p-2 rounded-xl bg-rose-100/70 dark:bg-rose-950/40 border-l-4 border-rose-500 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2 truncate">
            <CornerDownRight className="w-4 h-4 text-rose-500 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-rose-700 dark:text-rose-300 block text-[10px]">
                Replying to message:
              </span>
              <span className="text-slate-600 dark:text-slate-300 truncate block">
                {replyingTo.content || replyingTo.message_type}
              </span>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing banner */}
      {editingMessage && (
        <div className="mb-2 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500 text-xs flex items-center justify-between animate-fade-in">
          <span className="text-blue-700 dark:text-blue-300 font-medium">
            Editing your message
          </span>
          <button
            onClick={onCancelEdit}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Voice Recorder Mode */}
      {isVoiceActive ? (
        <VoiceRecorder
          onSendAudio={(audioData) => {
            onSendMedia?.(audioData.file, {
              duration: audioData.duration,
              type: 'audio',
            })
            setIsVoiceActive(false)
          }}
          onCancel={() => setIsVoiceActive(false)}
        />
      ) : (
        /* Regular Input Controls */
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* File attachment picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-full text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
            title="Attach photo or video"
            aria-label="Attach photo or video"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Stickers & GIF picker toggle */}
          <button
            type="button"
            onClick={() => setIsGifPickerOpen(true)}
            className="p-2 sm:p-2.5 rounded-full text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
            title="Romantic Stickers & GIFs"
            aria-label="Open stickers and GIFs"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Text input area */}
          <div className="flex-1 min-w-0 bg-white/80 dark:bg-midnight-800/80 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 focus-within:ring-2 focus-within:ring-rose-400 px-3 py-2 transition">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Write a sweet message..."
              className="w-full bg-transparent resize-none outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 max-h-28 overflow-y-auto"
            />
          </div>

          {/* Voice recorder trigger */}
          {!text.trim() && !editingMessage ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsVoiceActive(true)}
                className="p-2 sm:p-2.5 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 active:scale-95 transition"
                title="Record voice message"
                aria-label="Record voice note"
              >
                <Mic className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleSendHeart}
                className="p-2 sm:p-2.5 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 active:scale-125 transition"
                title="Send love burst"
                aria-label="Send love burst"
              >
                <Heart className="w-5 h-5 fill-current text-rose-500" />
              </button>
            </div>
          ) : (
            /* Send Button */
            <button
              type="button"
              onClick={handleSend}
              disabled={isUploading}
              className="p-2.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-95 text-white shadow-md shadow-rose-500/30 active:scale-95 transition disabled:opacity-50"
              title="Send message"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          )}
        </div>
      )}

      {/* GIF & Sticker Modal */}
      <GifPicker
        isOpen={isGifPickerOpen}
        onClose={() => setIsGifPickerOpen(false)}
        onSelectMedia={(media) => {
          if (media.type === 'sticker') {
            onSendMessage?.(media.content, { message_type: 'sticker', metadata: media.metadata })
          } else if (media.type === 'gif') {
            onSendMessage?.('', {
              message_type: 'gif',
              media_url: media.mediaUrl,
              metadata: media.metadata,
            })
          }
        }}
      />
    </div>
  )
}
