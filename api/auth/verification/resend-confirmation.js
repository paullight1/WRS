import { authPublic } from '../../../server/supabase.js'
import { assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../../server/http.js'
import { enforceRateLimit } from '../../../server/auth.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const body = await readJson(request)
  const email = String(body.email || '').trim().toLowerCase()
  if (!email) throw new HttpError(400, 'Email address is required.', 'invalid-email')
  await enforceRateLimit(request, 'verification-resend', email, 3, 15 * 60)
  await authPublic('/auth/v1/resend', {
    method: 'POST',
    body: { type: 'signup', email, redirect_to: new URL('/auth/callback', request.url).toString() },
    errorMessage: 'Unable to resend the confirmation email.',
  }).catch(() => undefined)
  return json({ message: 'A new confirmation email has been sent.' })
})
