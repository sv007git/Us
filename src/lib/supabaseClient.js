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

const getCredentials = () => {
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
  const envKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY

  if (envUrl && envKey && !envUrl.includes('your-project-ref')) {
    return { url: envUrl.trim(), key: envKey.trim(), source: 'env' }
  }

  const localUrl = getStorageItem('just_you_me_supabase_url')
  const localKey = getStorageItem('just_you_me_supabase_key')

  if (localUrl && localKey) {
    return { url: localUrl.trim(), key: localKey.trim(), source: 'localStorage' }
  }

  return { url: '', key: '', source: 'none' }
}

export const { url: initialUrl, key: initialKey, source: credentialSource } = getCredentials()
export const isConfigured = Boolean(initialUrl && initialKey)

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
 * Saves runtime Supabase configuration to localStorage and reloads
 */
export const saveRuntimeConfig = (url, key) => {
  if (!url || !key) throw new Error('Both URL and Anon Key are required.')
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('just_you_me_supabase_url', url.trim())
    localStorage.setItem('just_you_me_supabase_key', key.trim())
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
