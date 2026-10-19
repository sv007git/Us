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
import { Heart, X } from 'lucide-react'

const AppContent = () => {
  const { user, loading: authLoading } = useAuth()
  const { isPaired, loading: coupleLoading } = useCouple()
  const { currentTheme } = useTheme()

  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof localStorage === 'undefined') return 'dashboard'
    return localStorage.getItem('just_you_me_active_tab') || 'dashboard'
  })

  const [notificationToast, setNotificationToast] = useState(null)

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && currentTab) {
      localStorage.setItem('just_you_me_active_tab', currentTab)
    }
  }, [currentTab])

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

  // Paired couple -> Main Application Experience
  return (
    <div className={`h-screen h-[100dvh] flex flex-col ${currentTheme.appBg} text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-hidden relative`}>
      {/* Top Navbar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* In-app Notification Banner Toast when message arrives while browsing another feature */}
      {notificationToast && (
        <div
          onClick={() => {
            setCurrentTab('chat')
            setNotificationToast(null)
          }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm p-3 rounded-2xl glass shadow-2xl border border-rose-300/80 dark:border-rose-800/80 flex items-center justify-between cursor-pointer animate-fade-in hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-2.5 truncate">
            {notificationToast.avatar ? (
              <img
                src={notificationToast.avatar}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-rose-400"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                💗
              </div>
            )}
            <div className="truncate">
              <span className="font-bold text-xs text-rose-600 dark:text-rose-400 block truncate">
                {notificationToast.title}
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300 block truncate">
                {notificationToast.content}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="text-[10px] font-semibold text-white bg-rose-500 px-2.5 py-0.5 rounded-full shadow-sm">
              Reply
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
          <MemoriesView />
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
