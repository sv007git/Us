import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const fetchProfile = async (userId) => {
    if (!supabase || !userId) return null
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.warn('Could not fetch profile:', error)
      }

      if (data) {
        setProfile(data)
        return data
      }
    } catch (e) {
      console.warn('Fetch profile error:', e)
    }
    return null
  }

  useEffect(() => {
    if (!isConfigured || !supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user || null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    }).catch(err => {
      console.error('Session retrieval error:', err)
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user || null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const handleAuthError = (err) => {
    const msg = err?.message || String(err)
    if (msg.includes('Failed to fetch') || err?.name === 'TypeError') {
      return new Error(
        'Cannot connect to Supabase ("Failed to fetch"). Please check your Supabase Project URL in the Config dialog, verify it is in the format "https://<project-ref>.supabase.co" (not the dashboard URL), and ensure your Supabase project is unpaused.'
      )
    }
    return err
  }

  const signUp = async (email, password, displayName) => {
    if (!supabase) throw new Error('Supabase client is not configured')
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      })

      if (error) {
        throw error
      }

      if (data?.user) {
        // Upsert profile
        await supabase.from('profiles').upsert({
          id: data.user.id,
          display_name: displayName || email.split('@')[0],
        })
        await fetchProfile(data.user.id)
      }

      return data
    } catch (err) {
      const handled = handleAuthError(err)
      setAuthError(handled.message)
      throw handled
    }
  }

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase client is not configured')
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data?.user) {
        await fetchProfile(data.user.id)
      }

      return data
    } catch (err) {
      const handled = handleAuthError(err)
      setAuthError(handled.message)
      throw handled
    }
  }

  const signOut = async () => {
    if (!supabase) return
    setAuthError(null)
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const resetPassword = async (email) => {
    if (!supabase) throw new Error('Supabase client is not configured')
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href,
      })
      if (error) throw error
      return data
    } catch (err) {
      const handled = handleAuthError(err)
      setAuthError(handled.message)
      throw handled
    }
  }

  const updateProfile = async ({ displayName, avatarUrl, statusMood }) => {
    if (!supabase || !user) throw new Error('Not authenticated')
    const updates = {
      id: user.id,
      updated_at: new Date().toISOString(),
    }
    if (displayName !== undefined) updates.display_name = displayName
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl
    if (statusMood !== undefined) updates.status_mood = statusMood

    const { data, error } = await supabase
      .from('profiles')
      .upsert(updates)
      .select()
      .single()

    if (error) throw error
    setProfile(data)
    return data
  }

  const deleteAccount = async () => {
    if (!supabase || !user) throw new Error('Not authenticated')
    setAuthError(null)
    try {
      // 1. Try atomic database deletion procedure
      try {
        const { error: rpcError } = await supabase.rpc('delete_user_account')
        if (!rpcError) {
          await signOut()
          return { success: true }
        }
      } catch (e) {
        console.warn('RPC delete_user_account fallback:', e)
      }

      // 2. Direct cascading table deletion fallback
      await supabase.from('couple_members').delete().eq('user_id', user.id)
      await supabase.from('profiles').delete().eq('id', user.id)

      await signOut()
      return { success: true }
    } catch (err) {
      console.error('Delete account error:', err)
      const handled = handleAuthError(err)
      setAuthError(handled.message)
      throw handled
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        authError,
        isConfigured,
        signUp,
        signIn,
        signOut,
        deleteAccount,
        resetPassword,
        updateProfile,
        refreshProfile: () => user && fetchProfile(user.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
