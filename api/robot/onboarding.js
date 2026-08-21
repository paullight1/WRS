import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../_lib/http.js'
import { loadOnboardingDraft, loadRobotState, validateRobotInput } from '../_lib/robot.js'
import { requireSession } from '../_lib/session.js'
import { serviceRest } from '../_lib/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, ['GET', 'PUT'])
  const resolved = await requireSession(request, { verified: true })

  if (request.method === 'GET') {
    return appendCookies(json({ draft: await loadOnboardingDraft(resolved.user.id) }), resolved.cookies)
  }

  assertSameOrigin(request)
  const body = await readJson(request)
  const draft = validateRobotInput(body.draft, { requireName: true, requirePackage: true })
  const step = Number(body.draft?.step)
  if (!Number.isInteger(step) || step < 0 || step > 5) {
    throw new HttpError(400, 'Onboarding step is invalid.', 'invalid-onboarding')
  }
  const existing = await loadRobotState(resolved.user.id)
  if (existing.robot) throw new HttpError(409, 'Robot onboarding is already complete.', 'onboarding-complete')

  await serviceRest('/rest/v1/robot_onboarding?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      user_id: resolved.user.id,
      step,
      draft,
      updated_at: new Date().toISOString(),
    },
  })
  return appendCookies(json({ draft: { ...draft, step } }), resolved.cookies)
})
