import React, { useState } from 'react'
import {
  Settings,
  Heart,
  User,
  Calendar,
  Palette,
  ShieldCheck,
  LogOut,
  Radio,
  Check,
  Sparkles,
  Info,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCouple } from '../../context/CoupleContext'
import { useTheme } from '../../context/ThemeContext'
import { ConfigModal } from '../Auth/ConfigModal'
import confetti from 'canvas-confetti'

export const SettingsView = () => {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { coupleSpace, partner, updateCoupleSpace } = useCouple()
  const { isDarkMode, toggleDarkMode, palette, setPalette, THEME_PALETTES } = useTheme()

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [welcomeMessage, setWelcomeMessage] = useState(coupleSpace?.welcome_message || '')
  const [anniversaryDate, setAnniversaryDate] = useState(coupleSpace?.anniversary_date || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      if (displayName !== profile?.display_name) {
        await updateProfile({ displayName: displayName.trim() })
      }
      if (
        coupleSpace &&
        (welcomeMessage !== coupleSpace.welcome_message ||
          anniversaryDate !== coupleSpace.anniversary_date)
      ) {
        await updateCoupleSpace({
          welcome_message: welcomeMessage.trim(),
          anniversary_date: anniversaryDate || null,
        })
      }
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.6 } })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Save settings error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full p-4 pb-20 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="glass rounded-3xl p-5 flex items-center justify-between border border-rose-200/60 dark:border-rose-900/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings & Preferences</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalize your couple experience and privacy options.
            </p>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" /> Changes saved successfully!
        </div>
      )}

      {/* Profile & Couple Settings Form */}
      <form onSubmit={handleSaveProfile} className="glass rounded-3xl p-5 border border-rose-200/60 dark:border-rose-900/40 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Personal & Couple Details
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Your Display Name / Pet Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Anniversary Date
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={anniversaryDate}
              onChange={(e) => setAnniversaryDate(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Romantic Welcome Message
          </label>
          <input
            type="text"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="Forever and always 💗"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-500/20 active:scale-95 transition disabled:opacity-50"
        >
          {isSaving ? 'Saving Changes...' : 'Save Settings'}
        </button>
      </form>

      {/* Theme & Palette Selection */}
      <div className="glass rounded-3xl p-5 border border-rose-200/60 dark:border-rose-900/40 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Romantic Themes & Appearance
        </h3>

        <div className="flex items-center justify-between py-2 border-b border-rose-100 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Dark Mode</h4>
            <p className="text-[11px] text-slate-400">Soft romantic night tones</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              isDarkMode ? 'bg-rose-500' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                isDarkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-2">
            Palette Style
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(THEME_PALETTES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setPalette(key)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                  palette === key
                    ? 'border-rose-500 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-rose-300'
                }`}
              >
                <div>
                  <div className={`w-6 h-6 rounded-lg bg-gradient-to-r ${val.primary} mb-1`} />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    {val.name}
                  </span>
                </div>
                {palette === key && <Check className="w-4 h-4 text-rose-500" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Network & Infrastructure Settings */}
      <div className="glass rounded-3xl p-5 border border-rose-200/60 dark:border-rose-900/40 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Infrastructure & Calling
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure Supabase API endpoints or custom WebRTC TURN servers for cellular network calling.
        </p>
        <button
          onClick={() => setIsConfigOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
        >
          <Radio className="w-4 h-4 text-rose-500" />
          <span>Configure Services & TURN Server</span>
        </button>
      </div>

      {/* Privacy and Security Transparency */}
      <div className="p-4 rounded-3xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 space-y-2">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <ShieldCheck className="w-4 h-4" />
          <h4 className="text-xs font-bold">Privacy & Security Transparency</h4>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          Your space is secured with Supabase Row Level Security (RLS) on PostgreSQL. Only you and your paired partner can query or view messages, media, or memories. Media files are stored in private storage buckets and delivered via short-lived signed URLs. WebRTC media streams are encrypted point-to-point via DTLS/SRTP.
        </p>
      </div>

      {/* Sign Out */}
      <div className="pt-2">
        <button
          onClick={signOut}
          className="w-full py-3 px-4 rounded-2xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold flex items-center justify-center gap-2 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Just You & Me</span>
        </button>
      </div>

      <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </div>
  )
}
