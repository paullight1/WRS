import {
  enforceRateLimit,
  issueMissingVerificationChallenges,
  loadProfile,
  recordSecurityEvent,
} from '../../server/auth.js'
import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../server/http.js'
import { buildAppSession, recordSessionMetadata, sessionCookies } from '../../server/session.js'
import { authPublic } from '../../server/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const body = await readJson(request)
  const identifier = String(body.identifier || '').trim()
  const password = String(body.password || '')
  const rememberMe = body.rememberMe === true
  if (!identifier || !password)
    throw new HttpError(400, 'Email/phone and password are required.', 'invalid-credentials')
  await enforceRateLimit(request, 'login', identifier, 8, 10 * 60)

  const credential = identifier.includes('@')
    ? { email: identifier.toLowerCase() }
    : { phone: identifier.replace(/[\s()-]/g, '') }
  let tokenResponse
  try {
    const { data } = await authPublic('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { ...credential, password },
      exposeError: false,
      errorMessage: 'Email/phone or password is incorrect.',
    })
    tokenResponse = data
  } catch {
    await recordSecurityEvent(null, 'login.failed').catch(() => undefined)
    throw new HttpError(401, 'Email/phone or password is incorrect.', 'invalid-credentials')
  }

  const user = tokenResponse.user
  if (!user?.id || !(await loadProfile(user.id))) {
    throw new HttpError(403, 'This account is not provisioned for WRS.', 'profile-required')
  }
  await recordSessionMetadata(user.id, tokenResponse.access_token, rememberMe)
  const session = await buildAppSession(user, tokenResponse.access_token)
  if (!session) throw new HttpError(401, 'Unable to establish a revocable WRS session.', 'invalid-session')
  const challenges =
    !session.emailVerified || !session.phoneVerified ? await issueMissingVerificationChallenges(user) : []
  await recordSecurityEvent(user.id, 'login.succeeded')
  return appendCookies(json({ session, challenges }), sessionCookies(tokenResponse, rememberMe))
})
