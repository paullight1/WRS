import { enforceRateLimit, loadProfileByIdentifier } from '../../../server/auth.js'
import { assertSameOrigin, functionHandler, json, readJson, requireMethod } from '../../../server/http.js'
import { authPublic } from '../../../server/supabase.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const started = Date.now()
  const body = await readJson(request)
  const identifier = String(body.identifier || '').trim()
  await enforceRateLimit(request, 'password-reset', identifier || 'empty', 4, 15 * 60)

  try {
    const profile = await loadProfileByIdentifier(identifier)
    if (profile?.normalized_email) {
      const origin = new URL(request.url).origin
      await authPublic('/auth/v1/recover', {
        method: 'POST',
        body: { email: profile.normalized_email, redirect_to: `${origin}/reset-password` },
        exposeError: false,
        errorMessage: 'Recovery delivery failed.',
      })
    }
  } catch {
    // Recovery is deliberately non-enumerating.
  }

  const elapsed = Date.now() - started
  if (elapsed < 300) await sleep(300 - elapsed)
  return json({ message: 'If the account exists, recovery instructions were sent.' })
})
