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

      // Supabase returns identities: [] when the user already exists in auth.users
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0 && !data?.session) {
        throw new Error('An account with this email already exists. Please switch to "Sign In" with your password.')
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
      const currentUserId = user.id

      // 1. Find user's couple membership & space ID before deleting
      let spaceId = null
      try {
        const { data: memberData } = await supabase
          .from('couple_members')
          .select('couple_space_id')
          .eq('user_id', currentUserId)
          .maybeSingle()
        if (memberData?.couple_space_id) {
          spaceId = memberData.couple_space_id
        }
      } catch (e) {
        console.warn('Error fetching membership during deletion:', e)
      }

      // 2. Try the server-side atomic deletion RPC
      let rpcSucceeded = false
      try {
        const { error: rpcError } = await supabase.rpc('delete_user_account')
        if (!rpcError) {
          rpcSucceeded = true
        } else {
          console.warn('RPC delete_user_account returned error, falling back to direct table wipe:', rpcError)
        }
      } catch (e) {
        console.warn('RPC delete_user_account call failed:', e)
      }

      // 3. Fallback direct table wipe (wipes all couple data, messages, notes, and profile)
      if (!rpcSucceeded) {
        if (spaceId) {
          await Promise.allSettled([
            supabase.from('messages').delete().eq('couple_space_id', spaceId),
            supabase.from('memories').delete().eq('couple_space_id', spaceId),
            supabase.from('love_notes').delete().eq('couple_space_id', spaceId),
            supabase.from('watch_sessions').delete().eq('couple_space_id', spaceId),
            supabase.from('invitations').delete().eq('couple_space_id', spaceId),
          ])

          await supabase.from('couple_members').delete().eq('couple_space_id', spaceId)
          await supabase.from('couple_spaces').delete().eq('id', spaceId)
        }

        await Promise.allSettled([
          supabase.from('couple_members').delete().eq('user_id', currentUserId),
          supabase.from('couple_spaces').delete().eq('created_by', currentUserId),
          supabase.from('profiles').delete().eq('id', currentUserId),
        ])
      }

      // 4. Wipe local storage auth tokens & cached states
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('just_you_me_auth_token')
          localStorage.removeItem('just_you_me_turn_config')
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear()
        }
      } catch (e) {
        console.warn('Storage cleanup error:', e)
      }

      // 5. Sign out of Supabase Auth
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch (e) {
        await signOut()
      }

      setUser(null)
      setSession(null)
      setProfile(null)

      return { success: true, rpcExecuted: rpcSucceeded }
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
