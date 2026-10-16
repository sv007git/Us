import React, { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
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
import { Heart } from 'lucide-react'

const AppContent = () => {
  const { user, loading: authLoading } = useAuth()
  const { isPaired, loading: coupleLoading } = useCouple()
  const [currentTab, setCurrentTab] = useState('dashboard') // 'dashboard', 'chat', 'watch', 'memories', 'notes', 'settings'

  // Loading Screen
  if (authLoading || (user && coupleLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-rose-50 dark:bg-midnight-950 text-slate-700 dark:text-slate-200">
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
    <div className="h-screen h-[100dvh] flex flex-col bg-rose-50/40 dark:bg-midnight-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-hidden">
      {/* Top Navbar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Tab View */}
      <main className={`flex-1 flex flex-col min-h-0 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] ${currentTab === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {currentTab === 'dashboard' && <DashboardView setCurrentTab={setCurrentTab} />}
        {currentTab === 'chat' && <ChatView />}
        {currentTab === 'watch' && <WatchRoom />}
        {currentTab === 'memories' && <MemoriesView />}
        {currentTab === 'notes' && <NotesView />}
        {currentTab === 'settings' && <SettingsView />}
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
