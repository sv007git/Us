import React from 'react'
import { Heart, Phone, Video, Moon, Sun, Settings, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCouple } from '../context/CoupleContext'
import { useCall } from '../context/CallContext'
import { useTheme } from '../context/ThemeContext'
import confetti from 'canvas-confetti'

export const Navbar = ({ currentTab, setCurrentTab }) => {
  const { profile } = useAuth()
  const { coupleSpace, partner, isPartnerOnline, isPaired } = useCouple()
  const { startCall, callState } = useCall()
  const { isDarkMode, toggleDarkMode, currentTheme } = useTheme()

  const triggerHeartBurst = () => {
    confetti({
      particleCount: 25,
      spread: 60,
      origin: { y: 0.1 },
      colors: ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3'],
      shapes: ['circle'],
    })
  }

  return (
    <header className="sticky top-0 z-30 w-full glass safe-top border-b border-rose-200/50 dark:border-rose-900/30 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Branding & Couple Title */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={triggerHeartBurst}>
          <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${currentTheme.primary} flex items-center justify-center text-white shadow-md shadow-rose-500/20 active:scale-95 transition-transform overflow-hidden border border-rose-300 dark:border-rose-700`}>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || 'My Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              <Heart className="w-5 h-5 fill-current animate-heartbeat text-white" />
            )}
          </div>
          <div>
            <h1 className={`text-lg font-bold font-romantic ${currentTheme.activeText} tracking-wide flex items-center gap-1.5`}>
              {coupleSpace?.name || 'Just You & Me'}
              <span className="text-sm">💗</span>
            </h1>
            {isPaired && partner ? (
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                {partner.avatar_url ? (
                  <img
                    src={partner.avatar_url}
                    alt={partner.display_name || 'Partner'}
                    className="w-4 h-4 rounded-full object-cover ring-1 ring-rose-400/60"
                  />
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPartnerOnline
                        ? 'bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-900 animate-pulse'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                )}
                <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px] sm:max-w-[180px]">
                  {partner.display_name || 'My Love'}
                </span>
                <span>•</span>
                <span className="text-slate-400">{isPartnerOnline ? 'online' : 'away'}</span>
              </div>
            ) : (
              <p className="text-xs text-rose-400 dark:text-rose-500 font-medium">Private Sanctuary</p>
            )}
          </div>
        </div>

        {/* Right: Quick Call Actions & Settings */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {isPaired && callState === 'idle' && (
            <>
              <button
                onClick={() => startCall({ isVideo: false })}
                className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 transition flex items-center gap-1.5 text-xs font-medium"
                title="Voice Call"
                aria-label="Start voice call"
              >
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">Call</span>
              </button>

              <button
                onClick={() => startCall({ isVideo: true })}
                className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-500/30 active:scale-95 transition flex items-center gap-1.5 text-xs font-medium"
                title="Video Call"
                aria-label="Start video call"
              >
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">Video</span>
              </button>
            </>
          )}

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-rose-100/60 dark:hover:bg-slate-800 transition"
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Settings Tab Toggle */}
          <button
            onClick={() => setCurrentTab('settings')}
            className={`p-2 rounded-full transition ${
              currentTab === 'settings'
                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300'
                : 'text-slate-600 dark:text-slate-300 hover:bg-rose-100/60 dark:hover:bg-slate-800'
            }`}
            title="Settings"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
