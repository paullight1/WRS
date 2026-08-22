import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { acceptDeploymentContract, contractForUser } from '../../server/deployment.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  const resolved = await requireSession(request, { verified: true })

  if (request.method === 'GET') {
    const contractId = String(new URL(request.url).searchParams.get('contractId') || '').trim()
    if (!contractId) throw new HttpError(400, 'Contract ID is required.', 'contract-required')
    const contract = await contractForUser(resolved.user.id, contractId)
    return appendCookies(json({ contract }), resolved.cookies)
  }

  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const body = await readJson(request, 16_000)
  const contractId = String(body.contractId || '').trim()
  const idempotencyKey = String(body.idempotencyKey || '').trim()
  if (!contractId) throw new HttpError(400, 'Contract ID is required.', 'contract-required')
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new HttpError(400, 'A valid idempotency key is required.', 'idempotency-required')
  }
  const result = await acceptDeploymentContract(resolved.user.id, contractId, idempotencyKey)
  return appendCookies(json({ ...result, deployment: result?.deployment || null }, 201), resolved.cookies)
})
