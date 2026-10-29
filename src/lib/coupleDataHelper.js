import { supabase } from './supabaseClient'

const withTimeout = (promise, ms = 2000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms)),
  ])
}

/**
 * Saves a couple system data object (birthdays, cycle, etc.) using multi-tier persistence:
 * 1. couple_spaces metadata in PostgreSQL
 * 2. love_notes persistent system record in PostgreSQL (resilient fallback if metadata column is missing)
 * 3. localStorage (instant offline and page reload cache)
 * 4. Realtime broadcast to partner via presenceChannel
 */
export const saveCoupleSystemData = async ({
  key, // 'birthdays' | 'cycle'
  data,
  coupleSpaceId,
  userId,
  updateCoupleSpace = null,
  presenceChannel = null,
}) => {
  if (!key || !data) return false

  // 1. Instant local cache for reload stability
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`just_you_me_${key}`, JSON.stringify(data))
      localStorage.setItem(`just_you_me_${key}_updated_at`, String(Date.now()))
    }
  } catch (e) {
    console.warn(`localStorage cache error for ${key}:`, e)
  }

  // 2. Realtime broadcast to partner
  try {
    if (presenceChannel) {
      presenceChannel.send({
        type: 'broadcast',
        event: `couple-${key}-updated`,
        payload: data,
      })
    }
  } catch (e) {
    console.warn(`Realtime broadcast error for ${key}:`, e)
  }

  // 3. Update coupleSpace metadata
  if (updateCoupleSpace) {
    try {
      await updateCoupleSpace({
        metadata: {
          [key]: data,
        },
      })
    } catch (e) {
      console.warn(`couple_spaces metadata update for ${key} failed, attempting love_notes fallback:`, e)
    }
  }

  // 4. Save to love_notes system record in PostgreSQL database
  if (supabase && coupleSpaceId && userId) {
    try {
      const systemTitle = `__SYSTEM_${key.toUpperCase()}__`
      const jsonContent = JSON.stringify(data)

      const queryExisting = async () => {
        return supabase
          .from('love_notes')
          .select('id')
          .eq('couple_space_id', coupleSpaceId)
          .eq('title', systemTitle)
          .maybeSingle()
      }

      const { data: existing } = await withTimeout(queryExisting(), 2000)

      if (existing?.id) {
        await withTimeout(
          supabase
            .from('love_notes')
            .update({
              content: jsonContent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id),
          2000
        )
      } else {
        await withTimeout(
          supabase.from('love_notes').insert({
            couple_space_id: coupleSpaceId,
            author_id: userId,
            title: systemTitle,
            content: jsonContent,
            color: 'rose',
            is_pinned: false,
          }),
          2000
        )
      }
    } catch (dbErr) {
      console.warn(`Database fallback save in love_notes for ${key}:`, dbErr.message || dbErr)
    }
  }

  return true
}

/**
 * Loads couple system data from:
 * 1. coupleSpace metadata
 * 2. love_notes persistent system record in PostgreSQL
 * 3. localStorage cache
 */
export const loadCoupleSystemData = async ({ key, coupleSpace, coupleSpaceId = null }) => {
  // 1. Check coupleSpace metadata
  if (coupleSpace?.metadata?.[key]) {
    return coupleSpace.metadata[key]
  }

  // 2. Check PostgreSQL love_notes table system row
  const spaceId = coupleSpaceId || coupleSpace?.id
  if (supabase && spaceId) {
    try {
      const systemTitle = `__SYSTEM_${key.toUpperCase()}__`
      const queryNote = async () => {
        return supabase
          .from('love_notes')
          .select('content')
          .eq('couple_space_id', spaceId)
          .eq('title', systemTitle)
          .maybeSingle()
      }

      const { data, error } = await withTimeout(queryNote(), 2000)

      if (!error && data?.content) {
        const parsed = JSON.parse(data.content)
        if (parsed && typeof parsed === 'object') {
          return parsed
        }
      }
    } catch (err) {
      console.warn(`Error querying love_notes for ${key}:`, err.message || err)
    }
  }

  // 3. Fallback to localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`just_you_me_${key}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed && typeof parsed === 'object') {
          return parsed
        }
      }
    }
  } catch (e) {
    console.warn(`Error reading localStorage for ${key}:`, e)
  }

  return null
}
