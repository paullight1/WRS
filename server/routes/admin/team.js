import { requireAdminSession } from '../../../api/_lib/account.js'
import { appendCookies, functionHandler, HttpError, json, requireMethod } from '../../../api/_lib/http.js'
import { serviceRest } from '../../../api/_lib/supabase.js'

// Keep this directory scoped to roles that can be managed from the access panel.
// It must never become an Auth-user directory or expose provider metadata.
const staffRoles = [
  'admin',
  'support_operator',
  'kyc_operator',
  'finance_operator',
  'data_operator',
  'deployment_operator',
  'risk_operator',
  'reward_operator',
]
const memberLimit = 500
const assignmentLimit = memberLimit * staffRoles.length + 1

function inFilter(values) {
  return `(${values.join(',')})`
}

function exactTotal(result) {
  const range = result.response?.headers?.get('content-range') || ''
  const total = range.includes('/') && !range.endsWith('/*') ? Number(range.split('/').at(-1)) : NaN
  return Number.isSafeInteger(total) && total >= 0 ? total : null
}
function rows(result) {
  if (!Array.isArray(result.data))
    throw new HttpError(502, 'Staff details could not be loaded. Try again.', 'staff-unavailable')
  return result.data
}
function emptyDirectory(cookies) {
  return appendCookies(
    json({
      members: [],
      stats: { total: 0, active: 0, pending: 0, suspended: 0, roleCounts: {}, scope: 'all' },
      hasMore: false,
    }),
    cookies,
  )
}

export default functionHandler(async (request) => {
  requireMethod(request, 'GET')
  const resolved = await requireAdminSession(request, 'operations.roles')

  // Resolve only the fixed staff role set. This avoids trusting arbitrary role IDs
  // supplied by a client and avoids reading auth.users/provider records entirely.
  const roleResult = await serviceRest(
    `/rest/v1/roles?slug=in.${inFilter(staffRoles)}&select=id,slug&order=slug.asc&limit=${staffRoles.length}`,
  )
  const roleRows = rows(roleResult)
  const roleById = new Map(
    roleRows.filter((row) => row?.id && staffRoles.includes(row.slug)).map((row) => [String(row.id), row.slug]),
  )
  if (!roleById.size) return emptyDirectory(resolved.cookies)

  const assignmentResult = await serviceRest(
    `/rest/v1/user_roles?role_id=in.${inFilter([...roleById.keys()])}&select=user_id,role_id&order=user_id.asc&limit=${assignmentLimit}`,
    { headers: { Prefer: 'count=exact' } },
  )
  const assignments = rows(assignmentResult)
  const assignmentsByUser = new Map()
  for (const assignment of assignments) {
    const userId = String(assignment?.user_id || '')
    const role = roleById.get(String(assignment?.role_id || ''))
    if (!userId || !role) continue
    const roles = assignmentsByUser.get(userId) || new Set()
    roles.add(role)
    assignmentsByUser.set(userId, roles)
  }
  if (!assignmentsByUser.size) return emptyDirectory(resolved.cookies)

  const orderedUserIds = [...assignmentsByUser.keys()].sort()
  const assignmentTotal = exactTotal(assignmentResult)
  const assignmentsIncomplete = assignmentTotal === null || assignmentTotal > assignments.length
  let hasMore = assignmentsIncomplete || orderedUserIds.length > memberLimit
  const selectedUserIds = orderedUserIds.slice(0, memberLimit)
  const profileResult = await serviceRest(
    `/rest/v1/user_profiles?user_id=in.${inFilter(selectedUserIds)}&status=neq.deleted&select=user_id,full_name,normalized_email,status&order=full_name.asc,user_id.asc&limit=${memberLimit}`,
    { headers: { Prefer: 'count=exact' } },
  )
  const profiles = rows(profileResult)
  const profileTotal = exactTotal(profileResult)
  hasMore = hasMore || profileTotal === null || profileTotal > profiles.length
  const roleCounts = Object.fromEntries(staffRoles.map((role) => [role, 0]))
  const statusCounts = { active: 0, pending: 0, suspended: 0 }
  const members = profiles
    .map((profile) => {
      const userId = String(profile?.user_id || '')
      const roles = [...(assignmentsByUser.get(userId) || [])].sort()
      if (!userId || !roles.length) return null
      for (const role of roles) roleCounts[role] += 1
      if (Object.hasOwn(statusCounts, profile.status)) statusCounts[profile.status] += 1
      return {
        userId,
        fullName: String(profile.full_name || ''),
        email: String(profile.normalized_email || ''),
        roles,
      }
    })
    .filter(Boolean)

  return appendCookies(
    json({
      members,
      stats: {
        total: members.length,
        ...statusCounts,
        roleCounts,
        // `shown` is deliberately not presented as a global count when the
        // bounded directory cannot prove that every staff assignment was read.
        scope: hasMore ? 'shown' : 'all',
      },
      ...(hasMore ? { hasMore: true } : { hasMore: false }),
    }),
    resolved.cookies,
  )
})
