import { authPublic } from '../../../supabase.js'
import { assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../../http.js'
import { enforceRateLimit } from '../../../auth.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const body = await readJson(request)
  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  if (!email) throw new HttpError(400, 'Email address is required.', 'invalid-email')
  await enforceRateLimit(request, 'verification-resend', email, 3, 15 * 60)
  try {
    await authPublic('/auth/v1/resend', {
      method: 'POST',
      body: { type: 'signup', email, redirect_to: new URL('/auth/callback', request.url).toString() },
      errorMessage: 'Unable to resend the confirmation email.',
    })
  } catch {
    // Keep the response independent of whether an account exists, while making
    // actual delivery/provider failures visible instead of claiming success.
    throw new HttpError(
      503,
      'We could not send a confirmation email right now. Please try again later.',
      'confirmation-email-unavailable',
    )
  }
  return json({ message: 'A new confirmation email has been sent.' })
})
