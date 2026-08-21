import type { NormalizedRegistration, RegistrationInput, ValidationIssue } from './types'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const E164 = /^\+[1-9]\d{7,14}$/

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizePhone(value: string): string {
  return value.replace(/[\s()-]/g, '').trim()
}

export function passwordIssues(password: string): string[] {
  const issues: string[] = []
  if (password.length < 12) issues.push('at least 12 characters')
  if (!/[a-z]/.test(password)) issues.push('a lowercase letter')
  if (!/[A-Z]/.test(password)) issues.push('an uppercase letter')
  if (!/\d/.test(password)) issues.push('a number')
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('a symbol')
  return issues
}

export function validateRegistration(input: RegistrationInput): {
  valid: boolean
  issues: ValidationIssue[]
  normalized?: NormalizedRegistration
} {
  const issues: ValidationIssue[] = []
  const fullName = input.fullName.trim().replace(/\s+/g, ' ')
  const normalizedEmail = normalizeEmail(input.email)
  const normalizedPhone = normalizePhone(input.phone)

  if (fullName.length < 2) issues.push({ field: 'fullName', code: 'required', message: 'Enter your full name.' })
  if (!EMAIL.test(normalizedEmail))
    issues.push({ field: 'email', code: 'invalid', message: 'Enter a valid email address.' })
  if (!E164.test(normalizedPhone))
    issues.push({ field: 'phone', code: 'invalid', message: 'Use international phone format, for example +234…' })
  const passwordProblems = passwordIssues(input.password)
  if (passwordProblems.length)
    issues.push({ field: 'password', code: 'weak', message: `Password must contain ${passwordProblems.join(', ')}.` })
  if (input.password !== input.passwordConfirmation)
    issues.push({ field: 'passwordConfirmation', code: 'mismatch', message: 'Passwords do not match.' })
  if (!input.termsAccepted)
    issues.push({ field: 'termsAccepted', code: 'required', message: 'Terms acceptance is required.' })
  if (!input.privacyAccepted)
    issues.push({ field: 'privacyAccepted', code: 'required', message: 'Privacy notice acceptance is required.' })
  if (!input.termsVersion.trim())
    issues.push({ field: 'termsVersion', code: 'required', message: 'Terms version is required.' })
  if (!input.privacyVersion.trim())
    issues.push({ field: 'privacyVersion', code: 'required', message: 'Privacy version is required.' })

  if (issues.length) return { valid: false, issues }
  return {
    valid: true,
    issues,
    normalized: {
      fullName,
      normalizedEmail,
      normalizedPhone,
      password: input.password,
      termsVersion: input.termsVersion.trim(),
      privacyVersion: input.privacyVersion.trim(),
      referralCode: input.referralCode?.trim() || undefined,
    },
  }
}

export function validateOtp(code: string): boolean {
  return /^\d{6}$/.test(code.trim())
}
