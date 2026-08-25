import { accountSnapshot } from './_lib/account.js'
import { appendCookies, functionHandler, json, requireMethod } from './_lib/http.js'
import { requireSession } from './_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireSession(request, { verified: true, allowDeletionPending: true })
  const snapshot = await accountSnapshot(resolved.user.id)
  return appendCookies(json(snapshot), resolved.cookies)
})
