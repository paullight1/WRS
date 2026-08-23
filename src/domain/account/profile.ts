export type AccountProfileInput = {
  fullName: string
  countryCode: string | null
  email: string
  phone: string
}

export function normalizeAccountProfile(input: AccountProfileInput): AccountProfileInput {
  const fullName = String(input.fullName || '')
    .trim()
    .replace(/\s+/g, ' ')
  const countryCode = input.countryCode ? String(input.countryCode).trim().toUpperCase() : null
  const email = String(input.email || '')
    .trim()
    .toLowerCase()
  const phone = String(input.phone || '').replace(/[\s()-]/g, '')
  if (fullName.length < 2 || fullName.length > 120) throw new Error('Name must be 2–120 characters.')
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) throw new Error('Country must be an ISO alpha-2 code.')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email address.')
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Enter a valid international phone number.')
  return { fullName, countryCode, email, phone }
}

export function profileIdentityChanged(
  current: Pick<AccountProfileInput, 'email' | 'phone'>,
  next: AccountProfileInput,
) {
  return current.email.trim().toLowerCase() !== next.email || current.phone.replace(/[\s()-]/g, '') !== next.phone
}
