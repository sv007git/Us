import { describe, it, expect } from 'vitest'
import { generateRandomCode } from '../src/context/CoupleContext'

describe('Couple Pairing Code Logic', () => {
  it('generates an 8-character invitation code', () => {
    const code = generateRandomCode()
    expect(code).toBeDefined()
    expect(code.length).toBe(8)
  })

  it('generates uppercase alphanumeric codes without ambiguous characters', () => {
    // Generate 50 codes and verify character set
    for (let i = 0; i < 50; i++) {
      const code = generateRandomCode()
      expect(code).toMatch(/^[A-Z2-9]{8}$/)
      // Should not contain confusing characters 'O', '0', 'I', '1'
      expect(code).not.toContain('O')
      expect(code).not.toContain('0')
      expect(code).not.toContain('I')
      expect(code).not.toContain('1')
    }
  })

  it('generates high entropy distinct codes', () => {
    const set = new Set()
    for (let i = 0; i < 100; i++) {
      set.add(generateRandomCode())
    }
    expect(set.size).toBe(100)
  })
})
