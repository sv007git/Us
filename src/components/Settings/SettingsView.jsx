import React, { useState, useRef, useEffect } from 'react'
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
  Trash2,
  AlertTriangle,
  Camera,
  Bell,
  BellRing,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCouple } from '../../context/CoupleContext'
import { useTheme } from '../../context/ThemeContext'
import { ConfigModal } from '../Auth/ConfigModal'
import { AvatarCropperModal } from '../Profile/AvatarCropperModal'
import {
  getNotificationPermission,
  requestNotificationPermission,
  showBrowserNotification,
  playNotificationSound,
  isSoundEnabled,
  setSoundEnabled,
} from '../../lib/notificationHelper'
import confetti from 'canvas-confetti'

export const SettingsView = () => {
  const { user, profile, updateProfile, signOut, deleteAccount } = useAuth()
  const { coupleSpace, partner, updateCoupleSpace } = useCouple()
  const { isDarkMode, toggleDarkMode, palette, setPalette, THEME_PALETTES, currentTheme } = useTheme()

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [welcomeMessage, setWelcomeMessage] = useState(coupleSpace?.welcome_message || '')
  const [anniversaryDate, setAnniversaryDate] = useState(coupleSpace?.anniversary_date || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Avatar crop modal states
  const [imageToCrop, setImageToCrop] = useState(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  // Notification states
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission())
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled())
  const [testNotifSent, setTestNotifSent] = useState(false)

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission()
    setNotifPermission(res)
    if (res === 'granted') {
      showBrowserNotification({
        title: 'Notifications Activated! 💌',
        body: 'You will now receive alerts whenever your partner sends a message.',
      })
    }
  }

  const handleToggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    setSoundEnabledState(next)
    if (next) {
      playNotificationSound()
    }
  }

  const handleSendTestNotification = () => {
    playNotificationSound()
    showBrowserNotification({
      title: 'Just You & Me 💗',
      body: 'This is a test notification! Audio chime and browser alerts are working.',
    })
    setTestNotifSent(true)
    setTimeout(() => setTestNotifSent(false), 3000)
  }

  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url)
    }
  }, [profile?.avatar_url])

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageToCrop(reader.result)
      setIsCropperOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropComplete = async (croppedDataUrl) => {
    setIsSavingAvatar(true)
    try {
      await updateProfile({ avatarUrl: croppedDataUrl })
      setAvatarUrl(croppedDataUrl)
      setIsCropperOpen(false)
      setImageToCrop(null)
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving cropped avatar:', err)
    } finally {
      setIsSavingAvatar(false)
    }
  }

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteAccount()
    } catch (err) {
      console.error('Delete account error:', err)
      setDeleteError(err.message || 'Could not delete account. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full p-4 pb-20 space-y-5 animate-fade-in">
      {/* Header */}
      <div className={`glass rounded-3xl p-5 flex items-center justify-between border ${currentTheme.border}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-2xl ${currentTheme.buttonGrad} text-white flex items-center justify-center shadow-md ${currentTheme.shadow}`}>
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
      <form onSubmit={handleSaveProfile} className={`glass rounded-3xl p-5 border ${currentTheme.border} space-y-4`}>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Personal & Couple Details
        </h3>

        {/* Profile Avatar with Camera Overlay & Cropper */}
        <div className={`flex flex-col items-center justify-center pt-1 pb-3 border-b ${currentTheme.borderLight}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarFileChange}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative cursor-pointer group"
            title="Click to upload and crop profile picture"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || 'Profile'}
                className={`w-24 h-24 rounded-full object-cover border-4 ${currentTheme.border} shadow-xl group-hover:scale-105 transition-transform`}
              />
            ) : (
              <div className={`w-24 h-24 rounded-full ${currentTheme.buttonGrad} flex items-center justify-center text-white shadow-xl ${currentTheme.shadow} border-4 border-white dark:border-midnight-800 group-hover:scale-105 transition-transform`}>
                <User className="w-12 h-12" />
              </div>
            )}
            <div className={`absolute bottom-0 right-0 p-2 rounded-full ${currentTheme.buttonGrad} text-white shadow-md transition hover:opacity-95`}>
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`text-xs font-semibold ${currentTheme.activeText} mt-2.5 hover:underline flex items-center gap-1`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Change Profile Picture</span>
          </button>
        </div>

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
              className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 ${currentTheme.ring} outline-none`}
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
              className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 ${currentTheme.ring} outline-none`}
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
            className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 ${currentTheme.ring} outline-none`}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className={`w-full py-2.5 px-4 rounded-xl ${currentTheme.buttonGrad} text-white text-xs font-semibold shadow-md ${currentTheme.shadow} active:scale-95 transition disabled:opacity-50`}
        >
          {isSaving ? 'Saving Changes...' : 'Save Settings'}
        </button>
      </form>

      {/* Theme & Palette Selection */}
      <div className={`glass rounded-3xl p-5 border ${currentTheme.border} space-y-4`}>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Romantic Themes & Appearance
        </h3>

        <div className={`flex items-center justify-between py-2 border-b ${currentTheme.borderLight}`}>
          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Dark Mode</h4>
            <p className="text-[11px] text-slate-400">Soft romantic night tones</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              isDarkMode ? currentTheme.accent : 'bg-slate-300'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.entries(THEME_PALETTES).map(([key, val]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPalette(key)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                  palette === key
                    ? `${currentTheme.border} ring-2 ${currentTheme.ring} ${currentTheme.softBg}`
                    : `border-slate-200 dark:border-slate-700 ${currentTheme.softHover}`
                }`}
              >
                <div>
                  <div className="flex gap-1.5 mb-1.5">
                    {val.preview?.map((hex, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rounded-full shadow-sm border border-black/10 inline-block"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    {val.name}
                  </span>
                </div>
                {palette === key && <Check className={`w-4 h-4 ${currentTheme.activeText}`} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications & Sound Alerts */}
      <div className={`glass rounded-3xl p-5 border ${currentTheme.border} space-y-4`}>
        <div className={`flex items-center gap-2 ${currentTheme.activeText}`}>
          <Bell className="w-4 h-4" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Notifications & Sound Alerts
          </h3>
        </div>

        {/* Sound toggle */}
        <div className={`flex items-center justify-between py-2 border-b ${currentTheme.borderLight}`}>
          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Romantic Audio Chime
            </h4>
            <p className="text-[11px] text-slate-400">Play sweet synthesized chime when partner texts or calls</p>
          </div>
          <button
            type="button"
            onClick={handleToggleSound}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              soundEnabled ? currentTheme.accent : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Browser notification permission */}
        <div className={`flex items-center justify-between py-2 border-b ${currentTheme.borderLight}`}>
          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Browser Push Alerts
            </h4>
            <p className="text-[11px] text-slate-400">
              Status: <span className={`font-semibold capitalize ${currentTheme.activeText}`}>{notifPermission}</span>
            </p>
          </div>
          {notifPermission !== 'granted' ? (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className={`py-1.5 px-3 rounded-xl ${currentTheme.buttonGrad} text-white text-xs font-semibold shadow-sm transition`}
            >
              Enable Alerts
            </button>
          ) : (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Enabled
            </span>
          )}
        </div>

        {/* Test Notification Button */}
        <button
          type="button"
          onClick={handleSendTestNotification}
          className={`w-full py-2.5 px-4 rounded-xl ${currentTheme.softBg} ${currentTheme.activeText} ${currentTheme.softHover} text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95`}
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>{testNotifSent ? 'Test Notification Sent! 🔔' : 'Send Test Alert & Sound'}</span>
        </button>
      </div>

      {/* Network & Infrastructure Settings */}
      <div className={`glass rounded-3xl p-5 border ${currentTheme.border} space-y-3`}>
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
          <Radio className={`w-4 h-4 ${currentTheme.activeText}`} />
          <span>Configure Services & TURN Server</span>
        </button>
      </div>

      {/* Privacy and Security Transparency */}
      <div className={`p-4 rounded-3xl ${currentTheme.softBg} border ${currentTheme.border} space-y-2`}>
        <div className={`flex items-center gap-2 ${currentTheme.activeText}`}>
          <ShieldCheck className="w-4 h-4" />
          <h4 className="text-xs font-bold">Privacy & Security Transparency</h4>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          Your space is secured with Supabase Row Level Security (RLS) on PostgreSQL. Only you and your paired partner can query or view messages, media, or memories. Media files are stored in private storage buckets and delivered via short-lived signed URLs. WebRTC media streams are encrypted point-to-point via DTLS/SRTP.
        </p>
      </div>

      {/* Sign Out & Account Management */}
      <div className="pt-2 space-y-3">
        <button
          onClick={signOut}
          className="w-full py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs font-semibold flex items-center justify-center gap-2 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Just You & Me</span>
        </button>

        {/* Danger Zone: Delete Account */}
        <div className="p-4 rounded-3xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 space-y-2.5">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h4>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Deleting your account is permanent. It will immediately remove your profile and decouple your shared space.
          </p>
          <button
            onClick={() => {
              setDeleteConfirmationText('')
              setDeleteError(null)
              setIsDeleteModalOpen(true)
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-midnight-900 border border-red-200 dark:border-red-900/60 p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Account Permanently?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This action <span className="font-semibold text-red-600 dark:text-red-400">cannot be undone</span>. All your data, profile details, and connection to your couple space will be permanently wiped.
              </p>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-600 dark:text-red-300">
                {deleteError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                To confirm, type <span className="font-bold text-red-600 select-all">DELETE</span> below:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-red-600/30 transition active:scale-95"
              >
                {isDeleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Cropper Modal */}
      <AvatarCropperModal
        isOpen={isCropperOpen}
        imageSrc={imageToCrop}
        isSaving={isSavingAvatar}
        onClose={() => {
          setIsCropperOpen(false)
          setImageToCrop(null)
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  )
}
