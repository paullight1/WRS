import { describe, expect, it } from 'vitest'
import { normalizeEmail, normalizePhone, passwordIssues, validateOtp, validateRegistration } from '../../src/domain/auth/validation'

describe('auth validation', () => {
  it('normalizes identifiers deterministically', () => {
    expect(normalizeEmail('  Person@Example.COM ')).toBe('person@example.com')
    expect(normalizePhone('+234 (800) 123-4567')).toBe('+2348001234567')
  })

  it('rejects weak registration and missing consent', () => {
    const result = validateRegistration({
      fullName: '',
      email: 'bad',
      phone: '0800',
      password: 'short',
      passwordConfirmation: 'different',
      termsAccepted: false,
      privacyAccepted: false,
      termsVersion: '',
      privacyVersion: '',
    })
    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('weak')
    expect(result.issues.map((issue) => issue.code)).toContain('mismatch')
  })

  it('accepts a production-shaped registration and preserves normalized values', () => {
    const result = validateRegistration({
      fullName: ' Ada  Nwosu ',
      email: 'ADA@EXAMPLE.COM',
      phone: '+234 800 123 4567',
      password: 'Strong-pass-2026',
      passwordConfirmation: 'Strong-pass-2026',
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion: '2026-08-21',
      privacyVersion: '2026-08-21',
    })
    expect(result.valid).toBe(true)
    expect(result.normalized?.normalizedEmail).toBe('ada@example.com')
    expect(result.normalized?.normalizedPhone).toBe('+2348001234567')
    expect(result.normalized?.fullName).toBe('Ada Nwosu')
  })

  it('requires six numeric OTP digits and strong passwords', () => {
    expect(validateOtp('123456')).toBe(true)
    expect(validateOtp('12345a')).toBe(false)
    expect(passwordIssues('Strong-pass-2026')).toEqual([])
  })
})
