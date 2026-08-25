import { cancelAccountDeletion, requestAccountDeletion } from '../_lib/account.js'
import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../_lib/http.js'
import { clearSessionCookies, requireSession } from '../_lib/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true, allowDeletionPending: true })
  const body = await readJson(request, 12_000)
  const action = String(body.action || '').trim()
  if (action === 'request') {
    if (resolved.session.accountDeletionPending) {
      throw new HttpError(409, 'Account deletion is already pending.', 'deletion-already-pending')
    }
    const result = await requestAccountDeletion(resolved, String(body.reason || '').trim())
    return appendCookies(
      json({ ...result, message: 'Account deletion is queued with a 24-hour recovery window.' }, 202),
      clearSessionCookies(),
    )
  }
  if (action === 'cancel') {
    const requestId = String(body.requestId || '').trim()
    if (!requestId) throw new HttpError(400, 'Deletion request is required.', 'request-required')
    const result = await cancelAccountDeletion(resolved, requestId)
    return appendCookies(json(result), resolved.cookies)
  }
  throw new HttpError(400, 'Unsupported account deletion action.', 'invalid-action')
})
