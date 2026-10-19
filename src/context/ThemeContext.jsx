import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export const THEME_PALETTES = {
  blush: {
    name: 'Blush Pink',
    primary: 'from-rose-500 to-pink-500',
    accent: '#f43f5e',
    appBg: 'bg-gradient-to-br from-rose-50/70 via-pink-50/50 to-purple-50/40 dark:from-midnight-950 dark:via-midnight-900 dark:to-midnight-950',
    cardBg: 'bg-white/80 dark:bg-midnight-900/80',
    border: 'border-rose-200/60 dark:border-rose-900/40',
    borderLight: 'border-rose-100 dark:border-rose-950/40',
    activeText: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-500 text-white',
    buttonGrad: 'bg-gradient-to-r from-rose-500 to-pink-600',
    softBg: 'bg-rose-50 dark:bg-rose-950/40',
    softHover: 'hover:bg-rose-100 dark:hover:bg-rose-900/60',
    shadow: 'shadow-rose-500/20',
    ring: 'focus:ring-rose-400',
    themeColorLight: '#fff1f2',
    themeColorDark: '#0f172a',
    preview: ['#f43f5e', '#ec4899', '#fda4af'],
  },
  rose: {
    name: 'Deep Velvet Rose',
    primary: 'from-pink-600 to-rose-700',
    accent: '#e11d48',
    appBg: 'bg-gradient-to-br from-red-50/80 via-rose-50/60 to-pink-100/50 dark:from-[#180a12] dark:via-[#12050d] dark:to-[#180a12]',
    cardBg: 'bg-white/85 dark:bg-[#1a0c14]/85',
    border: 'border-pink-300/60 dark:border-pink-900/40',
    borderLight: 'border-pink-100 dark:border-pink-950/40',
    activeText: 'text-rose-700 dark:text-rose-400',
    badge: 'bg-rose-600 text-white',
    buttonGrad: 'bg-gradient-to-r from-pink-600 to-rose-700',
    softBg: 'bg-pink-50 dark:bg-pink-950/40',
    softHover: 'hover:bg-pink-100 dark:hover:bg-pink-900/60',
    shadow: 'shadow-pink-600/20',
    ring: 'focus:ring-pink-500',
    themeColorLight: '#ffe4e6',
    themeColorDark: '#180a12',
    preview: ['#e11d48', '#be123c', '#fb7185'],
  },
  lavender: {
    name: 'Velvet Lavender',
    primary: 'from-purple-500 to-pink-500',
    accent: '#a855f7',
    appBg: 'bg-gradient-to-br from-purple-50/80 via-fuchsia-50/50 to-pink-50/40 dark:from-[#130a1c] dark:via-[#0e0716] dark:to-[#130a1c]',
    cardBg: 'bg-white/85 dark:bg-[#150b20]/85',
    border: 'border-purple-200/60 dark:border-purple-900/40',
    borderLight: 'border-purple-100 dark:border-purple-950/40',
    activeText: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-500 text-white',
    buttonGrad: 'bg-gradient-to-r from-purple-500 to-pink-500',
    softBg: 'bg-purple-50 dark:bg-purple-950/40',
    softHover: 'hover:bg-purple-100 dark:hover:bg-purple-900/60',
    shadow: 'shadow-purple-500/20',
    ring: 'focus:ring-purple-400',
    themeColorLight: '#f3e8ff',
    themeColorDark: '#130a1c',
    preview: ['#a855f7', '#d946ef', '#e9d5ff'],
  },
  midnight: {
    name: 'Starry Midnight',
    primary: 'from-indigo-600 to-pink-600',
    accent: '#6366f1',
    appBg: 'bg-gradient-to-br from-indigo-50/70 via-slate-50 to-pink-50/40 dark:from-[#0b0f19] dark:via-[#070a12] dark:to-[#0b0f19]',
    cardBg: 'bg-white/85 dark:bg-[#0f1422]/85',
    border: 'border-indigo-200/60 dark:border-indigo-900/40',
    borderLight: 'border-indigo-100 dark:border-indigo-950/40',
    activeText: 'text-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-600 text-white',
    buttonGrad: 'bg-gradient-to-r from-indigo-600 to-pink-600',
    softBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    softHover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/60',
    shadow: 'shadow-indigo-600/20',
    ring: 'focus:ring-indigo-400',
    themeColorLight: '#eef2ff',
    themeColorDark: '#0b0f19',
    preview: ['#6366f1', '#4338ca', '#a5b4fc'],
  },
  sunset: {
    name: 'Sunset Glow & Peach',
    primary: 'from-amber-500 to-rose-500',
    accent: '#f97316',
    appBg: 'bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-rose-50/40 dark:from-[#1c1008] dark:via-[#140b05] dark:to-[#1c1008]',
    cardBg: 'bg-white/85 dark:bg-[#20130a]/85',
    border: 'border-amber-200/60 dark:border-amber-900/40',
    borderLight: 'border-amber-100 dark:border-amber-950/40',
    activeText: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500 text-white',
    buttonGrad: 'bg-gradient-to-r from-amber-500 to-rose-500',
    softBg: 'bg-amber-50 dark:bg-amber-950/40',
    softHover: 'hover:bg-amber-100 dark:hover:bg-amber-900/60',
    shadow: 'shadow-orange-500/20',
    ring: 'focus:ring-amber-400',
    themeColorLight: '#ffedd5',
    themeColorDark: '#1c1008',
    preview: ['#f97316', '#f59e0b', '#fed7aa'],
  },
  ocean: {
    name: 'Ocean Breeze & Teal',
    primary: 'from-cyan-500 to-teal-500',
    accent: '#06b6d4',
    appBg: 'bg-gradient-to-br from-cyan-50/80 via-teal-50/50 to-blue-50/40 dark:from-[#06141a] dark:via-[#040e13] dark:to-[#06141a]',
    cardBg: 'bg-white/85 dark:bg-[#07171e]/85',
    border: 'border-cyan-200/60 dark:border-cyan-900/40',
    borderLight: 'border-cyan-100 dark:border-cyan-950/40',
    activeText: 'text-cyan-600 dark:text-cyan-400',
    badge: 'bg-cyan-500 text-white',
    buttonGrad: 'bg-gradient-to-r from-cyan-500 to-teal-500',
    softBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    softHover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/60',
    shadow: 'shadow-cyan-500/20',
    ring: 'focus:ring-cyan-400',
    themeColorLight: '#cffafe',
    themeColorDark: '#06141a',
    preview: ['#06b6d4', '#14b8a6', '#a5f3fc'],
  },
  emerald: {
    name: 'Emerald Garden & Mint',
    primary: 'from-emerald-500 to-teal-600',
    accent: '#10b981',
    appBg: 'bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-slate-50/40 dark:from-[#071710] dark:via-[#04100b] dark:to-[#071710]',
    cardBg: 'bg-white/85 dark:bg-[#081a12]/85',
    border: 'border-emerald-200/60 dark:border-emerald-900/40',
    borderLight: 'border-emerald-100 dark:border-emerald-950/40',
    activeText: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500 text-white',
    buttonGrad: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    softBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    softHover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
    shadow: 'shadow-emerald-500/20',
    ring: 'focus:ring-emerald-400',
    themeColorLight: '#d1fae5',
    themeColorDark: '#071710',
    preview: ['#10b981', '#059669', '#a7f3d0'],
  },
}

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    const saved = localStorage.getItem('just_you_me_dark_mode')
    if (saved !== null) return saved === 'true'
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [palette, setPalette] = useState(() => {
    if (typeof localStorage === 'undefined') return 'blush'
    return localStorage.getItem('just_you_me_palette') || 'blush'
  })

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('just_you_me_dark_mode', String(isDarkMode))
    }
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [isDarkMode])

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('just_you_me_palette', palette)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', palette)
    }
  }, [palette])

  const currentTheme = THEME_PALETTES[palette] || THEME_PALETTES.blush

  // Dynamic Chrome Mobile & Browser Address Bar Color Sync
  useEffect(() => {
    if (typeof document === 'undefined') return
    const themeColor = isDarkMode ? currentTheme.themeColorDark : currentTheme.themeColorLight
    if (!themeColor) return

    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', themeColor)
  }, [isDarkMode, palette, currentTheme])

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev)

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        setIsDarkMode,
        toggleDarkMode,
        palette,
        setPalette,
        THEME_PALETTES,
        currentTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
