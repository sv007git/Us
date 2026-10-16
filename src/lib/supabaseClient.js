import { createClient } from '@supabase/supabase-js'

// Safe accessor for localStorage across browser and test environments
const getStorageItem = (key) => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }
  return null
}

/**
 * Normalizes and validates Supabase Project URL.
 * Automatically handles common user mistakes, such as:
 * - Pasting the dashboard URL: https://supabase.com/dashboard/project/abcdefgh -> https://abcdefgh.supabase.co
 * - Missing https://
 * - Trailing slashes
 */
export const formatSupabaseUrl = (rawUrl) => {
  if (!rawUrl || !rawUrl.trim()) return ''
  let url = rawUrl.trim()

  // Auto-convert dashboard URL to actual API URL
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/)
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }

  // Remove trailing slashes
  return url.replace(/\/+$/, '')
}

export const DEFAULT_SUPABASE_URL = 'https://pndjoveekfntcbskwbwq.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuZGpvdmVla2ZudGNic2t3YndxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzQzMzgsImV4cCI6MjEwNzcxMDMzOH0.wW31zvnYkcBbkFUtcasF1Z8eLzg5mlWBX2c8CZU4iGo'

const getCredentials = () => {
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
  const envKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY

  if (envUrl && envKey && !envUrl.includes('your-project-ref')) {
    return { url: formatSupabaseUrl(envUrl), key: envKey.trim(), source: 'env' }
  }

  const localUrl = getStorageItem('just_you_me_supabase_url')
  const localKey = getStorageItem('just_you_me_supabase_key')

  if (localUrl && localKey) {
    return { url: formatSupabaseUrl(localUrl), key: localKey.trim(), source: 'localStorage' }
  }

  // Pre-configured default credentials — zero setup required for the couple
  if (DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_ANON_KEY) {
    return { url: formatSupabaseUrl(DEFAULT_SUPABASE_URL), key: DEFAULT_SUPABASE_ANON_KEY.trim(), source: 'default' }
  }

  return { url: '', key: '', source: 'none' }
}

export const { url: initialUrl, key: initialKey, source: credentialSource } = getCredentials()
export const isConfigured = Boolean(initialUrl && initialKey)

// Polyfill WebSocket in Node headless environments (tests / CI) if native WebSocket is absent
if (typeof window === 'undefined' && typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class MockWebSocket {
    constructor(url) {
      this.url = url
      this.readyState = 0
    }
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  }
}

// Create Supabase client singleton
export const supabase = isConfigured
  ? createClient(initialUrl, initialKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'just_you_me_auth_token',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

/**
 * Tests connection to the provided Supabase URL and key
 */
export const testSupabaseConnection = async (testUrl, testKey) => {
  const formatted = formatSupabaseUrl(testUrl)
  if (!formatted) throw new Error('Supabase URL is required.')
  if (!testKey || testKey.trim().length < 20) throw new Error('A valid Supabase anon public key is required.')

  try {
    const res = await fetch(`${formatted}/auth/v1/settings`, {
      headers: {
        apikey: testKey.trim(),
      },
    })

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Project reached, but anon key was rejected. Please verify your anon key.')
      }
      throw new Error(`Supabase returned HTTP status ${res.status}.`)
    }

    return { success: true, formattedUrl: formatted }
  } catch (err) {
    if (err.message && !err.message.includes('Failed to fetch')) {
      throw err
    }
    throw new Error(
      `Cannot connect to "${formatted}". Please verify the project URL, ensure your Supabase project is not paused, and check your internet connection.`
    )
  }
}

/**
 * Saves runtime Supabase configuration to localStorage and reloads
 */
export const saveRuntimeConfig = (url, key) => {
  if (!url || !key) throw new Error('Both URL and Anon Key are required.')
  const cleanedUrl = formatSupabaseUrl(url)
  const cleanedKey = key.trim()

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('just_you_me_supabase_url', cleanedUrl)
    localStorage.setItem('just_you_me_supabase_key', cleanedKey)
  }
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

/**
 * Clears runtime credentials from localStorage
 */
export const clearRuntimeConfig = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('just_you_me_supabase_url')
    localStorage.removeItem('just_you_me_supabase_key')
  }
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}
