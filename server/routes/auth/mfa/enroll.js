import { enrollMfa } from '../../../mfa.js'
import { assertSameOrigin, functionHandler, json, requireMethod } from '../../../http.js'
import { requireSession } from '../../../session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  return json(await enrollMfa(resolved), 201)
})
