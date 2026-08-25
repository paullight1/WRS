import { operationsSnapshot, requireAdminSession } from '../_lib/account.js'
import { appendCookies, functionHandler, HttpError, json, requireMethod } from '../_lib/http.js'

const scopePermission = {
  overview: 'operations.read',
  users: 'operations.read',
  support: 'operations.support',
  finance: 'operations.finance',
  deployments: 'operations.deployment',
  data: 'operations.data',
  risk: 'operations.risk',
}

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const scope = String(new URL(request.url).searchParams.get('scope') || 'overview').trim()
  const permission = scopePermission[scope]
  if (!permission) throw new HttpError(400, 'Unsupported operations scope.', 'invalid-scope')
  const resolved = await requireAdminSession(request, permission)
  const snapshot = await operationsSnapshot(scope)
  return appendCookies(json({ scope, ...snapshot }), resolved.cookies)
})
