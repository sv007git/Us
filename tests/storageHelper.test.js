import { describe, it, expect } from 'vitest'
import { validateFile, MAX_FILE_SIZES, ALLOWED_MIME_TYPES } from '../src/lib/storageHelper'

describe('Private Storage & Media Validation', () => {
  it('allows valid image within size limit', () => {
    const mockImage = {
      name: 'sunset.jpg',
      type: 'image/jpeg',
      size: 5 * 1024 * 1024, // 5MB
    }
    const result = validateFile(mockImage)
    expect(result.isValid).toBe(true)
    expect(result.category).toBe('image')
  })

  it('rejects oversized image (> 15MB)', () => {
    const hugeImage = {
      name: 'massive.png',
      type: 'image/png',
      size: 20 * 1024 * 1024, // 20MB
    }
    expect(() => validateFile(hugeImage)).toThrow(/too large/)
  })

  it('allows video under 50MB limit', () => {
    const validVideo = {
      name: 'vacation.mp4',
      type: 'video/mp4',
      size: 30 * 1024 * 1024, // 30MB
    }
    const result = validateFile(validVideo)
    expect(result.isValid).toBe(true)
    expect(result.category).toBe('video')
  })

  it('rejects video exceeding 50MB limit', () => {
    const oversizedVideo = {
      name: 'movie.mp4',
      type: 'video/mp4',
      size: 55 * 1024 * 1024, // 55MB
    }
    expect(() => validateFile(oversizedVideo)).toThrow(/too large/i)
  })

  it('rejects forbidden/dangerous file types', () => {
    const executable = {
      name: 'malware.exe',
      type: 'application/x-msdownload',
      size: 1024,
    }
    expect(() => validateFile(executable, 'image')).toThrow(/unsupported file format/i)
  })

  it('accepts browser voice notes with codec parameters (audio/webm;codecs=opus)', () => {
    const voiceNote = {
      name: 'voice_note_123.webm',
      type: 'audio/webm;codecs=opus',
      size: 250 * 1024, // 250KB
    }
    const result = validateFile(voiceNote, 'audio')
    expect(result.isValid).toBe(true)
    expect(result.category).toBe('audio')
  })

  it('accepts mobile and alternative audio formats (audio/ogg, audio/mp4, audio/m4a)', () => {
    const m4aAudio = {
      name: 'note.m4a',
      type: 'audio/m4a',
      size: 500 * 1024,
    }
    const result = validateFile(m4aAudio, 'audio')
    expect(result.isValid).toBe(true)
    expect(result.category).toBe('audio')
  })
})
