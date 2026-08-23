import { functionHandler, json, requireMethod } from '../server/http.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const release = String(process.env.VERCEL_GIT_COMMIT_SHA || '')
    .trim()
    .slice(0, 12)
  return json({ status: 'ok', release: release || 'unknown' }, { headers: { 'cache-control': 'no-store' } })
})
