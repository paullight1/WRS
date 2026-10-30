import { requireAdminSession } from '../../../api/_lib/account.js'
import { appendCookies, functionHandler, HttpError, json, requireMethod } from '../../../api/_lib/http.js'
import { serviceRest, serviceRpc } from '../../../api/_lib/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireAdminSession(request, 'operations.roles')
  const identifier = String(new URL(request.url).searchParams.get('identifier') || '').trim()
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const email = /^[^\s@*%]+@[^\s@*%]+\.[^\s@*%]+$/
  if (identifier.length > 320 || (!uuid.test(identifier) && !email.test(identifier))) {
    throw new HttpError(400, 'An exact account email or account ID is required.', 'invalid-role-identifier')
  }
  const { data } = await serviceRpc('wrs_admin_role_subject', {
    p_operator_user_id: resolved.user.id,
    p_identifier: identifier,
  })
  if (!data) throw new HttpError(404, 'Account not found.', 'role-subject-not-found')
  const { data: adminRoles } = await serviceRest(
    `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(data.userId)}&select=roles!inner(slug)&roles.slug=eq.admin&limit=1`,
  )
  if (!Array.isArray(adminRoles))
    throw new HttpError(502, 'Account access could not be loaded. Try again.', 'role-subject-unavailable')
  return appendCookies(
    json({
      userId: data.userId,
      identifier: data.identifier,
      roles: data.roles,
      isAdmin: adminRoles.some((row) => row.roles?.slug === 'admin'),
    }),
    resolved.cookies,
  )
})
