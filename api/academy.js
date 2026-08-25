import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../server/http.js'
import { academySnapshot, enrollAcademyCourse } from '../server/ecosystem.js'
import { requireSession } from '../server/session.js'

export default functionHandler(async (request) => {
  const resolved = await requireSession(request, { verified: true })
  if (request.method === 'GET') {
    const snapshot = await academySnapshot(resolved.user.id)
    return appendCookies(json(snapshot), resolved.cookies)
  }
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const body = await readJson(request, 12_000)
  const courseId = String(body.courseId || '').trim()
  if (!courseId) throw new HttpError(400, 'Course is required.', 'course-required')
  const result = await enrollAcademyCourse(resolved.user.id, courseId)
  return appendCookies(json(result, 201), resolved.cookies)
})
