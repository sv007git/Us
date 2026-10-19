import React, { useState, useEffect } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CoupleProvider, useCouple } from './context/CoupleContext'
import { CallProvider } from './context/CallContext'

import { Navbar } from './components/Navbar'
import { BottomNav } from './components/BottomNav'
import { AuthModal } from './components/Auth/AuthModal'
import { PairingScreen } from './components/Auth/PairingScreen'
import { ChatView } from './components/Chat/ChatView'
import { WatchRoom } from './components/WatchTogether/WatchRoom'
import { DashboardView } from './components/Dashboard/DashboardView'
import { MemoriesView } from './components/Memories/MemoriesView'
import { NotesView } from './components/Notes/NotesView'
import { SettingsView } from './components/Settings/SettingsView'
import { CallModal } from './components/Calling/CallModal'
import { Heart, X, Bell } from 'lucide-react'
import {
  getNotificationPermission,
  requestNotificationPermission,
  playNotificationSound,
} from './lib/notificationHelper'

const AppContent = () => {
  const { user, loading: authLoading } = useAuth()
  const { isPaired, partner, coupleSpace, loading: coupleLoading } = useCouple()
  const { currentTheme, palette, setPalette, isDarkMode, setIsDarkMode } = useTheme()

  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof localStorage === 'undefined') return 'dashboard'
    return localStorage.getItem('just_you_me_active_tab') || 'dashboard'
  })

  const [notificationToast, setNotificationToast] = useState(null)
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermission())
  const [isPromptDismissed, setIsPromptDismissed] = useState(false)

  // Synchronize theme universally across all devices from coupleSpace
  useEffect(() => {
    if (coupleSpace) {
      const spaceTheme = coupleSpace.theme_preference || coupleSpace.metadata?.palette
      if (spaceTheme && spaceTheme !== palette) {
        setPalette(spaceTheme)
      }
      if (
        coupleSpace.metadata?.darkMode !== undefined &&
        coupleSpace.metadata.darkMode !== isDarkMode
      ) {
        setIsDarkMode(coupleSpace.metadata.darkMode)
      }
    }
  }, [
    coupleSpace?.id,
    coupleSpace?.theme_preference,
    coupleSpace?.metadata?.palette,
    coupleSpace?.metadata?.darkMode,
  ])

  // Sync tab state to localStorage
  useEffect(() => {
    if (typeof localStorage !== 'undefined' && currentTab) {
      localStorage.setItem('just_you_me_active_tab', currentTab)
    }
  }, [currentTab])

  // Periodically and on interaction check if notifications are allowed
  useEffect(() => {
    const updatePerm = () => {
      setNotifPermission(getNotificationPermission())
    }
    updatePerm()

    // If permission has not been decided yet, prompt on first user touch/click
    const handleFirstClick = async () => {
      if (getNotificationPermission() === 'default') {
        const res = await requestNotificationPermission()
        setNotifPermission(res)
        if (res === 'granted') {
          playNotificationSound()
        }
      }
    }

    window.addEventListener('click', handleFirstClick, { once: true })
    return () => {
      window.removeEventListener('click', handleFirstClick)
    }
  }, [])

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission()
    setNotifPermission(res)
    if (res === 'granted') {
      playNotificationSound()
      setIsPromptDismissed(true)
    }
  }

  const handleShowToast = (toast) => {
    setNotificationToast(toast)
    setTimeout(() => {
      setNotificationToast((prev) => (prev === toast ? null : prev))
    }, 5000)
  }

  // Loading Screen (Only on initial cold boot)
  if (authLoading || (user && coupleLoading)) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${currentTheme.appBg} text-slate-700 dark:text-slate-200`}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 flex items-center justify-center shadow-xl shadow-rose-500/25 mb-4 animate-bounce">
          <Heart className="w-8 h-8 fill-current text-white animate-heartbeat" />
        </div>
        <h2 className="text-xl font-bold font-romantic text-rose-600 dark:text-rose-400">
          Just You & Me 💗
        </h2>
        <p className="text-xs text-slate-400 mt-1">Opening our sanctuary...</p>
      </div>
    )
  }

  // Unauthenticated -> Show Login & Sign Up
  if (!user) {
    return <AuthModal />
  }

  // Not yet paired with a partner -> Show Pairing / Invitation Screen
  if (!isPaired) {
    return <PairingScreen />
  }

  const isNotificationNeeded =
    notifPermission !== 'granted' && notifPermission !== 'unsupported' && !isPromptDismissed

  // Paired couple -> Main Application Experience
  return (
    <div className={`h-screen h-[100dvh] flex flex-col ${currentTheme.appBg} text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-hidden relative`}>
      {/* Top Navbar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Persistent Notification Enable Prompt Banner (Asks every time if not enabled) */}
      {isNotificationNeeded && (
        <div className={`w-full bg-gradient-to-r ${currentTheme.primary} text-white px-4 py-2.5 flex items-center justify-between text-xs shadow-md z-40 animate-fade-in`}>
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <Bell className="w-4 h-4 animate-bounce shrink-0" />
            <span className="truncate">
              <strong>Enable Notifications:</strong> Get alerted for incoming calls, partner messages, and memories!
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1 rounded-full bg-white text-slate-900 font-bold text-xs shadow hover:bg-slate-100 active:scale-95 transition"
            >
              Allow Notifications
            </button>
            <button
              type="button"
              onClick={() => setIsPromptDismissed(true)}
              className="p-1 hover:bg-white/20 rounded-full text-white/80 transition"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* In-app Notification Banner Toast when message or memory arrives while browsing another feature */}
      {notificationToast && (
        <div
          onClick={() => {
            setCurrentTab(notificationToast.tab || 'chat')
            setNotificationToast(null)
          }}
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm p-3 rounded-2xl glass shadow-2xl border ${currentTheme.border} flex items-center justify-between cursor-pointer animate-fade-in hover:scale-[1.02] transition-transform`}
        >
          <div className="flex items-center gap-2.5 truncate">
            {notificationToast.avatar ? (
              <img
                src={notificationToast.avatar}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/50"
              />
            ) : (
              <div className={`w-8 h-8 rounded-full ${currentTheme.badge} flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                💗
              </div>
            )}
            <div className="truncate">
              <span className={`font-bold text-xs ${currentTheme.activeText} block truncate`}>
                {notificationToast.title}
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300 block truncate">
                {notificationToast.content}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className={`text-[10px] font-semibold ${currentTheme.badge} px-2.5 py-0.5 rounded-full shadow-sm`}>
              View
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setNotificationToast(null)
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Tab View: Keeping views mounted preserves scroll, real-time message connection & eliminates reload flicker */}
      <main className="flex-1 flex flex-col min-h-0 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] overflow-hidden relative">
        <div className={`h-full w-full flex-col ${currentTab === 'dashboard' ? 'flex overflow-y-auto' : 'hidden'}`}>
          <DashboardView setCurrentTab={setCurrentTab} />
        </div>
        <div className={`h-full w-full flex-col ${currentTab === 'chat' ? 'flex overflow-hidden' : 'hidden'}`}>
          <ChatView currentTab={currentTab} onNavigate={setCurrentTab} onShowToast={handleShowToast} />
        </div>
        <div className={`h-full w-full flex-col ${currentTab === 'watch' ? 'flex overflow-y-auto' : 'hidden'}`}>
          <WatchRoom />
        </div>
        <div className={`h-full w-full flex-col ${currentTab === 'memories' ? 'flex overflow-y-auto' : 'hidden'}`}>
          <MemoriesView currentTab={currentTab} onNavigate={setCurrentTab} onShowToast={handleShowToast} />
        </div>
        <div className={`h-full w-full flex-col ${currentTab === 'notes' ? 'flex overflow-y-auto' : 'hidden'}`}>
          <NotesView />
        </div>
        <div className={`h-full w-full flex-col ${currentTab === 'settings' ? 'flex overflow-y-auto' : 'hidden'}`}>
          <SettingsView />
        </div>
      </main>

      {/* Mobile-first Bottom Navigation Bar */}
      <BottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* WebRTC Video & Voice Call Overlay */}
      <CallModal />
    </div>
  )
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CoupleProvider>
          <CallProvider>
            <AppContent />
          </CallProvider>
        </CoupleProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
