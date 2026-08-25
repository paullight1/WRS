import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../server/http.js'
import { recordAcademyProgress } from '../../server/ecosystem.js'
import { requireSession } from '../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 12_000)
  const enrollmentId = String(body.enrollmentId || '').trim()
  const moduleId = String(body.moduleId || '').trim()
  const completionPercent = Number(body.completionPercent)
  if (!enrollmentId || !moduleId) throw new HttpError(400, 'Enrollment and module are required.', 'progress-required')
  if (!Number.isFinite(completionPercent) || completionPercent < 0 || completionPercent > 100) {
    throw new HttpError(400, 'Completion must be between 0 and 100.', 'invalid-progress')
  }
  const result = await recordAcademyProgress(resolved.user.id, enrollmentId, moduleId, completionPercent)
  return appendCookies(json(result), resolved.cookies)
})
