import React, { useState, useEffect, useRef } from 'react'
import {
  Heart,
  Copy,
  Check,
  Share2,
  Sparkles,
  KeyRound,
  Calendar,
  ArrowRight,
  RefreshCw,
  LogOut,
  Trash2,
  AlertTriangle,
  Camera,
  User,
} from 'lucide-react'
import { useCouple } from '../../context/CoupleContext'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { AvatarCropperModal } from '../Profile/AvatarCropperModal'
import confetti from 'canvas-confetti'

export const PairingScreen = () => {
  const { currentTheme } = useTheme()
  const { user, profile, updateProfile, signOut, deleteAccount } = useAuth()
  const {
    coupleSpace,
    activeInvitation,
    createCoupleSpace,
    joinCoupleSpace,
    generateNewInvitation,
    refreshCouple,
  } = useCouple()

  const [tab, setTab] = useState('create') // 'create' or 'join'
  const [spaceName, setSpaceName] = useState('Just You & Me')
  const [anniversaryDate, setAnniversaryDate] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('Forever and always 💗')
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Profile avatar & cropper states
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [imageToCrop, setImageToCrop] = useState(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  // Delete account confirmation states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Sync avatar if profile updates
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url)
    }
  }, [profile?.avatar_url])

  // Check URL query param ?invite=ABC12345
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codeFromUrl = params.get('invite')
    if (codeFromUrl) {
      setInviteCodeInput(codeFromUrl.toUpperCase())
      setTab('join')
    }
  }, [])

  // Poll couple status while waiting for partner
  useEffect(() => {
    if (coupleSpace && !activeInvitation?.used_at) {
      const interval = setInterval(() => {
        refreshCouple()
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [coupleSpace, activeInvitation, refreshCouple])

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
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } })
    } catch (err) {
      console.error('Error saving cropped avatar:', err)
      setError(err.message || 'Failed to save profile picture.')
    } finally {
      setIsSavingAvatar(false)
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

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createCoupleSpace({
        name: spaceName.trim(),
        anniversaryDate: anniversaryDate || null,
        welcomeMessage: welcomeMessage.trim(),
      })
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } })
    } catch (err) {
      setError(err.message || 'Could not create couple space.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await joinCoupleSpace(inviteCodeInput.trim())
      confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } })
    } catch (err) {
      setError(err.message || 'Could not join with this invitation code.')
    } finally {
      setLoading(false)
    }
  }

  const getInviteUrl = () => {
    if (!activeInvitation) return ''
    const base = window.location.origin + window.location.pathname
    return `${base}?invite=${activeInvitation.code}`
  }

  const copyInviteLink = async () => {
    const url = getInviteUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(true)
    }
  }

  const shareInviteLink = async () => {
    const url = getInviteUrl()
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join our private couple space on Just You & Me 💗',
          text: `My love, join our private sanctuary with this invitation code: ${activeInvitation.code}`,
          url,
        })
      } catch (err) {
        console.warn('Share cancelled or not supported', err)
      }
    } else {
      copyInviteLink()
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br ${currentTheme.bgGradient}`}>
      <div className={`w-full max-w-md bg-white/90 dark:bg-midnight-900/90 backdrop-blur-xl border ${currentTheme.border} rounded-3xl p-7 sm:p-9 shadow-2xl relative`}>
        {/* Top Header */}
        <div className="text-center mb-4">
          <div className={`inline-flex p-3 rounded-2xl ${currentTheme.buttonGrad} text-white shadow-lg ${currentTheme.shadow} mb-3`}>
            <Heart className="w-7 h-7 fill-current text-white animate-heartbeat" />
          </div>
          <h2 className={`text-2xl font-bold font-romantic ${currentTheme.activeText}`}>
            {coupleSpace ? 'Waiting for Your Partner 💌' : 'Connect as a Couple'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {coupleSpace
              ? 'Share this invitation with your partner to unlock your shared space.'
              : 'Create your private world or accept an invitation from your partner.'}
          </p>
        </div>

        {/* Profile Avatar Card with Upload & Crop */}
        <div className={`flex flex-col items-center justify-center mb-5 pb-4 border-b ${currentTheme.borderLight}`}>
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
                alt={profile?.display_name || 'Profile'}
                className={`w-20 h-20 rounded-full object-cover border-4 ${currentTheme.border} shadow-lg group-hover:scale-105 transition-transform`}
              />
            ) : (
              <div className={`w-20 h-20 rounded-full ${currentTheme.buttonGrad} flex items-center justify-center text-white shadow-lg ${currentTheme.shadow} border-4 border-white dark:border-midnight-800 group-hover:scale-105 transition-transform`}>
                <User className="w-10 h-10" />
              </div>
            )}
            <div className={`absolute bottom-0 right-0 p-1.5 rounded-full ${currentTheme.buttonGrad} text-white shadow-md transition hover:opacity-95`}>
              <Camera className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-2 text-center">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              {profile?.display_name || user?.email?.split('@')[0] || 'My Profile'}
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`text-[11px] font-medium ${currentTheme.activeText} hover:underline inline-flex items-center gap-1 mt-0.5`}
            >
              <Camera className="w-3 h-3" />
              <span>{avatarUrl ? 'Change Profile Photo' : 'Upload Profile Photo'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* State A: Space Already Created -> Show Invitation Code */}
        {coupleSpace ? (
          <div className="space-y-5">
            <div className={`p-4 rounded-2xl ${currentTheme.softBg} border ${currentTheme.border} text-center`}>
              <span className={`text-[11px] font-semibold ${currentTheme.activeText} uppercase tracking-wider block mb-1`}>
                Your Secret Invitation Code
              </span>
              <div className="text-3xl font-mono font-bold tracking-widest text-slate-900 dark:text-white py-2 select-all">
                {activeInvitation?.code || '••••••••'}
              </div>
              <p className="text-[11px] text-slate-400">
                Expires in 7 days • Valid for one partner only
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyInviteLink}
                className={`flex-1 py-2.5 px-3 rounded-xl ${currentTheme.buttonGrad} text-white text-xs font-semibold shadow-md ${currentTheme.shadow} flex items-center justify-center gap-1.5 transition active:scale-95`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Link Copied!' : 'Copy Invite Link'}
              </button>

              <button
                type="button"
                onClick={shareInviteLink}
                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                title="Share link"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-amber-500" />
              <span>Waiting for your partner to join... This screen will refresh automatically!</span>
            </div>

            <div className={`pt-3 border-t ${currentTheme.borderLight} space-y-2`}>
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={generateNewInvitation}
                  className={`text-xs ${currentTheme.activeText} hover:underline flex items-center gap-1`}
                >
                  <RefreshCw className="w-3 h-3" /> Generate New Code
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" /> Sign Out
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmationText('')
                    setDeleteError(null)
                    setIsDeleteModalOpen(true)
                  }}
                  className="text-[11px] text-red-500 hover:text-red-600 hover:underline inline-flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Account Permanently</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* State B: No Space Yet -> Create or Join Tabs */
          <div>
            <div className={`flex p-1 ${currentTheme.softBg} rounded-2xl mb-5`}>
              <button
                type="button"
                onClick={() => { setTab('create'); setError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                  tab === 'create'
                    ? `bg-white dark:bg-midnight-800 ${currentTheme.activeText} shadow-sm`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Create Our Space
              </button>
              <button
                type="button"
                onClick={() => { setTab('join'); setError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                  tab === 'join'
                    ? `bg-white dark:bg-midnight-800 ${currentTheme.activeText} shadow-sm`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Join with Code
              </button>
            </div>

            {tab === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Space Title
                  </label>
                  <input
                    type="text"
                    required
                    value={spaceName}
                    onChange={(e) => setSpaceName(e.target.value)}
                    placeholder="e.g. Just You & Me, Harish & Love"
                    className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${currentTheme.ring}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Relationship Anniversary Date (Optional)
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={anniversaryDate}
                      onChange={(e) => setAnniversaryDate(e.target.value)}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${currentTheme.ring}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Welcome Message
                  </label>
                  <input
                    type="text"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="Forever and always 💗"
                    className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${currentTheme.ring}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full mt-2 py-3 px-4 rounded-xl ${currentTheme.buttonGrad} hover:opacity-95 text-white font-semibold text-sm shadow-md ${currentTheme.shadow} flex items-center justify-center space-x-2 transition disabled:opacity-50`}
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create & Generate Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Enter Invitation Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={16}
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 7K4MZ9WQ"
                      className={`w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-mono tracking-widest text-base uppercase focus:outline-none focus:ring-2 ${currentTheme.ring}`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ask your partner to share their 8-character invitation code with you.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !inviteCodeInput.trim()}
                  className={`w-full py-3 px-4 rounded-xl ${currentTheme.buttonGrad} hover:opacity-95 text-white font-semibold text-sm shadow-md ${currentTheme.shadow} flex items-center justify-center space-x-2 transition disabled:opacity-50`}
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Join Couple Space</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className={`mt-6 pt-4 border-t ${currentTheme.borderLight} flex items-center justify-between`}>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmationText('')
                  setDeleteError(null)
                  setIsDeleteModalOpen(true)
                }}
                className="text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
              <button
                type="button"
                onClick={signOut}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

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
                This action <span className="font-semibold text-red-600 dark:text-red-400">cannot be undone</span>. All your personal data, profile details, invitations, and connection space will be permanently wiped.
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
