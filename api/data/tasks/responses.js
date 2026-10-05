import { appendCookies, assertSameOrigin, functionHandler, json, requireMethod } from '../../../server/http.js'
import { ownedDataTaskResponses } from '../../../server/data.js'
import { requireSession } from '../../../server/session.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const taskSlug = new URL(request.url).searchParams.get('taskSlug')?.trim() || null
  if (taskSlug && (taskSlug.length > 80 || !/^[a-z0-9-]+$/.test(taskSlug))) {
    return appendCookies(json({ message: 'Invalid task filter.' }, 400), resolved.cookies)
  }
  const responses = await ownedDataTaskResponses(resolved.user.id, taskSlug)
  return appendCookies(json({ responses }), resolved.cookies)
})
