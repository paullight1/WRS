import { appendCookies, functionHandler, json, requireMethod } from '../server/http.js'
import { deploymentCatalog, deploymentOpportunity, ownedDeployment, ownedDeployments } from '../server/deployment.js'
import { requireSession } from '../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const url = new URL(request.url)
  const opportunityId = url.searchParams.get('opportunityId')
  const deploymentId = url.searchParams.get('deploymentId')
  const scope = url.searchParams.get('scope')

  if (opportunityId) {
    const item = await deploymentOpportunity(resolved.user.id, opportunityId)
    return appendCookies(json({ item }), resolved.cookies)
  }
  if (deploymentId) {
    const deployment = await ownedDeployment(resolved.user.id, deploymentId)
    return appendCookies(json({ deployment }), resolved.cookies)
  }
  if (scope === 'owned') {
    const deployments = await ownedDeployments(resolved.user.id)
    return appendCookies(json({ deployments }), resolved.cookies)
  }

  const items = await deploymentCatalog(resolved.user.id)
  return appendCookies(json({ items }), resolved.cookies)
})
