import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Heart, Sparkles, AlertCircle, ArrowDown } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useCouple } from '../../context/CoupleContext'
import { uploadCoupleMedia, getSignedMediaUrl } from '../../lib/storageHelper'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { MediaLightbox } from './MediaLightbox'
import { format, isToday, isYesterday } from 'date-fns'

export const ChatView = () => {
  const { user } = useAuth()
  const { coupleSpace, partner } = useCouple()

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [activeLightboxMedia, setActiveLightboxMedia] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showScrollBottom, setShowScrollBottom] = useState(false)

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  // Fetch initial message history
  const fetchMessages = useCallback(async () => {
    if (!supabase || !coupleSpace?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('couple_space_id', coupleSpace.id)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error

      // Batch resolve signed URLs for private storage media
      const resolved = await Promise.all(
        (data || []).map(async (msg) => {
          if (msg.media_url && !msg.media_url.startsWith('http')) {
            const signed = await getSignedMediaUrl(msg.media_url, 86400)
            return { ...msg, media_url: signed || msg.media_url }
          }
          return msg
        })
      )

      setMessages(resolved)
    } catch (err) {
      console.error('Error loading chat messages:', err)
      setError('Could not load chat messages.')
    } finally {
      setLoading(false)
      setTimeout(() => scrollToBottom(false), 100)
    }
  }, [coupleSpace?.id])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Realtime subscription for incoming/edited/deleted messages
  useEffect(() => {
    if (!supabase || !coupleSpace?.id) return

    const channel = supabase
      .channel(`chat_messages_${coupleSpace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `couple_space_id=eq.${coupleSpace.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new
            // Resolve signed URL if needed
            if (newMsg.media_url && !newMsg.media_url.startsWith('http')) {
              newMsg.media_url = (await getSignedMediaUrl(newMsg.media_url, 86400)) || newMsg.media_url
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            setTimeout(() => scrollToBottom(true), 100)
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setMessages((prev) => prev.filter((m) => m.id !== deletedId))
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime chat channel status:', status)
      })

    return () => {
      channel.unsubscribe()
    }
  }, [coupleSpace?.id])

  // Check scroll position to display "Scroll to bottom" button
  const handleScroll = () => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 300
    setShowScrollBottom(isFarFromBottom)
  }

  // Send a text message or custom payload
  const handleSendMessage = async (content, customOptions = {}) => {
    if (!supabase || !coupleSpace || !user) return

    const newRecord = {
      couple_space_id: coupleSpace.id,
      sender_id: user.id,
      content: content || null,
      message_type: customOptions.message_type || 'text',
      media_url: customOptions.media_url || null,
      media_metadata: customOptions.metadata || {},
      reply_to_id: replyingTo ? replyingTo.id : null,
    }

    try {
      const { data, error } = await supabase.from('messages').insert(newRecord).select().single()
      if (error) throw error

      setReplyingTo(null)
      setTimeout(() => scrollToBottom(true), 80)
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message: ' + err.message)
    }
  }

  // Upload and send photo, video, or audio
  const handleSendMedia = async (file, meta = {}) => {
    if (!file || !coupleSpace) return
    setIsUploading(true)
    setUploadProgress(10)

    try {
      const result = await uploadCoupleMedia({
        coupleSpaceId: coupleSpace.id,
        file,
        category: meta.type || (file.type.startsWith('video/') ? 'video' : 'image'),
      })

      setUploadProgress(90)

      await handleSendMessage(file.name, {
        message_type: meta.type || result.category,
        media_url: result.path, // store the storage path
        metadata: {
          name: result.name,
          size: result.size,
          mimeType: result.type,
          duration: meta.duration || null,
        },
      })
    } catch (err) {
      console.error('Media upload error:', err)
      setError(err.message || 'Could not upload media.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Edit existing message
  const handleSaveEdit = async (id, newContent) => {
    if (!supabase || !id) return
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: newContent,
          is_edited: true,
        })
        .eq('id', id)
      if (error) throw error
      setEditingMessage(null)
    } catch (err) {
      console.error('Error editing message:', err)
      setError('Could not update message.')
    }
  }

  // Delete message
  const handleDeleteMessage = async (id) => {
    if (!supabase || !id) return
    try {
      const { error } = await supabase.from('messages').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error deleting message:', err)
      setError('Could not delete message.')
    }
  }

  // Group messages by date
  const renderDateSeparator = (dateStr) => {
    const date = new Date(dateStr)
    let label = ''
    if (isToday(date)) label = 'Today'
    else if (isYesterday(date)) label = 'Yesterday'
    else label = format(date, 'MMMM d, yyyy')

    return (
      <div className="flex items-center justify-center my-4 select-none">
        <span className="px-3 py-1 rounded-full bg-rose-100/70 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/30 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-8rem)] relative overflow-hidden bg-rose-50/20 dark:bg-midnight-950/20">
      {/* Error alert */}
      {error && (
        <div className="p-2.5 mx-3 mt-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-600 dark:text-red-300 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-bold px-1.5">
            ×
          </button>
        </div>
      )}

      {/* Message List */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-100 to-pink-100 dark:from-rose-950/50 dark:to-pink-950/50 flex items-center justify-center text-rose-500 mb-3 shadow-inner">
              <Heart className="w-8 h-8 fill-current text-rose-500 animate-heartbeat" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Welcome to Your Private Sanctuary 💗
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
              Every message, photo, and voice note you exchange here is privately preserved just for the two of you.
            </p>
            <button
              onClick={() => handleSendMessage('Hey my love! 💖')}
              className="mt-4 px-4 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-500/20 active:scale-95 transition"
            >
              Say Hello 👋
            </button>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender_id === user?.id
            const showDate =
              index === 0 ||
              new Date(msg.created_at).toDateString() !==
                new Date(messages[index - 1].created_at).toDateString()

            const repliedMsg = msg.reply_to_id
              ? messages.find((m) => m.id === msg.reply_to_id)
              : null

            return (
              <React.Fragment key={msg.id}>
                {showDate && renderDateSeparator(msg.created_at)}
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  partnerName={partner?.display_name}
                  repliedMessage={repliedMsg}
                  onReply={(m) => setReplyingTo(m)}
                  onEdit={(m) => setEditingMessage(m)}
                  onDelete={handleDeleteMessage}
                  onOpenLightbox={(media) => setActiveLightboxMedia(media)}
                />
              </React.Fragment>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-4 p-2.5 rounded-full bg-white dark:bg-midnight-800 text-rose-500 shadow-lg border border-rose-200 dark:border-rose-900 active:scale-95 transition animate-bounce-short z-20"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Chat Input Bar */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onSendMedia={handleSendMedia}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        editingMessage={editingMessage}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => setEditingMessage(null)}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />

      {/* Fullscreen Media Lightbox */}
      <MediaLightbox
        media={activeLightboxMedia}
        onClose={() => setActiveLightboxMedia(null)}
      />
    </div>
  )
}
