import { updateAuthoritativeProfile } from '../_lib/account.js'
import { assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../_lib/http.js'
import { requireSession } from '../_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 24_000)
  const input = {
    fullName: String(body.fullName || '').trim().replace(/\s+/g, ' '),
    countryCode: body.countryCode ? String(body.countryCode).trim().toUpperCase() : null,
    email: String(body.email || '').trim().toLowerCase(),
    phone: String(body.phone || '').replace(/[\s()-]/g, ''),
  }
  if (input.fullName.length < 2 || input.fullName.length > 120) throw new HttpError(400, 'Name must be 2–120 characters.', 'invalid-name')
  if (input.countryCode && !/^[A-Z]{2}$/.test(input.countryCode)) throw new HttpError(400, 'Country code is invalid.', 'invalid-country')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new HttpError(400, 'Email is invalid.', 'invalid-email')
  if (!/^\+[1-9]\d{7,14}$/.test(input.phone)) throw new HttpError(400, 'Phone number is invalid.', 'invalid-phone')
  const result = await updateAuthoritativeProfile(resolved, input)
  return json(result)
})
