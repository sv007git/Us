import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Heart,
  Sparkles,
  AlertCircle,
  ArrowDown,
  Trash2,
  MoreVertical,
  AlertTriangle,
  RotateCcw,
  Check,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useCouple } from '../../context/CoupleContext'
import { useTheme } from '../../context/ThemeContext'
import { uploadCoupleMedia, getSignedMediaUrl } from '../../lib/storageHelper'
import { showBrowserNotification, playNotificationSound } from '../../lib/notificationHelper'
import { toggleMessageReaction } from '../../lib/reactionHelper'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { MediaLightbox } from './MediaLightbox'
import { format, isToday, isYesterday } from 'date-fns'
import confetti from 'canvas-confetti'

export const ChatView = ({ currentTab = 'chat', onNavigate = null, onShowToast = null }) => {
  const { user } = useAuth()
  const { coupleSpace, partner } = useCouple()
  const { currentTheme } = useTheme()

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [activeLightboxMedia, setActiveLightboxMedia] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [isPartnerTyping, setIsPartnerTyping] = useState(false)

  // Clear chat history modal states
  const [isClearChatModalOpen, setIsClearChatModalOpen] = useState(false)
  const [isClearingChat, setIsClearingChat] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)

  // Locally deleted / hidden message IDs ("Delete for Me")
  const [hiddenMessageIds, setHiddenMessageIds] = useState(() => {
    if (typeof localStorage === 'undefined' || !user?.id) return []
    try {
      const stored = localStorage.getItem(`just_you_me_hidden_msgs_${user.id}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const chatChannelRef = useRef(null)
  const typingTimeoutRef = useRef(null)

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
        .limit(200)

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

  // Realtime subscription for incoming/edited/deleted messages & reactions broadcast
  useEffect(() => {
    if (!supabase || !coupleSpace?.id) return

    const channel = supabase
      .channel(`chat_messages_${coupleSpace.id}`, {
        config: { broadcast: { self: false } },
      })
      // 1. Instant Realtime Broadcast (<50ms delivery)
      .on('broadcast', { event: 'new-message' }, async ({ payload }) => {
        if (!payload || !payload.id) return
        if (payload.sender_id === user?.id) return

        if (payload.media_url && !payload.media_url.startsWith('http')) {
          payload.media_url = (await getSignedMediaUrl(payload.media_url, 86400)) || payload.media_url
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev
          return [...prev, payload]
        })
        setIsPartnerTyping(false)
        setTimeout(() => scrollToBottom(true), 80)

        // Notification alert
        const isCurrentlyViewingChat = currentTab === 'chat' && !document.hidden
        const bodyText =
          payload.message_type === 'image'
            ? '📷 Sent a photo'
            : payload.message_type === 'video'
            ? '🎬 Sent a video'
            : payload.message_type === 'audio'
            ? '🎙️ Sent a voice note'
            : payload.message_type === 'sticker'
            ? '💝 Sent a love sticker'
            : payload.content || 'Sent a message'

        if (!isCurrentlyViewingChat) {
          showBrowserNotification({
            title: partner?.display_name || 'My Love 💗',
            body: bodyText,
            icon: partner?.avatar_url,
            tag: `msg-${payload.id}`,
            onClick: () => {
              onNavigate?.('chat')
            },
          })

          onShowToast?.({
            title: partner?.display_name || 'My Love',
            content: bodyText,
            avatar: partner?.avatar_url,
          })
        } else {
          playNotificationSound()
          // Automatically acknowledge message as read to partner
          channel.send({
            type: 'broadcast',
            event: 'messages-read',
            payload: { reader_id: user?.id },
          })
        }
      })
      .on('broadcast', { event: 'messages-read' }, ({ payload }) => {
        if (!payload || payload.reader_id === user?.id) return
        // Partner viewed our sent messages -> turn ticks into double blue ticks
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === user?.id
              ? {
                  ...m,
                  is_read: true,
                  media_metadata: { ...(m.media_metadata || {}), is_read: true },
                }
              : m
          )
        )
      })
      .on('broadcast', { event: 'edit-message' }, ({ payload }) => {
        if (!payload || !payload.id) return
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.id ? { ...m, ...payload } : m))
        )
      })
      .on('broadcast', { event: 'delete-message' }, ({ payload }) => {
        if (!payload || !payload.id) return
        setMessages((prev) => prev.filter((m) => m.id !== payload.id))
      })
      .on('broadcast', { event: 'message-reaction' }, ({ payload }) => {
        if (!payload || !payload.messageId) return
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId
              ? {
                  ...m,
                  media_metadata: {
                    ...(m.media_metadata || {}),
                    reactions: payload.reactions || {},
                  },
                }
              : m
          )
        )
      })
      .on('broadcast', { event: 'clear-chat-history' }, () => {
        setMessages([])
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.sender_id === user?.id) return
        setIsPartnerTyping(Boolean(payload.isTyping))
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        if (payload.isTyping) {
          typingTimeoutRef.current = setTimeout(() => {
            setIsPartnerTyping(false)
          }, 3500)
        }
      })
      // 2. Database WAL Replication (postgres_changes)
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
      .subscribe()

    chatChannelRef.current = channel

    return () => {
      chatChannelRef.current = null
      channel.unsubscribe()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [coupleSpace?.id, user?.id, currentTab, partner?.display_name, partner?.avatar_url, onNavigate, onShowToast])

  // Automatically mark partner's messages as read when viewing chat
  const markIncomingAsRead = useCallback(() => {
    if (!coupleSpace?.id || !user?.id) return
    if (currentTab !== 'chat') return

    setMessages((prev) => {
      const hasUnread = prev.some(
        (m) => m.sender_id !== user.id && !m.is_read && !m.media_metadata?.is_read
      )
      if (!hasUnread) return prev

      // Broadcast to partner that their messages have been read
      chatChannelRef.current?.send({
        type: 'broadcast',
        event: 'messages-read',
        payload: { reader_id: user.id },
      })

      // Try updating in Supabase
      if (supabase) {
        supabase
          .from('messages')
          .update({ is_read: true })
          .eq('couple_space_id', coupleSpace.id)
          .neq('sender_id', user.id)
          .then(() => {})
          .catch(() => {})
      }

      return prev.map((m) =>
        m.sender_id !== user.id
          ? {
              ...m,
              is_read: true,
              media_metadata: { ...(m.media_metadata || {}), is_read: true },
            }
          : m
      )
    })
  }, [coupleSpace?.id, currentTab, user?.id])

  useEffect(() => {
    markIncomingAsRead()
    const handleFocus = () => markIncomingAsRead()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [markIncomingAsRead])

  // Scroll listener to toggle "scroll to bottom" button
  const handleScroll = () => {
    const el = chatContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBottom(distanceFromBottom > 250)
  }

  // Send message
  const handleSendMessage = async (text, meta = {}) => {
    if (!supabase || !user || !coupleSpace) return
    if (!text && !meta.message_type) return

    const messageData = {
      couple_space_id: coupleSpace.id,
      sender_id: user.id,
      content: text,
      message_type: meta.message_type || 'text',
      media_url: meta.media_url || null,
      media_metadata: meta.metadata || {},
      reply_to_id: replyingTo?.id || null,
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (error) throw error

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev
        return [...prev, data]
      })

      chatChannelRef.current?.send({
        type: 'broadcast',
        event: 'new-message',
        payload: data,
      })

      chatChannelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender_id: user.id, isTyping: false },
      })

      setReplyingTo(null)
      setTimeout(() => scrollToBottom(true), 80)
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message: ' + err.message)
    }
  }

  // Broadcast typing signal from current user
  const handleUserTyping = (isTyping) => {
    if (!chatChannelRef.current || !user?.id) return
    chatChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender_id: user.id, isTyping },
    })
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
        media_url: result.path,
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

  // Toggle WhatsApp-style reaction on message
  const handleToggleReaction = async (messageId, emoji) => {
    if (!user?.id || !messageId) return

    let updatedMsg = null
    let updatedReactions = null

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg

        const currentReactions = msg.media_metadata?.reactions || {}
        const reactions = toggleMessageReaction(currentReactions, emoji, user.id)
        const updatedMetadata = { ...(msg.media_metadata || {}), reactions }
        updatedMsg = { ...msg, media_metadata: updatedMetadata }
        updatedReactions = reactions
        return updatedMsg
      })
    )

    // Broadcast instant reaction to partner
    chatChannelRef.current?.send({
      type: 'broadcast',
      event: 'message-reaction',
      payload: { messageId, reactions: updatedReactions },
    })

    // Confetti celebration
    confetti({
      particleCount: 16,
      spread: 45,
      origin: { y: 0.6 },
      colors: currentTheme.preview || ['#f43f5e', '#ec4899', '#fda4af'],
    })

    // Persist reaction update to database if real message ID
    if (supabase && typeof messageId === 'string' && messageId.length > 20) {
      try {
        await supabase
          .from('messages')
          .update({
            media_metadata: updatedMsg?.media_metadata || { reactions: updatedReactions },
          })
          .eq('id', messageId)
      } catch (err) {
        console.error('Error saving message reaction:', err)
      }
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

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content: newContent, is_edited: true } : m))
      )

      chatChannelRef.current?.send({
        type: 'broadcast',
        event: 'edit-message',
        payload: { id, content: newContent, is_edited: true },
      })

      setEditingMessage(null)
    } catch (err) {
      console.error('Error editing message:', err)
      setError('Could not update message.')
    }
  }

  // Unsend message (Delete for everyone)
  const handleUnsendMessage = async (id) => {
    if (!supabase || !id) return
    try {
      const { error } = await supabase.from('messages').delete().eq('id', id)
      if (error) throw error

      setMessages((prev) => prev.filter((m) => m.id !== id))

      chatChannelRef.current?.send({
        type: 'broadcast',
        event: 'delete-message',
        payload: { id },
      })
    } catch (err) {
      console.error('Error unsending message:', err)
      setError('Could not unsend message.')
    }
  }

  // Delete message for me only
  const handleDeleteForMe = (id) => {
    if (!id) return
    setHiddenMessageIds((prev) => {
      const next = [...prev, id]
      if (typeof localStorage !== 'undefined' && user?.id) {
        localStorage.setItem(`just_you_me_hidden_msgs_${user.id}`, JSON.stringify(next))
      }
      return next
    })
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  // Delete entire chat history for both partners
  const handleClearChatHistory = async () => {
    if (!supabase || !coupleSpace?.id) return
    setIsClearingChat(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('couple_space_id', coupleSpace.id)

      if (error) throw error

      setMessages([])
      setIsClearChatModalOpen(false)

      chatChannelRef.current?.send({
        type: 'broadcast',
        event: 'clear-chat-history',
      })
    } catch (err) {
      console.error('Error clearing chat history:', err)
      setError('Could not clear chat history: ' + err.message)
    } finally {
      setIsClearingChat(false)
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
        <span className={`px-3 py-1 rounded-full bg-white/80 dark:bg-midnight-900/80 border ${currentTheme.border} text-[11px] font-semibold ${currentTheme.activeText} shadow-sm backdrop-blur-sm`}>
          {label}
        </span>
      </div>
    )
  }

  // Filter out any messages deleted for me
  const visibleMessages = messages.filter((m) => !hiddenMessageIds.includes(m.id))

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 relative overflow-hidden bg-transparent">
      {/* Top Chat Subheader / Action Bar */}
      <div className={`w-full glass border-b ${currentTheme.border} px-4 py-2 flex items-center justify-between text-xs shrink-0 z-10 transition-colors duration-200`}>
        <div className="flex items-center space-x-2">
          {partner?.avatar_url ? (
            <img
              src={partner.avatar_url}
              alt={partner.display_name || 'Partner'}
              className={`w-7 h-7 rounded-full object-cover border ${currentTheme.border}`}
            />
          ) : (
            <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${currentTheme.primary} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
              {partner?.display_name?.charAt(0) || 'L'}
            </div>
          )}
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[140px] sm:max-w-[200px]">
              {partner?.display_name || 'My Love'}
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              {isPartnerTyping ? (
                <span className={`font-semibold ${currentTheme.activeText} animate-pulse flex items-center gap-1`}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  {partner?.display_name || 'My Love'} is typing...
                </span>
              ) : (
                'Private end-to-end sanctuary'
              )}
            </span>
          </div>
        </div>

        {/* Chat options menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowChatMenu((prev) => !prev)}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-midnight-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition"
            title="Chat Options"
            aria-label="Chat options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showChatMenu && (
            <div className={`absolute right-0 top-full mt-1 w-44 bg-white dark:bg-midnight-900 border ${currentTheme.border} rounded-2xl shadow-xl py-1 text-xs font-medium text-slate-700 dark:text-slate-200 z-30 animate-scale-up`}>
              <button
                type="button"
                onClick={() => {
                  setShowChatMenu(false)
                  setIsClearChatModalOpen(true)
                }}
                className="w-full px-3.5 py-2 text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Chat History</span>
              </button>
            </div>
          )}
        </div>
      </div>

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
            <div className={`w-8 h-8 border-3 border-current ${currentTheme.activeText} border-t-transparent rounded-full animate-spin`} />
          </div>
        ) : visibleMessages.length === 0 ? (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className={`w-16 h-16 rounded-3xl bg-gradient-to-tr ${currentTheme.primary} flex items-center justify-center text-white mb-3 shadow-md`}>
              <Heart className="w-8 h-8 fill-current text-white animate-heartbeat" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Welcome to Your Private Sanctuary 💗
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
              Every message, photo, and voice note you exchange here is privately preserved just for the two of you.
            </p>
            <button
              onClick={() => handleSendMessage('Hey my love! 💖')}
              className={`mt-4 px-4 py-2 rounded-full ${currentTheme.buttonGrad} hover:opacity-95 text-white text-xs font-semibold shadow-md active:scale-95 transition`}
            >
              Say Hello 👋
            </button>
          </div>
        ) : (
          visibleMessages.map((msg, index) => {
            const isOwn = msg.sender_id === user?.id
            const showDate =
              index === 0 ||
              new Date(msg.created_at).toDateString() !==
                new Date(visibleMessages[index - 1].created_at).toDateString()

            const repliedMsg = msg.reply_to_id
              ? visibleMessages.find((m) => m.id === msg.reply_to_id)
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
                  onDelete={handleUnsendMessage}
                  onUnsend={handleUnsendMessage}
                  onDeleteForMe={handleDeleteForMe}
                  onOpenLightbox={(media) => setActiveLightboxMedia(media)}
                  onToggleReaction={handleToggleReaction}
                  currentUserId={user?.id}
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
          className={`absolute bottom-20 right-4 p-2.5 rounded-full bg-white dark:bg-midnight-800 ${currentTheme.activeText} shadow-lg border ${currentTheme.border} active:scale-95 transition animate-bounce-short z-20`}
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Realtime Partner Typing Indicator */}
      {isPartnerTyping && (
        <div className={`px-4 py-2 text-xs ${currentTheme.activeText} flex items-center gap-2 select-none bg-white/85 dark:bg-midnight-900/85 backdrop-blur-md border-t ${currentTheme.border} transition-all`}>
          <div className="flex gap-1 items-center">
            <span className={`w-2 h-2 rounded-full ${currentTheme.badge.split(' ')[0]} animate-bounce`} style={{ animationDelay: '0ms' }} />
            <span className={`w-2 h-2 rounded-full ${currentTheme.badge.split(' ')[0]} animate-bounce`} style={{ animationDelay: '150ms' }} />
            <span className={`w-2 h-2 rounded-full ${currentTheme.badge.split(' ')[0]} animate-bounce`} style={{ animationDelay: '300ms' }} />
          </div>
          <span className="italic font-semibold">{partner?.display_name || 'My Love'} is typing...</span>
        </div>
      )}

      {/* Chat Input Bar */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onSendMedia={handleSendMedia}
        onTyping={handleUserTyping}
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

      {/* Clear Chat History Confirmation Modal */}
      {isClearChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-midnight-900 border border-red-200 dark:border-red-900/60 p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Clear Chat History?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This will <span className="font-semibold text-red-600 dark:text-red-400">permanently delete all messages</span>, photos, and voice notes in this conversation for both you and your partner. This cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearChatModalOpen(false)}
                disabled={isClearingChat}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearChatHistory}
                disabled={isClearingChat}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md shadow-red-600/30 transition active:scale-95 disabled:opacity-50"
              >
                {isClearingChat ? 'Clearing...' : 'Clear All Messages'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
