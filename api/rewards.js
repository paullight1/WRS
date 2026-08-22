import { appendCookies, functionHandler, json, requireMethod } from '../server/http.js'
import { rewardSnapshot } from '../server/ecosystem.js'
import { requireSession } from '../server/session.js'
import { serviceRest } from '../server/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const [snapshot, { data: catalog }] = await Promise.all([
    rewardSnapshot(resolved.user.id),
    serviceRest('/rest/v1/reward_boost_catalog?status=eq.active&select=slug,name,cost_points,duration_seconds,effect,min_package_slug&order=cost_points.asc&limit=100'),
  ])
  return appendCookies(json({ ...snapshot, catalog: Array.isArray(catalog) ? catalog : [] }), resolved.cookies)
})
