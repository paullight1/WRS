import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../_lib/http.js'
import { loadRobotState, validateRobotInput } from '../_lib/robot.js'
import { requireSession } from '../_lib/session.js'
import { serviceRpc } from '../_lib/supabase.js'

export default functionHandler(async (request) => {
  requireMethod(request, 'PUT')
  assertSameOrigin(request)
  const resolved = await requireSession(request, { verified: true })
  const body = await readJson(request)
  const robotId = String(body.robotId || '')
  const expectedVersion = Number(body.expectedVersion)
  const input = validateRobotInput(body.input)
  if (!robotId || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new HttpError(400, 'Robot ID and expected configuration version are required.', 'invalid-configuration')
  }

  const { data: result } = await serviceRpc('wrs_save_robot_configuration', {
    p_user_id: resolved.user.id,
    p_robot_id: robotId,
    p_input: input,
    p_expected_version: expectedVersion,
  })
  if (result?.status === 'forbidden') throw new HttpError(404, 'Robot was not found.', 'robot-not-found')
  if (result?.status === 'capability-locked') {
    return appendCookies(json({ status: 'capability-locked', capability: result.capability }), resolved.cookies)
  }

  const state = await loadRobotState(resolved.user.id, robotId)
  if (!state.robot || !state.configuration) throw new HttpError(404, 'Robot was not found.', 'robot-not-found')
  if (result?.status === 'conflict') {
    return appendCookies(json({ status: 'conflict', current: state.configuration }), resolved.cookies)
  }
  if (result?.status !== 'saved') {
    throw new HttpError(502, 'Configuration service returned an invalid result.', 'configuration-invalid')
  }
  return appendCookies(json({ status: 'saved', configuration: state.configuration }), resolved.cookies)
})
