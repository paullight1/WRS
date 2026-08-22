import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { serviceRpc } from '../../../server/supabase.js'

function categoryFor(slug) {
  const value = slug.toLowerCase()
  if (value.includes('voice') || value.includes('speech') || value.includes('transcription')) return 'voice'
  if (value.includes('image')) return 'image'
  if (value.includes('video')) return 'video'
  if (value.includes('conversation')) return 'conversation'
  return 'text'
}

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 64_000)
  const taskSlug = String(body.taskSlug || '').trim()
  const response = typeof body.response === 'object' && body.response ? body.response : null
  if (taskSlug.length < 2 || !response)
    throw new HttpError(400, 'Task response is incomplete.', 'invalid-task-response')
  const dataCategory = categoryFor(taskSlug)
  const { data } = await serviceRpc('wrs_submit_data_task_response', {
    p_user_id: resolved.user.id,
    p_task_slug: taskSlug,
    p_data_category: dataCategory,
    p_response: response,
  })
  return appendCookies(json({ responseId: String(data), status: 'submitted', dataCategory }, 201), resolved.cookies)
})
