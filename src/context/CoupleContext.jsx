import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const CoupleContext = createContext(null)

// Generates a clean, user-friendly 8-character invitation code
export const generateRandomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const CoupleProvider = ({ children }) => {
  const { user } = useAuth()
  const [coupleSpace, setCoupleSpace] = useState(null)
  const [partner, setPartner] = useState(null)
  const [activeInvitation, setActiveInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPartnerOnline, setIsPartnerOnline] = useState(false)
  const [partnerLastSeen, setPartnerLastSeen] = useState(null)
  const [presenceChannel, setPresenceChannel] = useState(null)
  const hasInitializedRef = useRef(false)

  const fetchCoupleData = useCallback(async (isSilent = false) => {
    if (!supabase || !user?.id) {
      setCoupleSpace(null)
      setPartner(null)
      setLoading(false)
      return
    }

    try {
      if (!hasInitializedRef.current && !isSilent) {
        setLoading(true)
      }

      // 1. Get user's couple membership
      const { data: memberData, error: memberError } = await supabase
        .from('couple_members')
        .select('couple_space_id, role, joined_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (memberError && memberError.code !== 'PGRST116') {
        console.warn('Error fetching couple membership:', memberError)
      }

      if (!memberData) {
        setCoupleSpace(null)
        setPartner(null)
        setLoading(false)
        return
      }

      const spaceId = memberData.couple_space_id

      // 2. Fetch Couple Space Details
      const { data: spaceData, error: spaceError } = await supabase
        .from('couple_spaces')
        .select('*')
        .eq('id', spaceId)
        .single()

      if (spaceError) {
        console.error('Error fetching couple space:', spaceError)
      } else {
        setCoupleSpace(spaceData)
      }

      // 3. Fetch Partner's Membership & Profile
      const { data: partnerMember, error: partnerError } = await supabase
        .from('couple_members')
        .select('user_id, role, joined_at')
        .eq('couple_space_id', spaceId)
        .neq('user_id', user.id)
        .maybeSingle()

      if (partnerMember) {
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', partnerMember.user_id)
          .single()

        setPartner(partnerProfile || { id: partnerMember.user_id, display_name: 'Partner' })
      } else {
        setPartner(null)

        // 4. If no partner yet, fetch active invitation
        const { data: inviteData } = await supabase
          .from('invitations')
          .select('*')
          .eq('couple_space_id', spaceId)
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        setActiveInvitation(inviteData || null)
      }
    } catch (err) {
      console.error('Error loading couple data:', err)
    } finally {
      hasInitializedRef.current = true
      setLoading(false)
    }
  }, [user?.id])

  const refreshCouple = useCallback(() => {
    return fetchCoupleData(true)
  }, [fetchCoupleData])

  useEffect(() => {
    fetchCoupleData(false)
  }, [fetchCoupleData])

  // Realtime Presence tracking for the couple space
  useEffect(() => {
    if (!supabase || !coupleSpace || !user) return

    const channel = supabase.channel(`presence_${coupleSpace.id}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const userIds = Object.keys(state)
        const partnerIsPresent = partner ? userIds.includes(partner.id) : false
        setIsPartnerOnline(partnerIsPresent)
        if (partnerIsPresent) {
          setPartnerLastSeen(new Date())
        }
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (partner && key === partner.id) {
          setIsPartnerOnline(true)
          setPartnerLastSeen(new Date())
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (partner && key === partner.id) {
          setIsPartnerOnline(false)
          setPartnerLastSeen(new Date())
        }
      })
      .on('broadcast', { event: 'partner-profile-updated' }, ({ payload }) => {
        if (payload && (payload.userId === partner?.id || payload.userId !== user.id)) {
          setPartner((prev) => ({
            ...(prev || {}),
            ...(payload.profile || {}),
            status_mood: payload.statusMood || payload.profile?.status_mood || prev?.status_mood,
            display_name: payload.displayName || payload.profile?.display_name || prev?.display_name,
            avatar_url: payload.avatarUrl || payload.profile?.avatar_url || prev?.avatar_url,
          }))
        }
      })
      .on('broadcast', { event: 'couple-theme-updated' }, ({ payload }) => {
        if (payload) {
          setCoupleSpace((prev) => ({
            ...(prev || {}),
            theme_preference: payload.palette || prev?.theme_preference,
            metadata: {
              ...(prev?.metadata || {}),
              palette: payload.palette || prev?.metadata?.palette,
              darkMode: payload.isDarkMode !== undefined ? payload.isDarkMode : prev?.metadata?.darkMode,
            },
          }))
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            onlineAt: new Date().toISOString(),
          })
        }
      })

    setPresenceChannel(channel)

    return () => {
      channel.unsubscribe()
    }
  }, [coupleSpace?.id, user?.id, partner?.id])

  // Listen to live Postgres changes on partner's profile
  useEffect(() => {
    if (!supabase || !partner?.id) return

    const profileChannel = supabase
      .channel(`partner_profile_changes_${partner.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${partner.id}`,
        },
        (payload) => {
          if (payload.new) {
            setPartner((prev) => ({
              ...(prev || {}),
              ...payload.new,
            }))
          }
        }
      )
      .subscribe()

    return () => {
      profileChannel.unsubscribe()
    }
  }, [partner?.id])

  // Listen to live Postgres changes on couple_spaces (for theme and space updates)
  useEffect(() => {
    if (!supabase || !coupleSpace?.id) return

    const spaceChannel = supabase
      .channel(`space_changes_${coupleSpace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'couple_spaces',
          filter: `id=eq.${coupleSpace.id}`,
        },
        (payload) => {
          if (payload.new) {
            setCoupleSpace(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      spaceChannel.unsubscribe()
    }
  }, [coupleSpace?.id])

  /**
   * Creates a new couple space and an initial invitation code
   */
  const createCoupleSpace = async ({ name = 'Just You & Me', anniversaryDate = null, welcomeMessage = 'Forever & always 💗' }) => {
    if (!supabase || !user) throw new Error('Not authenticated')

    // 1. Try atomic stored procedure first
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_couple_space', {
        p_name: name,
        p_anniversary_date: anniversaryDate || null,
        p_welcome_message: welcomeMessage,
      })

      if (!rpcError && rpcData?.space) {
        setCoupleSpace(rpcData.space)
        setActiveInvitation(rpcData.invitation)
        return { space: rpcData.space, invitation: rpcData.invitation }
      }
    } catch (e) {
      console.warn('RPC create_couple_space fallback:', e)
    }

    // 2. Fallback to direct client insert
    const { data: space, error: spaceError } = await supabase
      .from('couple_spaces')
      .insert({
        name,
        anniversary_date: anniversaryDate,
        welcome_message: welcomeMessage,
        created_by: user.id,
      })
      .select()
      .single()

    if (spaceError) throw spaceError

    // Add creator as first member
    const { error: memberError } = await supabase.from('couple_members').insert({
      couple_space_id: space.id,
      user_id: user.id,
      role: 'creator',
    })

    if (memberError) console.warn('Member insertion warning:', memberError)

    // Create initial 7-day invitation code
    const code = generateRandomCode()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        couple_space_id: space.id,
        code,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (inviteError) console.warn('Invitation creation error:', inviteError)

    setCoupleSpace(space)
    setActiveInvitation(invitation)
    return { space, invitation }
  }

  /**
   * Joins an existing couple space using an invitation code
   */
  const joinCoupleSpace = async (inviteCode) => {
    if (!supabase || !user) throw new Error('Not authenticated')
    const cleanCode = inviteCode.trim().toUpperCase()

    // Call stored procedure
    const { data, error } = await supabase.rpc('accept_invitation', {
      invite_code: cleanCode,
    })

    if (error) {
      throw new Error(error.message || 'Invalid or expired invitation code.')
    }

    await fetchCoupleData()
    return data
  }

  /**
   * Generates a new invitation code for this couple space
   */
  const generateNewInvitation = async () => {
    if (!supabase || !coupleSpace || !user) throw new Error('No active couple space')

    const code = generateRandomCode()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        couple_space_id: coupleSpace.id,
        code,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) throw error
    setActiveInvitation(data)
    return data
  }

  /**
   * Updates couple space preferences
   */
  const updateCoupleSpace = async (updates) => {
    if (!supabase || !coupleSpace) throw new Error('No couple space found')

    // Optimistically update local state so UI is instantly in sync
    setCoupleSpace((prev) => ({
      ...(prev || {}),
      ...updates,
      metadata: {
        ...(prev?.metadata || {}),
        ...(updates.metadata || {}),
      },
    }))

    try {
      const { data, error } = await supabase
        .from('couple_spaces')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', coupleSpace.id)
        .select()
        .single()

      if (error) {
        // Fallback: If column theme_preference doesn't exist, omit it and put in metadata
        if (updates.theme_preference && (error.code === '42703' || error.message?.includes('theme_preference'))) {
          const { theme_preference, ...rest } = updates
          const safeMetadata = {
            ...(coupleSpace.metadata || {}),
            palette: theme_preference,
            ...(updates.metadata || {}),
          }
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('couple_spaces')
            .update({
              ...rest,
              metadata: safeMetadata,
              updated_at: new Date().toISOString(),
            })
            .eq('id', coupleSpace.id)
            .select()
            .single()

          if (fallbackError) throw fallbackError
          setCoupleSpace(fallbackData)
          return fallbackData
        }
        throw error
      }

      setCoupleSpace(data)
      return data
    } catch (err) {
      console.warn('updateCoupleSpace network/persistence warning:', err)
      return { ...coupleSpace, ...updates }
    }
  }

  return (
    <CoupleContext.Provider
      value={{
        coupleSpace,
        partner,
        activeInvitation,
        loading,
        isPartnerOnline,
        partnerLastSeen,
        isPaired: Boolean(coupleSpace && partner),
        hasSpace: Boolean(coupleSpace),
        createCoupleSpace,
        joinCoupleSpace,
        generateNewInvitation,
        updateCoupleSpace,
        refreshCouple,
        presenceChannel,
      }}
    >
      {children}
    </CoupleContext.Provider>
  )
}

export const useCouple = () => {
  const context = useContext(CoupleContext)
  if (!context) throw new Error('useCouple must be used within CoupleProvider')
  return context
}
