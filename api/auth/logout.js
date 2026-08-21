import { recordSecurityEvent } from '../../server/auth.js'
import { appendCookies, assertSameOrigin, functionHandler, json, requireMethod } from '../../server/http.js'
import { clearSessionCookies, resolveSession, revokeSessionMetadata } from '../../server/session.js'
import { authPublic } from '../../server/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await resolveSession(request)
  if (resolved.accessToken) {
    await revokeSessionMetadata(resolved.accessToken).catch(() => undefined)
    await authPublic('/auth/v1/logout?scope=local', {
      method: 'POST',
      token: resolved.accessToken,
      exposeError: false,
      errorMessage: 'Logout failed.',
    }).catch(() => undefined)
  }
  if (resolved.user?.id) await recordSecurityEvent(resolved.user.id, 'logout.succeeded').catch(() => undefined)
  return appendCookies(json({ ok: true }), clearSessionCookies())
})
