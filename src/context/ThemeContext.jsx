import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export const THEME_PALETTES = {
  blush: {
    name: 'Blush Pink',
    primary: 'from-rose-400 to-pink-500',
    accent: '#f43f5e',
  },
  rose: {
    name: 'Deep Rose',
    primary: 'from-pink-600 to-rose-700',
    accent: '#e11d48',
  },
  lavender: {
    name: 'Velvet Lavender',
    primary: 'from-purple-400 to-pink-400',
    accent: '#c084fc',
  },
  midnight: {
    name: 'Midnight Romance',
    primary: 'from-rose-500 to-purple-800',
    accent: '#fb7185',
  },
}

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('just_you_me_dark_mode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [palette, setPalette] = useState(() => {
    return localStorage.getItem('just_you_me_palette') || 'blush'
  })

  useEffect(() => {
    localStorage.setItem('just_you_me_dark_mode', String(isDarkMode))
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  useEffect(() => {
    localStorage.setItem('just_you_me_palette', palette)
  }, [palette])

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev)

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, palette, setPalette, THEME_PALETTES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
