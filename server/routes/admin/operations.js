import { serviceRpc } from '../../../api/_lib/supabase.js'
import { operationsOverviewSummary, operationsSnapshot, requireAdminSession } from '../../../api/_lib/account.js'
import { appendCookies, functionHandler, HttpError, json, requireMethod } from '../../../api/_lib/http.js'

const scopePermission = {
  overview: 'operations.read',
  users: 'operations.kyc',
  support: 'operations.support',
  finance: 'operations.finance',
  deployments: 'operations.deployment',
  data: 'operations.data',
  risk: 'operations.risk',
  rewards: 'operations.rewards',
}

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const scope = String(new URL(request.url).searchParams.get('scope') || 'overview').trim()
  const permission = scopePermission[scope]
  if (!permission) throw new HttpError(400, 'Unsupported operations scope.', 'invalid-scope')
  const resolved = await requireAdminSession(request, permission)
  const snapshot =
    scope === 'overview'
      ? { summary: await operationsOverviewSummary(resolved.user.id) }
      : scope === 'rewards'
        ? (await serviceRpc('wrs_mining_operations_snapshot', { p_operator_user_id: resolved.user.id })).data
        : await operationsSnapshot(scope)
  return appendCookies(json({ scope, ...snapshot }), resolved.cookies)
})
