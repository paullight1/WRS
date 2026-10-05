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

const trainingTasks = {
  'training-voice': { category: 'voice', title: 'Voice Training', fields: ['locale', 'phrase'] },
  'training-language': { category: 'text', title: 'Language Training', fields: ['language', 'phrase', 'translation'] },
  'training-skill': {
    category: 'document',
    title: 'Skill Training',
    fields: ['skill', 'instructions', 'expectedResult'],
  },
  'training-movement': { category: 'movement', title: 'Movement Training', fields: ['movement', 'description'] },
  'training-facial': { category: 'face', title: 'Facial Expressions', fields: ['expression', 'description'] },
  'training-image-labeling': { category: 'image', title: 'Image Labeling', fields: ['labels', 'description'] },
  'training-video-labeling': { category: 'video', title: 'Video Labeling', fields: ['action', 'description'] },
  'training-text-translation': {
    category: 'text',
    title: 'Text & Translation',
    fields: ['sourceLanguage', 'targetLanguage', 'sourceText', 'translatedText'],
  },
  'training-conversation': {
    category: 'conversation',
    title: 'Conversation Data',
    fields: ['userMessage', 'robotReply', 'context'],
  },
  'training-custom': { category: 'document', title: 'Custom Data', fields: ['dataType', 'description', 'sample'] },
}

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request, 64_000)
  const taskSlug = String(body.taskSlug || '').trim()
  const response =
    typeof body.response === 'object' && body.response && !Array.isArray(body.response) ? body.response : null
  if (taskSlug.length < 2 || !response)
    throw new HttpError(400, 'Task response is incomplete.', 'invalid-task-response')
  const trainingTask = trainingTasks[taskSlug]
  if (!trainingTask) {
    throw new HttpError(404, 'This task is not published in the WRS task catalogue.', 'task-not-published')
  }
  const values = {}
  for (const field of trainingTask.fields) {
    const value = typeof response[field] === 'string' ? response[field].trim() : ''
    if (!value || value.length > 5000) {
      throw new HttpError(
        400,
        'Complete each training field with no more than 5,000 characters.',
        'invalid-training-response',
      )
    }
    values[field] = value
  }
  const normalizedResponse = { module: taskSlug.slice('training-'.length), title: trainingTask.title, ...values }
  const dataCategory = trainingTask.category
  const { data } = await serviceRpc('wrs_submit_data_task_response', {
    p_user_id: resolved.user.id,
    p_task_slug: taskSlug,
    p_data_category: dataCategory,
    p_response: normalizedResponse,
  })
  return appendCookies(json({ responseId: String(data), status: 'submitted', dataCategory }, 201), resolved.cookies)
})
