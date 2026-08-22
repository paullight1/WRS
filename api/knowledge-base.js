import { knowledgeBaseSearch } from './_lib/account.js'
import { functionHandler, json, requireMethod } from './_lib/http.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const query = String(new URL(request.url).searchParams.get('q') || '').trim()
  const articles = await knowledgeBaseSearch(query)
  return json({ articles })
})
