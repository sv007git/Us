import { describe, it, expect } from 'vitest'
import { formatSupabaseUrl } from '../src/lib/supabaseClient'

describe('Supabase Client URL Formatting & Normalization', () => {
  it('formats regular URL properly', () => {
    const formatted = formatSupabaseUrl('https://myproject.supabase.co')
    expect(formatted).toBe('https://myproject.supabase.co')
  })

  it('removes trailing slashes', () => {
    const formatted = formatSupabaseUrl('https://myproject.supabase.co///')
    expect(formatted).toBe('https://myproject.supabase.co')
  })

  it('adds https:// if missing', () => {
    const formatted = formatSupabaseUrl('myproject.supabase.co')
    expect(formatted).toBe('https://myproject.supabase.co')
  })

  it('automatically converts Supabase dashboard URLs to direct API URLs', () => {
    const dashboardUrl = 'https://supabase.com/dashboard/project/abcdefghijklmnopqrstuvwxyz'
    const formatted = formatSupabaseUrl(dashboardUrl)
    expect(formatted).toBe('https://abcdefghijklmnopqrstuvwxyz.supabase.co')
  })

  it('handles empty or whitespace inputs gracefully', () => {
    expect(formatSupabaseUrl('')).toBe('')
    expect(formatSupabaseUrl('   ')).toBe('')
    expect(formatSupabaseUrl(null)).toBe('')
  })
})
