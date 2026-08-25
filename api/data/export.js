import { appendCookies, functionHandler, json, requireMethod } from '../../server/http.js'
import { prepareExport } from '../../server/data.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true })
  const result = await prepareExport(resolved.user.id)
  return appendCookies(
    json({
      requestId: result.requestId,
      status: result.status,
      expiresAt: result.expiresAt,
      manifest: result.manifest,
    }),
    resolved.cookies,
  )
})
