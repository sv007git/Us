import { supabase } from './supabaseClient'

export const MAX_FILE_SIZES = {
  image: 15 * 1024 * 1024, // 15MB
  audio: 25 * 1024 * 1024, // 25MB
  video: 50 * 1024 * 1024, // 50MB
  document: 25 * 1024 * 1024, // 25MB
}

export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  audio: [
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/mpeg',
    'audio/aac',
    'audio/m4a',
    'audio/x-m4a',
    'audio/mp3',
    'audio/3gpp',
    'audio/x-wav',
    'audio/wave',
    'audio/opus',
  ],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-m4v'],
}

/**
 * Validates a file before upload
 */
export const validateFile = (file, expectedCategory = null) => {
  if (!file) throw new Error('No file provided')

  let category = expectedCategory
  if (!category) {
    if (file.type?.startsWith('image/')) category = 'image'
    else if (file.type?.startsWith('audio/')) category = 'audio'
    else if (file.type?.startsWith('video/')) category = 'video'
    else category = 'document'
  }

  const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.document
  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024))
    throw new Error(`File is too large. Maximum size for ${category} is ${maxMb}MB.`)
  }

  const baseMime = (file.type || '').split(';')[0].trim().toLowerCase()
  const allowed = ALLOWED_MIME_TYPES[category]
  if (allowed && baseMime) {
    const isAllowed = allowed.includes(baseMime) || (category === 'audio' && baseMime.startsWith('audio/'))
    if (!isAllowed) {
      throw new Error(`Unsupported file format: ${file.type}. Allowed formats: ${allowed.join(', ')}`)
    }
  }

  return { isValid: true, category }
}

/**
 * Client-side image compression & downscaling before upload.
 * Reduces 5MB-20MB smartphone photos to crisp ~150-300KB JPEGs.
 */
export const compressImage = async (
  file,
  {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    mimeType = 'image/jpeg',
  } = {}
) => {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif') {
    return file
  }

  // Gracefully return original file if running outside browser (e.g. Node vitest)
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof Image === 'undefined') {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (mimeType === 'image/jpeg') {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, width, height)
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file)
              return
            }
            const baseName = file.name.replace(/\.[^/.]+$/, '')
            const ext = mimeType === 'image/webp' ? '.webp' : '.jpg'
            const compressedFile = new File([blob], `${baseName}${ext}`, {
              type: mimeType,
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          mimeType,
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target.result
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
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

  const baseMime = (file.type || '').split(';')[0].trim().toLowerCase()
  const { data, error } = await supabase.storage
    .from('couple-media')
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: baseMime || undefined,
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
 * Deletes a file from the private couple-media Supabase Storage bucket
 */
export const deleteCoupleMedia = async (path) => {
  if (!supabase || !path) return false
  // Clean path in case it's a signed URL
  let cleanPath = path
  if (path.includes('/couple-media/')) {
    cleanPath = path.split('/couple-media/')[1]?.split('?')[0] || path
  }
  try {
    const { error } = await supabase.storage.from('couple-media').remove([cleanPath])
    if (error) {
      console.warn('Storage delete warning:', error)
      return false
    }
    return true
  } catch (err) {
    console.warn('Storage delete error:', err)
    return false
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
