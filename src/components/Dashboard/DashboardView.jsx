import React, { useState, useEffect } from 'react'
import {
  Heart,
  Calendar,
  MessageCircle,
  Phone,
  Video,
  Film,
  Image as ImageIcon,
  HeartHandshake,
  Sparkles,
  Smile,
  Clock,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCouple } from '../../context/CoupleContext'
import { useCall } from '../../context/CallContext'
import { useTheme } from '../../context/ThemeContext'
import { differenceInDays, differenceInHours, differenceInMinutes, parseISO } from 'date-fns'
import confetti from 'canvas-confetti'

const MOOD_OPTIONS = [
  'Thinking of you 💭',
  'Missing you 🥺',
  'Head over heels 🥰',
  'Need a cuddle 🫂',
  'Working hard 💼',
  'Listening to our song 🎵',
  'Counting the hours ⏳',
  'Sending kisses 💋',
]

export const DashboardView = ({ setCurrentTab }) => {
  const { user, profile, updateProfile } = useAuth()
  const { coupleSpace, partner, isPartnerOnline, presenceChannel } = useCouple()
  const { startCall } = useCall()
  const { currentTheme } = useTheme()

  const [anniversaryStats, setAnniversaryStats] = useState({ days: 0, hours: 0, mins: 0 })
  const [selectedMood, setSelectedMood] = useState(profile?.status_mood || 'Thinking of you 💭')
  const [isUpdatingMood, setIsUpdatingMood] = useState(false)

  // Sync mood if profile updates
  useEffect(() => {
    if (profile?.status_mood) {
      setSelectedMood(profile.status_mood)
    }
  }, [profile?.status_mood])

  // Calculate live anniversary time
  useEffect(() => {
    if (!coupleSpace?.anniversary_date) return

    const calculateTime = () => {
      const anniv = parseISO(coupleSpace.anniversary_date)
      const now = new Date()

      const days = differenceInDays(now, anniv)
      const totalHours = differenceInHours(now, anniv)
      const hours = totalHours % 24
      const totalMins = differenceInMinutes(now, anniv)
      const mins = totalMins % 60

      setAnniversaryStats({ days: Math.max(0, days), hours: Math.max(0, hours), mins: Math.max(0, mins) })
    }

    calculateTime()
    const timer = setInterval(calculateTime, 60000)
    return () => clearInterval(timer)
  }, [coupleSpace?.anniversary_date])

  const handleMoodSelect = async (mood) => {
    setSelectedMood(mood)
    setIsUpdatingMood(true)
    try {
      await updateProfile({ statusMood: mood })

      // Broadcast mood update in realtime to partner
      if (presenceChannel) {
        presenceChannel.send({
          type: 'broadcast',
          event: 'partner-profile-updated',
          payload: {
            userId: user?.id,
            statusMood: mood,
            profile: { ...(profile || {}), status_mood: mood },
          },
        })
      }

      confetti({ particleCount: 20, spread: 50, origin: { y: 0.6 } })
    } catch (e) {
      console.warn('Could not update status mood:', e)
    } finally {
      setIsUpdatingMood(false)
    }
  }

  const triggerHeartCelebration = () => {
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3'],
    })
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 pb-20 space-y-5">
      {/* 1. Romantic Hero Card */}
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r ${currentTheme.buttonGrad} text-white shadow-xl ${currentTheme.shadow}`}>
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Our Love Sanctuary</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-romantic tracking-wide">
            {coupleSpace?.welcome_message || 'Forever & always 💗'}
          </h2>

          <p className="text-xs sm:text-sm text-white/90 max-w-md">
            A sacred space just for {profile?.display_name || 'You'} & {partner?.display_name || 'Your Love'}.
          </p>

          {/* Anniversary Counter */}
          {coupleSpace?.anniversary_date ? (
            <div
              onClick={triggerHeartCelebration}
              className="mt-4 pt-4 border-t border-white/20 flex flex-wrap items-center gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-white/80" />
                <span className="text-xs text-white/90">Together For:</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-sm sm:text-base font-bold text-white">
                <span className="px-2 py-1 rounded-lg bg-white/20">{anniversaryStats.days} Days</span>
                <span>:</span>
                <span className="px-2 py-1 rounded-lg bg-white/20">{anniversaryStats.hours} Hours</span>
                <span>:</span>
                <span className="px-2 py-1 rounded-lg bg-white/20">{anniversaryStats.mins} Mins</span>
              </div>
              <span className="text-xs group-hover:scale-125 transition-transform">💖</span>
            </div>
          ) : (
            <button
              onClick={() => setCurrentTab('settings')}
              className="mt-2 text-xs text-white/80 hover:text-white underline flex items-center gap-1"
            >
              <Calendar className="w-3.5 h-3.5" /> Set your relationship anniversary date
            </button>
          )}
        </div>

        {/* Ambient Decorative Hearts */}
        <Heart className="absolute -bottom-8 -right-8 w-44 h-44 text-white/10 fill-current pointer-events-none" />
      </div>

      {/* 2. Partner Status & Live Mood Card */}
      <div className={`glass rounded-3xl p-5 border ${currentTheme.border} space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${currentTheme.primary} flex items-center justify-center text-white font-bold text-lg shadow-md ${currentTheme.shadow}`}>
                {(partner?.display_name || 'L').charAt(0).toUpperCase()}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-midnight-900 ${
                  isPartnerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  {partner?.display_name || 'My Partner'}
                </h3>
                <span className="text-xs">💗</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isPartnerOnline ? 'Online now with you' : 'Away for a moment'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">
              Partner Mood
            </span>
            <span className={`text-xs font-semibold ${currentTheme.activeText}`}>
              {partner?.status_mood || 'Thinking of you 💭'}
            </span>
          </div>
        </div>

        {/* Your Current Mood Selector */}
        <div className={`pt-3 border-t ${currentTheme.borderLight}`}>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Share Your Mood with {partner?.display_name || 'Partner'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood}
                onClick={() => handleMoodSelect(mood)}
                disabled={isUpdatingMood}
                className={`px-3 py-1.5 rounded-full text-xs transition ${
                  selectedMood === mood
                    ? `${currentTheme.badge} font-semibold shadow-sm`
                    : `${currentTheme.softBg} text-slate-700 dark:text-slate-300 ${currentTheme.softHover}`
                }`}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Quick Action Hub */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Our Special Places
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setCurrentTab('chat')}
            className={`glass rounded-2xl p-4 text-left border ${currentTheme.borderLight} hover:${currentTheme.border} active:scale-95 transition group`}
          >
            <div className={`w-10 h-10 rounded-xl ${currentTheme.softBg} ${currentTheme.activeText} flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform`}>
              <MessageCircle className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-100">Private Chat</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Realtime whisper space</p>
          </button>

          <button
            onClick={() => startCall({ isVideo: true })}
            className={`glass rounded-2xl p-4 text-left border ${currentTheme.borderLight} hover:${currentTheme.border} active:scale-95 transition group`}
          >
            <div className={`w-10 h-10 rounded-xl ${currentTheme.softBg} ${currentTheme.activeText} flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform`}>
              <Video className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-100">Video Call</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">See each other now</p>
          </button>

          <button
            onClick={() => setCurrentTab('watch')}
            className={`glass rounded-2xl p-4 text-left border ${currentTheme.borderLight} hover:${currentTheme.border} active:scale-95 transition group`}
          >
            <div className={`w-10 h-10 rounded-xl ${currentTheme.softBg} ${currentTheme.activeText} flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform`}>
              <Film className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-100">Movie Night</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Synchronized videos</p>
          </button>

          <button
            onClick={() => setCurrentTab('memories')}
            className={`glass rounded-2xl p-4 text-left border ${currentTheme.borderLight} hover:${currentTheme.border} active:scale-95 transition group`}
          >
            <div className={`w-10 h-10 rounded-xl ${currentTheme.softBg} ${currentTheme.activeText} flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform`}>
              <ImageIcon className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-100">Memories</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Our shared album</p>
          </button>
        </div>
      </div>
    </div>
  )
}
