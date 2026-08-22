import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../server/http.js'
import { recordConsent } from '../../server/data.js'
import { requireSession } from '../../server/session.js'

const purposes = new Set(['personal-robot', 'dataset-contribution', 'research-licensing'])
const categories = new Set(['voice', 'face', 'movement', 'document', 'text', 'image', 'video', 'conversation'])

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 24_000)
  const purposeSlug = String(body.purposeSlug || '').trim().toLowerCase()
  const dataCategory = String(body.dataCategory || '').trim().toLowerCase()
  const action = String(body.action || '').trim().toLowerCase()
  const policyVersion = Number(body.policyVersion)

  if (!purposes.has(purposeSlug)) throw new HttpError(400, 'Unknown consent purpose.', 'invalid-purpose')
  if (!categories.has(dataCategory)) throw new HttpError(400, 'Unknown data category.', 'invalid-category')
  if (!['granted', 'withdrawn'].includes(action)) throw new HttpError(400, 'Invalid consent action.', 'invalid-action')
  if (!Number.isInteger(policyVersion) || policyVersion <= 0) throw new HttpError(400, 'Invalid consent version.', 'invalid-version')

  const result = await recordConsent(resolved.user.id, {
    purposeSlug,
    dataCategory,
    action,
    policyVersion,
    jurisdiction: body.jurisdiction ? String(body.jurisdiction).slice(0, 64) : null,
    context: typeof body.context === 'object' && body.context ? body.context : {},
  })
  return appendCookies(json(result, 201), resolved.cookies)
})
