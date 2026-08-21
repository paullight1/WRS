import { appendCookies, assertSameOrigin, functionHandler, HttpError, json, readJson, requireMethod } from '../../_lib/http.js'
import { loadRobotState, validateRobotInput } from '../../_lib/robot.js'
import { requireSession } from '../../_lib/session.js'
import { serviceRpc } from '../../_lib/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request)
  const input = validateRobotInput(body.input, { requireName: true, requirePackage: true })
  const idempotencyKey = `onboarding:${resolved.user.id}:v1`
  const { data: result } = await serviceRpc('wrs_complete_robot_onboarding', {
    p_user_id: resolved.user.id,
    p_input: input,
    p_idempotency_key: idempotencyKey,
  })

  if (result?.status === 'entitlement-required') {
    return appendCookies(json({ status: 'entitlement-required', packageSlug: result.packageSlug }), resolved.cookies)
  }
  if (result?.status === 'capability-locked') {
    throw new HttpError(409, `Active package does not include ${result.capability}.`, 'capability-locked')
  }
  if (!['completed', 'already-completed'].includes(result?.status)) {
    throw new HttpError(502, 'Robot provisioning did not return a valid result.', 'provisioning-invalid')
  }

  const state = await loadRobotState(resolved.user.id, result.robotId)
  if (!state.robot || !state.configuration) {
    throw new HttpError(502, 'Provisioned robot could not be reloaded.', 'provisioning-incomplete')
  }
  const status = result.status === 'completed' ? 'completed' : 'already-completed'
  return appendCookies(json({ status, robot: state.robot, configuration: state.configuration }), resolved.cookies)
})
