import React from 'react'
import { MessageCircle, Film, Image as ImageIcon, HeartHandshake, Home } from 'lucide-react'

export const BottomNav = ({ currentTab, setCurrentTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'watch', label: 'Watch', icon: Film },
    { id: 'memories', label: 'Memories', icon: ImageIcon },
    { id: 'notes', label: 'Notes', icon: HeartHandshake },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass safe-bottom border-t border-rose-200/50 dark:border-rose-900/30 transition-colors duration-200">
      <div className="max-w-md mx-auto px-2 h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all duration-200 ${
                isActive
                  ? 'text-rose-600 dark:text-rose-400 font-semibold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
