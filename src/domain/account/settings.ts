export type AccountSettings = {
  language: string
  currency: string
  timezone: string
  notificationsEnabled: boolean
  marketingEnabled: boolean
  biometricLoginEnabled: boolean
  safetyNotificationsEnabled: boolean
}

export function normalizeAccountSettings(input: AccountSettings): AccountSettings {
  const language = String(input.language || '').trim()
  const currency = String(input.currency || '').trim().toUpperCase()
  const timezone = String(input.timezone || '').trim()
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(language)) throw new Error('Language code is invalid.')
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency code is invalid.')
  if (!timezone || timezone.length > 100) throw new Error('Timezone is invalid.')
  return {
    language,
    currency,
    timezone,
    notificationsEnabled: Boolean(input.notificationsEnabled),
    marketingEnabled: Boolean(input.marketingEnabled),
    biometricLoginEnabled: Boolean(input.biometricLoginEnabled),
    safetyNotificationsEnabled: Boolean(input.safetyNotificationsEnabled),
  }
}
