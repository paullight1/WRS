import { HttpError } from './http.js'
import { serviceRest } from './supabase.js'

const packages = new Set(['starter', 'builder', 'professional', 'enterprise', 'elite', 'visionary'])
const personalities = new Set(['Logical', 'Empathetic', 'Aggressive', 'Protective'])

export function mapRobot(row) {
  if (!row) return null
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    lifecycle: row.lifecycle,
    packageSlug: row.package_slug,
    requestedPackageSlug: row.requested_package_slug,
    publicVerificationId: row.public_verification_id,
    activationDate: row.activation_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapConfiguration(row) {
  if (!row) return null
  return {
    robotId: row.robot_id,
    version: Number(row.version),
    palette: row.palette,
    parts: row.parts || {},
    personality: row.personality,
    tuning: row.tuning || {},
    voiceProfileId: row.voice_profile_id,
    updatedAt: row.updated_at,
  }
}

export function validateRobotInput(input, options = {}) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Robot configuration is required.', 'invalid-robot')
  const name = String(input.name || '').trim()
  if (options.requireName && !/^[A-Za-z0-9][A-Za-z0-9 _.-]{2,31}$/.test(name)) {
    throw new HttpError(400, 'Robot name must be 3–32 safe characters.', 'invalid-robot-name')
  }
  if (options.requirePackage && !packages.has(input.requestedPackageSlug)) {
    throw new HttpError(400, 'A valid package is required.', 'invalid-package')
  }
  if (!String(input.palette || '').trim()) throw new HttpError(400, 'Palette is required.', 'invalid-configuration')
  if (!input.parts || typeof input.parts !== 'object' || Array.isArray(input.parts)) {
    throw new HttpError(400, 'Robot parts must be an object.', 'invalid-configuration')
  }
  if (!personalities.has(input.personality)) throw new HttpError(400, 'Personality is invalid.', 'invalid-configuration')
  const tuning = input.tuning || {}
  for (const key of ['speed', 'battery', 'sensor']) {
    const value = Number(tuning[key])
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new HttpError(400, `Tuning value ${key} must be between 0 and 100.`, 'invalid-configuration')
    }
  }
  if (!String(input.voiceProfileId || '').trim()) {
    throw new HttpError(400, 'Voice profile is required.', 'invalid-configuration')
  }
  return input
}

export async function loadRobotState(userId, requestedRobotId = null) {
  const robotFilter = requestedRobotId
    ? `id=eq.${encodeURIComponent(requestedRobotId)}&owner_user_id=eq.${encodeURIComponent(userId)}`
    : `owner_user_id=eq.${encodeURIComponent(userId)}`
  const { data: robots } = await serviceRest(`/rest/v1/robots?${robotFilter}&select=*&limit=1`)
  const robotRow = Array.isArray(robots) ? robots[0] || null : null
  if (!robotRow) return { robot: null, configuration: null }
  const { data: configurations } = await serviceRest(
    `/rest/v1/robot_configurations?robot_id=eq.${encodeURIComponent(robotRow.id)}&select=*&limit=1`,
  )
  const configurationRow = Array.isArray(configurations) ? configurations[0] || null : null
  return { robot: mapRobot(robotRow), configuration: mapConfiguration(configurationRow) }
}

export async function loadOnboardingDraft(userId) {
  const { data } = await serviceRest(
    `/rest/v1/robot_onboarding?user_id=eq.${encodeURIComponent(userId)}&select=step,draft,completed_robot_id&limit=1`,
  )
  const row = Array.isArray(data) ? data[0] || null : null
  if (!row || row.completed_robot_id) return null
  return { ...(row.draft || {}), step: Number(row.step || 0) }
}
