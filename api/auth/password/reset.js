import { enforceRateLimit, passwordIssues, recordSecurityEvent } from '../../_lib/auth.js'
import { assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../_lib/http.js'
import { authPublic } from '../../_lib/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const body = await readJson(request)
  const token = String(body.token || '').trim()
  const password = String(body.password || '')
  const issues = passwordIssues(password)
  if (!token) throw new HttpError(400, 'Reset token is missing or expired.', 'invalid-reset')
  if (issues.length) throw new HttpError(400, `Password must contain ${issues.join(', ')}.`, 'weak-password')
  await enforceRateLimit(request, 'password-update', token.slice(-24), 5, 15 * 60)

  let user
  try {
    const result = await authPublic('/auth/v1/user', {
      token,
      exposeError: false,
      errorMessage: 'Reset token is invalid or expired.',
    })
    user = result.data
  } catch {
    throw new HttpError(400, 'Reset token is invalid or expired.', 'invalid-reset')
  }

  await authPublic('/auth/v1/user', {
    method: 'PUT',
    token,
    body: { password },
    exposeError: false,
    errorMessage: 'Password could not be updated.',
  })
  await authPublic('/auth/v1/logout?scope=global', {
    method: 'POST',
    token,
    exposeError: false,
    errorMessage: 'Session revocation failed.',
  }).catch(() => undefined)
  await recordSecurityEvent(user?.id || null, 'password.changed')
  return json({ ok: true })
})
