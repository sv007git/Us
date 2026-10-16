import { supabase } from './supabaseClient'

export const MAX_FILE_SIZES = {
  image: 15 * 1024 * 1024, // 15MB
  audio: 25 * 1024 * 1024, // 25MB
  video: 50 * 1024 * 1024, // 50MB
  document: 25 * 1024 * 1024, // 25MB
}

export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  audio: ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/aac'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
}

/**
 * Validates a file before upload
 */
export const validateFile = (file, expectedCategory = null) => {
  if (!file) throw new Error('No file provided')

  let category = expectedCategory
  if (!category) {
    if (file.type.startsWith('image/')) category = 'image'
    else if (file.type.startsWith('audio/')) category = 'audio'
    else if (file.type.startsWith('video/')) category = 'video'
    else category = 'document'
  }

  const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.document
  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024))
    throw new Error(`File is too large. Maximum size for ${category} is ${maxMb}MB.`)
  }

  const allowed = ALLOWED_MIME_TYPES[category]
  if (allowed && !allowed.includes(file.type)) {
    throw new Error(`Unsupported file format: ${file.type}. Allowed formats: ${allowed.join(', ')}`)
  }

  return { isValid: true, category }
}

/**
 * Uploads a file to the private couple-media Supabase Storage bucket
 * Path format: <couple_space_id>/<category>/<timestamp>-<sanitized_name>
 */
export const uploadCoupleMedia = async ({
  coupleSpaceId,
  file,
  category = 'media',
  onProgress = null,
}) => {
  if (!supabase) throw new Error('Supabase client is not configured')
  if (!coupleSpaceId) throw new Error('Couple space ID is required')

  const { category: validatedCategory } = validateFile(file, category)
  
  const timestamp = Date.now()
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${coupleSpaceId}/${validatedCategory}/${timestamp}_${cleanName}`

  const { data, error } = await supabase.storage
    .from('couple-media')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(error.message || 'Failed to upload media')
  }

  // Generate an initial signed URL valid for 24 hours (86400 seconds)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('couple-media')
    .createSignedUrl(storagePath, 86400)

  if (signedError) {
    console.error('Signed URL error:', signedError)
  }

  return {
    path: storagePath,
    signedUrl: signedData?.signedUrl || '',
    name: file.name,
    size: file.size,
    type: file.type,
    category: validatedCategory,
  }
}

/**
 * Creates or refreshes a signed URL for a private storage path
 */
export const getSignedMediaUrl = async (path, expiresInSeconds = 3600) => {
  if (!supabase || !path) return ''
  
  // If already a signed URL or external URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  try {
    const { data, error } = await supabase.storage
      .from('couple-media')
      .createSignedUrl(path, expiresInSeconds)

    if (error) {
      console.warn('Could not generate signed URL for path:', path, error)
      return ''
    }

    return data.signedUrl
  } catch (err) {
    console.warn('Error creating signed URL:', err)
    return ''
  }
}
