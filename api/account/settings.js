import { updateAuthoritativeSettings } from '../_lib/account.js'
import { assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../_lib/http.js'
import { requireSession } from '../_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 16_000)
  const input = {
    language: String(body.language || '').trim(),
    currency: String(body.currency || '').trim().toUpperCase(),
    timezone: String(body.timezone || '').trim(),
    notificationsEnabled: Boolean(body.notificationsEnabled),
    marketingEnabled: Boolean(body.marketingEnabled),
    biometricLoginEnabled: Boolean(body.biometricLoginEnabled),
    safetyNotificationsEnabled: Boolean(body.safetyNotificationsEnabled),
  }
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(input.language)) throw new HttpError(400, 'Language code is invalid.', 'invalid-language')
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new HttpError(400, 'Currency code is invalid.', 'invalid-currency')
  if (!input.timezone || input.timezone.length > 100) throw new HttpError(400, 'Timezone is invalid.', 'invalid-timezone')
  const settings = await updateAuthoritativeSettings(resolved.user.id, input)
  return json({ settings })
})
