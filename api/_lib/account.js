import crypto from 'node:crypto'
import { issueVerificationChallenge } from './auth.js'
import { HttpError } from './http.js'
import { requireSession } from './session.js'
import { authSecret, serviceRest, serviceRpc } from './supabase.js'

function recentMfa(session, maxMinutes = 10) {
  if (!session?.mfaEnabled || !session?.mfaSatisfiedAt) return false
  const age = Date.now() - new Date(session.mfaSatisfiedAt).getTime()
  return age >= 0 && age <= maxMinutes * 60_000
}

async function loadProfile(userId) {
  const { data } = await serviceRest(
    `/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id,full_name,normalized_email,normalized_phone,country_code,status,email_verified_at,phone_verified_at,kyc_status,updated_at&limit=1`,
  )
  return Array.isArray(data) ? data[0] || null : null
}

async function loadSettings(userId) {
  const { data } = await serviceRest(`/rest/v1/user_settings?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`)
  const row = Array.isArray(data) ? data[0] || null : null
  return row
    ? {
        language: row.language,
        currency: row.currency,
        timezone: row.timezone,
        notificationsEnabled: row.notifications_enabled,
        marketingEnabled: row.marketing_enabled,
        biometricLoginEnabled: row.biometric_login_enabled,
        safetyNotificationsEnabled: row.safety_notifications_enabled,
      }
    : {
        language: 'en',
        currency: 'USD',
        timezone: 'UTC',
        notificationsEnabled: true,
        marketingEnabled: false,
        biometricLoginEnabled: false,
        safetyNotificationsEnabled: true,
      }
}

export async function accountSnapshot(userId) {
  const [profile, settings, deletionResult] = await Promise.all([
    loadProfile(userId),
    loadSettings(userId),
    serviceRest(
      `/rest/v1/account_deletion_requests?user_id=eq.${encodeURIComponent(userId)}&status=in.(requested,processing,failed)&select=id,status,eligible_at,requested_at,last_error&order=requested_at.desc&limit=1`,
    ),
  ])
  if (!profile) throw new HttpError(404, 'Account profile is unavailable.', 'profile-unavailable')
  return {
    profile: {
      userId: profile.user_id,
      fullName: profile.full_name,
      email: profile.normalized_email,
      phone: profile.normalized_phone,
      countryCode: profile.country_code,
      status: profile.status,
      emailVerified: Boolean(profile.email_verified_at),
      phoneVerified: Boolean(profile.phone_verified_at),
      kycStatus: profile.kyc_status,
      updatedAt: profile.updated_at,
    },
    settings,
    deletion: Array.isArray(deletionResult.data) ? deletionResult.data[0] || null : null,
  }
}

async function updateProviderIdentity(userId, input, current) {
  const emailChanged = input.email !== current.normalized_email
  const phoneChanged = input.phone !== current.normalized_phone
  const body = { user_metadata: { full_name: input.fullName } }
  if (emailChanged) {
    body.email = input.email
    body.email_confirm = false
  }
  if (phoneChanged) {
    body.phone = input.phone
    body.phone_confirm = false
  }
  await authSecret(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body,
    errorMessage: 'Identity provider could not update the profile.',
  })
  return { emailChanged, phoneChanged }
}

async function compensateProviderIdentity(userId, current) {
  await authSecret(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: {
      email: current.normalized_email,
      phone: current.normalized_phone,
      email_confirm: Boolean(current.email_verified_at),
      phone_confirm: Boolean(current.phone_verified_at),
      user_metadata: { full_name: current.full_name },
    },
    errorMessage: 'Identity provider compensation failed.',
  }).catch((error) => console.error('Profile identity compensation failed', error))
}

export async function updateAuthoritativeProfile(resolved, input) {
  const current = await loadProfile(resolved.user.id)
  if (!current) throw new HttpError(404, 'Account profile is unavailable.', 'profile-unavailable')
  const sensitive = input.email !== current.normalized_email || input.phone !== current.normalized_phone
  if (sensitive && !recentMfa(resolved.session)) {
    throw new HttpError(
      403,
      'Recent two-factor verification is required for email or phone changes.',
      'mfa-step-up-required',
    )
  }

  let provider = { emailChanged: false, phoneChanged: false }
  try {
    provider = await updateProviderIdentity(resolved.user.id, input, current)
    const { data } = await serviceRpc('wrs_update_profile', {
      p_user_id: resolved.user.id,
      p_session_id: resolved.session.id,
      p_full_name: input.fullName,
      p_country_code: input.countryCode,
      p_email: input.email,
      p_phone: input.phone,
    })
    const challenges = []
    if (provider.emailChanged) challenges.push(await issueVerificationChallenge(resolved.user.id, 'email', input.email))
    if (provider.phoneChanged) challenges.push(await issueVerificationChallenge(resolved.user.id, 'phone', input.phone))
    return { profile: data, challenges }
  } catch (error) {
    if (provider.emailChanged || provider.phoneChanged) await compensateProviderIdentity(resolved.user.id, current)
    throw error
  }
}

export async function updateAuthoritativeSettings(userId, input) {
  const { data } = await serviceRpc('wrs_update_user_settings', {
    p_user_id: userId,
    p_language: input.language,
    p_currency: input.currency,
    p_timezone: input.timezone,
    p_notifications: input.notificationsEnabled,
    p_marketing: input.marketingEnabled,
    p_biometric: input.biometricLoginEnabled,
    p_safety: input.safetyNotificationsEnabled,
  })
  return data
}

export async function requestAccountDeletion(resolved, reason) {
  if (!recentMfa(resolved.session)) {
    throw new HttpError(
      403,
      'Recent two-factor verification is required before deleting an account.',
      'mfa-step-up-required',
    )
  }
  const { data } = await serviceRpc('wrs_request_account_deletion', {
    p_user_id: resolved.user.id,
    p_session_id: resolved.session.id,
    p_reason: reason || null,
  })
  return data
}

export async function cancelAccountDeletion(resolved, requestId) {
  if (!recentMfa(resolved.session)) {
    throw new HttpError(
      403,
      'Recent two-factor verification is required to cancel account deletion.',
      'mfa-step-up-required',
    )
  }
  await serviceRpc('wrs_cancel_account_deletion', {
    p_user_id: resolved.user.id,
    p_session_id: resolved.session.id,
    p_request_id: requestId,
  })
  return { status: 'cancelled', requestId }
}

function redactedPhone(userId) {
  const value = BigInt(`0x${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16)}`) % 100000000000n
  return `+999${value.toString().padStart(11, '0')}`
}

export async function processNextAccountDeletion() {
  const { data: claim } = await serviceRpc('wrs_claim_next_account_deletion', {})
  if (!claim?.requestId || !claim?.userId) return null
  const email = `deleted+${String(claim.userId).replaceAll('-', '')}@invalid.wrs`
  const phone = redactedPhone(claim.userId)
  try {
    await authSecret(`/auth/v1/admin/users/${encodeURIComponent(claim.userId)}`, {
      method: 'PUT',
      body: {
        email,
        phone,
        password: crypto.randomBytes(32).toString('base64url'),
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { deleted: true },
      },
      errorMessage: 'Identity provider redaction failed.',
    })
    await serviceRpc('wrs_finalize_account_deletion', {
      p_request_id: claim.requestId,
      p_provider_redacted: true,
      p_audit_summary: { providerRedacted: true, workerAttempt: claim.attempt },
    })
    return { ...claim, status: 'completed' }
  } catch (error) {
    await serviceRpc('wrs_fail_account_deletion', {
      p_request_id: claim.requestId,
      p_error: error instanceof Error ? error.message : 'account deletion worker failed',
    }).catch(() => undefined)
    throw error
  }
}

export async function supportSnapshot(userId) {
  const { data: tickets } = await serviceRest(
    `/rest/v1/support_tickets?user_id=eq.${encodeURIComponent(userId)}&select=id,category,subject,status,priority,created_at,updated_at,resolved_at&order=created_at.desc&limit=100`,
  )
  const rows = Array.isArray(tickets) ? tickets : []
  const ids = rows.map((ticket) => ticket.id).filter(Boolean)
  let messages = []
  if (ids.length) {
    const { data } = await serviceRest(
      `/rest/v1/support_messages?ticket_id=in.(${ids.map((id) => encodeURIComponent(id)).join(',')})&select=id,ticket_id,author_role,body,created_at&order=created_at.asc,id.asc&limit=1000`,
    )
    messages = Array.isArray(data) ? data : []
  }
  return {
    tickets: rows.map((ticket) => ({
      ...ticket,
      messages: messages.filter((message) => message.ticket_id === ticket.id),
    })),
  }
}

export async function createSupportTicket(userId, input) {
  const { data } = await serviceRpc('wrs_create_support_ticket', {
    p_user_id: userId,
    p_category: input.category,
    p_subject: input.subject,
    p_message: input.message,
  })
  return { ticketId: String(data), status: 'open' }
}

export async function addSupportMessage(userId, ticketId, message) {
  const { data } = await serviceRpc('wrs_add_support_message', {
    p_user_id: userId,
    p_ticket_id: ticketId,
    p_message: message,
  })
  return { messageId: String(data) }
}

export async function knowledgeBaseSearch(query = '') {
  const { data } = await serviceRest(
    '/rest/v1/knowledge_base_articles?status=eq.published&select=id,slug,title,summary,body,category,published_at&order=published_at.desc&limit=200',
  )
  const rows = Array.isArray(data) ? data : []
  const q = String(query || '')
    .trim()
    .toLowerCase()
  return q
    ? rows
        .filter((row) => [row.title, row.summary, row.body, row.category].join(' ').toLowerCase().includes(q))
        .slice(0, 50)
    : rows.slice(0, 50)
}

export async function requireAdminSession(request, permission = 'operations.read', options = {}) {
  const resolved = await requireSession(request, { verified: true })
  const { data: allowed } = await serviceRpc('wrs_operator_has_permission', {
    p_user_id: resolved.user.id,
    p_permission: permission,
  })
  if (allowed !== true) throw new HttpError(403, 'You need access to this admin page.', 'operator-forbidden')
  if (options.stepUp && !recentMfa(resolved.session)) {
    throw new HttpError(403, 'Verify your security code before making this change.', 'mfa-step-up-required')
  }
  return resolved
}

async function recentRows(path) {
  const { data } = await serviceRest(path)
  if (!Array.isArray(data))
    throw new HttpError(502, 'An operations collection is unavailable.', 'operations-collection-unavailable')
  return data
}

async function exactCount(path) {
  const { response } = await serviceRest(path, {
    headers: { Prefer: 'count=exact', Range: '0-0' },
  })
  const contentRange = response.headers.get('content-range') || ''
  const total = Number(contentRange.slice(contentRange.lastIndexOf('/') + 1))
  if (!contentRange.includes('/') || !Number.isSafeInteger(total) || total < 0) {
    throw new HttpError(502, 'An operations metric count is unavailable.', 'operations-count-unavailable')
  }
  return total
}

async function optionalExactCount(path) {
  try {
    return await exactCount(path)
  } catch {
    return null
  }
}

async function operatorHasPermission(userId, permission) {
  const { data } = await serviceRpc('wrs_operator_has_permission', {
    p_user_id: userId,
    p_permission: permission,
  })
  return data === true
}

const overviewMetricQueries = [
  {
    key: 'kyc_pending',
    permission: 'operations.kyc',
    scope: 'users',
    query: () => exactCount('/rest/v1/user_profiles?status=neq.deleted&kyc_status=eq.pending&select=user_id'),
  },
  {
    key: 'support_open',
    permission: 'operations.support',
    scope: 'support',
    severity: 'attention',
    query: () => exactCount('/rest/v1/support_tickets?status=in.(open,in_progress)&select=id'),
  },
  {
    key: 'withdrawals_in_progress',
    permission: 'operations.finance',
    scope: 'finance',
    query: () => exactCount('/rest/v1/withdrawals?status=in.(reserved,provider_pending)&select=id'),
  },
  {
    key: 'deployment_requests',
    permission: 'operations.deployment',
    scope: 'deployments',
    query: () => exactCount('/rest/v1/deployment_requests?status=eq.requested&select=id'),
  },
  {
    key: 'data_submissions_review',
    permission: 'operations.data',
    scope: 'data',
    query: () => exactCount('/rest/v1/data_submissions?status=in.(submitted,processing,review)&select=id'),
  },
  {
    key: 'data_task_responses_review',
    permission: 'operations.data',
    scope: 'data',
    query: () => exactCount('/rest/v1/data_task_responses?status=in.(submitted,review)&select=id'),
  },
  {
    key: 'data_deletions_due',
    permission: 'operations.data',
    scope: 'data',
    severity: 'attention',
    query: () => {
      const now = encodeURIComponent(new Date().toISOString())
      return exactCount(`/rest/v1/data_deletion_requests?status=in.(requested,failed)&eligible_at=lte.${now}&select=id`)
    },
  },
  {
    key: 'referrals_pending',
    permission: 'operations.risk',
    scope: 'risk',
    query: () => exactCount('/rest/v1/referral_relationships?status=eq.pending&select=id'),
  },
]

const overviewTotalQueries = [
  ['users_total', 'operations.kyc', 'users', '/rest/v1/user_profiles?status=neq.deleted&select=user_id'],
  ['users_active', 'operations.kyc', 'users', '/rest/v1/user_profiles?status=eq.active&select=user_id'],
  ['users_pending', 'operations.kyc', 'users', '/rest/v1/user_profiles?status=eq.pending&select=user_id'],
  ['users_suspended', 'operations.kyc', 'users', '/rest/v1/user_profiles?status=eq.suspended&select=user_id'],
  ['support_total', 'operations.support', 'support', '/rest/v1/support_tickets?select=id'],
  [
    'support_finished',
    'operations.support',
    'support',
    '/rest/v1/support_tickets?status=in.(resolved,closed)&select=id',
  ],
  ['payments_total', 'operations.finance', 'finance', '/rest/v1/payment_intents?select=id'],
  ['payments_paid', 'operations.finance', 'finance', '/rest/v1/payment_intents?status=eq.succeeded&select=id'],
  ['withdrawals_total', 'operations.finance', 'finance', '/rest/v1/withdrawals?select=id'],
  ['withdrawals_paid', 'operations.finance', 'finance', '/rest/v1/withdrawals?status=eq.succeeded&select=id'],
  ['payouts_paid', 'operations.finance', 'finance', '/rest/v1/deployment_settlements?status=eq.settled&select=id'],
  ['robots_total', 'operations.deployment', 'deployments', '/rest/v1/robots?select=id'],
  ['robots_active', 'operations.deployment', 'deployments', '/rest/v1/robots?lifecycle=eq.active&select=id'],
  ['requests_total', 'operations.deployment', 'deployments', '/rest/v1/deployment_requests?select=id'],
  ['jobs_total', 'operations.deployment', 'deployments', '/rest/v1/deployments?select=id'],
  [
    'jobs_active',
    'operations.deployment',
    'deployments',
    '/rest/v1/deployments?status=in.(scheduled,active,paused)&select=id',
  ],
  ['jobs_completed', 'operations.deployment', 'deployments', '/rest/v1/deployments?status=eq.completed&select=id'],
  ['submissions_total', 'operations.data', 'data', '/rest/v1/data_submissions?select=id'],
  ['submissions_approved', 'operations.data', 'data', '/rest/v1/data_submissions?status=eq.approved&select=id'],
  ['training_total', 'operations.data', 'data', '/rest/v1/data_task_responses?select=id'],
  ['training_approved', 'operations.data', 'data', '/rest/v1/data_task_responses?status=eq.approved&select=id'],
  ['deletions_total', 'operations.data', 'data', '/rest/v1/data_deletion_requests?select=id'],
  ['referrals_total', 'operations.risk', 'risk', '/rest/v1/referral_relationships?select=id'],
  ['referrals_approved', 'operations.risk', 'risk', '/rest/v1/referral_relationships?status=eq.qualified&select=id'],
  ['community_reviews_total', 'operations.risk', 'risk', '/rest/v1/community_moderation_actions?select=id'],
].map(([key, permission, scope, path]) => ({ key, permission, scope, query: () => exactCount(path) }))

export async function operationsOverviewSummary(operatorUserId) {
  const permissionNames = [
    ...new Set([
      ...[...overviewMetricQueries, ...overviewTotalQueries].map((metric) => metric.permission),
      'operations.rewards',
    ]),
  ]
  const permissions = new Map(
    await Promise.all(
      permissionNames.map(async (permission) => [permission, await operatorHasPermission(operatorUserId, permission)]),
    ),
  )
  const loadMetrics = (queries) =>
    Promise.all(
      queries
        .filter((metric) => permissions.get(metric.permission))
        .map(async (metric) => {
          const value = await optionalExactCountQuery(metric.query)
          return {
            key: metric.key,
            value,
            status: value === null ? 'unavailable' : 'ready',
            scope: metric.scope,
            ...(metric.severity ? { severity: metric.severity } : {}),
          }
        }),
    )
  const [metrics, totals, recentUsers, rewardResult] = await Promise.all([
    loadMetrics(overviewMetricQueries),
    loadMetrics(overviewTotalQueries),
    permissions.get('operations.kyc')
      ? recentRows(
          '/rest/v1/user_profiles?status=neq.deleted&select=user_id,full_name,normalized_email,status,created_at&order=created_at.desc,user_id.asc&limit=5',
        ).catch(() => null)
      : null,
    permissions.get('operations.rewards')
      ? serviceRpc('wrs_mining_operations_snapshot', { p_operator_user_id: operatorUserId }).catch(() => null)
      : null,
  ])
  let issuance = null
  if (permissions.get('operations.rewards')) {
    const data = rewardResult?.data
    if (data?.issuance) {
      issuance = { ...data.issuance, status: 'ready' }
      const activeRule = (data.rules || []).find((rule) => rule.status === 'active')
      metrics.push({
        key: 'reward_policy',
        value: activeRule ? (issuance.enabled ? 'active_enabled' : 'active_disabled') : 'disabled',
        status: 'ready',
        scope: 'rewards',
      })
    } else {
      issuance = { status: 'unavailable' }
      metrics.push({ key: 'reward_policy', value: null, status: 'unavailable', scope: 'rewards' })
    }
  }
  return { generatedAt: new Date().toISOString(), metrics, totals, recentUsers, issuance }
}

async function optionalExactCountQuery(query) {
  try {
    return await query()
  } catch {
    return null
  }
}

const OPERATIONS_ROW_LIMIT = 100
const RELATED_LOOKUP_LIMIT = 100
const SUPPORT_MESSAGE_ROW_LIMIT = 1000

function uniqueIds(rows, field) {
  return [
    ...new Set(
      rows.map((row) => row?.[field]).filter((value) => value !== null && value !== undefined && String(value) !== ''),
    ),
  ]
}

function uniqueValues(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && String(value) !== ''))]
}

function inFilter(field, values) {
  return `${field}=in.(${values.map((value) => encodeURIComponent(String(value))).join(',')})`
}

function batches(values, size = RELATED_LOOKUP_LIMIT) {
  const result = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

async function relatedRows(path, rowLimit = RELATED_LOOKUP_LIMIT) {
  try {
    // Fetch one extra row so a bounded one-to-many lookup is never presented as
    // complete. The caller receives the first deterministic rows plus an
    // explicit truncation flag when the source has more data.
    const separator = path.includes('?') ? '&' : '?'
    const { data, response } = await serviceRest(`${path}${separator}limit=${rowLimit + 1}`, {
      headers: { Prefer: 'count=exact' },
    })
    if (!Array.isArray(data)) throw new Error('Related data response was not a row collection.')
    const range = response?.headers?.get('content-range') || ''
    const exactTotal = range.includes('/') && !range.endsWith('/*') ? Number(range.split('/').at(-1)) : null
    const truncated = data.length > rowLimit || (Number.isFinite(exactTotal) && exactTotal > data.length)
    return { rows: truncated ? data.slice(0, rowLimit) : data, unavailable: false, truncated, missing: false }
  } catch {
    return { rows: [], unavailable: true, truncated: false, missing: false }
  }
}

async function relatedRowsByIds(
  table,
  field,
  ids,
  select,
  { rowLimit = RELATED_LOOKUP_LIMIT, order = '', filters = [], requireAll = false } = {},
) {
  if (!ids.length) return { rows: [], unavailable: false, truncated: false, missing: false }
  const results = await Promise.all(
    batches(ids).map((batch) => {
      const orderFilter = order ? `&order=${order}` : ''
      const extraFilters = filters.length ? `&${filters.join('&')}` : ''
      return relatedRows(
        `/rest/v1/${table}?${inFilter(field, batch)}&select=${select}${orderFilter}${extraFilters}`,
        rowLimit,
      )
    }),
  )
  const rows = results.flatMap((result) => result.rows)
  const returnedIds = new Set(
    rows
      .map((row) => row?.[field])
      .filter(Boolean)
      .map((value) => String(value)),
  )
  const missing = requireAll && ids.some((id) => !returnedIds.has(String(id)))
  return {
    rows,
    unavailable: results.some((result) => result.unavailable) || missing,
    truncated: results.some((result) => result.truncated),
    missing,
  }
}

function rowsBy(rows, field = 'id') {
  return new Map(
    rows.filter((row) => row?.[field] !== null && row?.[field] !== undefined).map((row) => [String(row[field]), row]),
  )
}

function userContext(profile) {
  return {
    user_name: profile?.full_name ?? null,
    user_email: profile?.normalized_email ?? null,
    country_code: profile?.country_code ?? null,
    country: profile?.country_code ?? null,
  }
}

function withRelatedFailure(row, unavailable, truncated = false) {
  return {
    ...row,
    ...(unavailable ? { relatedDataUnavailable: true } : {}),
    ...(truncated ? { relatedDataTruncated: true } : {}),
  }
}

async function loadProfilesForRows(rows, fields = ['user_id']) {
  const ids = uniqueValues(fields.flatMap((field) => uniqueIds(rows, field)))
  return relatedRowsByIds('user_profiles', 'user_id', ids, 'user_id,full_name,normalized_email,country_code', {
    requireAll: true,
  })
}

async function enrichJobs(rows, { profiles, robots, opportunities, unavailable = false } = {}) {
  const profileMap = rowsBy(Array.isArray(profiles) ? profiles : profiles?.rows || [], 'user_id')
  const robotMap = rowsBy(Array.isArray(robots) ? robots : robots?.rows || [])
  const opportunityMap = rowsBy(Array.isArray(opportunities) ? opportunities : opportunities?.rows || [])
  const truncated = Boolean(profiles?.truncated || robots?.truncated || opportunities?.truncated)
  return rows.map((row) => {
    const profile = row?.user_id ? profileMap.get(String(row.user_id)) : null
    const robot = row?.robot_id ? robotMap.get(String(row.robot_id)) : null
    const opportunity = row?.opportunity_id ? opportunityMap.get(String(row.opportunity_id)) : null
    const next = {
      ...row,
      ...(row?.user_id ? userContext(profile) : {}),
      ...(row?.robot_id ? { robot_name: robot?.name ?? null } : {}),
      ...(row?.opportunity_id
        ? {
            job_title: opportunity?.title ?? row.job_title ?? null,
            job_description: opportunity?.description ?? row.job_description ?? null,
            rate_minor: opportunity?.rate_minor ?? row.rate_minor ?? null,
            rate_unit: opportunity?.rate_unit ?? row.rate_unit ?? null,
            currency: opportunity?.currency ?? row.currency ?? null,
          }
        : {}),
    }
    return withRelatedFailure(next, unavailable, truncated)
  })
}

async function loadJobRelatedRows(rows) {
  const [profiles, robots, opportunities] = await Promise.all([
    loadProfilesForRows(rows),
    relatedRowsByIds('robots', 'id', uniqueIds(rows, 'robot_id'), 'id,name', { requireAll: true }),
    relatedRowsByIds(
      'deployment_opportunities',
      'id',
      uniqueIds(rows, 'opportunity_id'),
      'id,title,description,status,rate_minor,rate_unit,currency',
      { requireAll: true },
    ),
  ])
  return {
    profiles,
    robots,
    opportunities,
    unavailable: profiles.unavailable || robots.unavailable || opportunities.unavailable,
    truncated: profiles.truncated || robots.truncated || opportunities.truncated,
  }
}

async function countStats(definitions) {
  const entries = await Promise.all(
    Object.entries(definitions).map(async ([key, path]) => [key, await optionalExactCount(path)]),
  )
  return Object.fromEntries(entries)
}

function packageName(slug) {
  return String(slug || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function sortChronologically(rows) {
  return [...rows].sort((left, right) => {
    const leftTime = new Date(left?.created_at || 0).getTime()
    const rightTime = new Date(right?.created_at || 0).getTime()
    if (leftTime !== rightTime) return leftTime - rightTime
    return String(left?.id || '').localeCompare(String(right?.id || ''))
  })
}

async function enrichSupportRows(rows) {
  const ticketIds = uniqueIds(rows, 'id')
  const messageResult = await relatedRowsByIds(
    'support_messages',
    'ticket_id',
    ticketIds,
    'id,ticket_id,author_user_id,author_role,body,created_at',
    { rowLimit: SUPPORT_MESSAGE_ROW_LIMIT, order: 'created_at.desc,id.desc' },
  )
  const actorIds = uniqueValues([
    ...uniqueIds(rows, 'user_id'),
    ...uniqueIds(rows, 'assigned_operator_id'),
    ...uniqueIds(messageResult.rows, 'author_user_id'),
  ])
  const profileResult = await relatedRowsByIds(
    'user_profiles',
    'user_id',
    actorIds,
    'user_id,full_name,normalized_email,country_code',
    { requireAll: true },
  )
  const profileMap = rowsBy(profileResult.rows, 'user_id')
  const messagesByTicket = new Map()
  for (const message of sortChronologically(messageResult.rows)) {
    const actor = message.author_user_id ? profileMap.get(String(message.author_user_id)) : null
    const enriched = {
      ...message,
      author_name: actor?.full_name ?? null,
      author_email: actor?.normalized_email ?? null,
      actor_name: actor?.full_name ?? null,
      actor_email: actor?.normalized_email ?? null,
    }
    const collection = messagesByTicket.get(String(message.ticket_id)) || []
    collection.push(enriched)
    messagesByTicket.set(String(message.ticket_id), collection)
  }
  return rows.map((ticket) => {
    const owner = ticket.user_id ? profileMap.get(String(ticket.user_id)) : null
    const operator = ticket.assigned_operator_id ? profileMap.get(String(ticket.assigned_operator_id)) : null
    const next = {
      ...ticket,
      ...(ticket.user_id ? userContext(owner) : {}),
      ...(ticket.assigned_operator_id
        ? {
            assigned_operator_name: operator?.full_name ?? null,
            assigned_operator_email: operator?.normalized_email ?? null,
            assigned_name: operator?.full_name ?? null,
            assigned_email: operator?.normalized_email ?? null,
          }
        : {}),
      messages: messageResult.unavailable ? null : messagesByTicket.get(String(ticket.id)) || [],
      ...(messageResult.truncated ? { messages_truncated: true } : {}),
    }
    return withRelatedFailure(
      next,
      messageResult.unavailable || profileResult.unavailable,
      messageResult.truncated || profileResult.truncated,
    )
  })
}

function safeAssetMetadata(asset) {
  if (!asset) return null
  return {
    id: asset.id,
    user_id: asset.user_id,
    purpose_slug: asset.purpose_slug,
    data_category: asset.data_category,
    mime_type: asset.mime_type,
    size_bytes: asset.size_bytes,
    checksum_sha256: asset.checksum_sha256,
    scan_status: asset.scan_status,
    status: asset.status,
    uploaded_at: asset.uploaded_at,
    created_at: asset.created_at,
    updated_at: asset.updated_at,
  }
}

async function enrichSubmissionRows(rows) {
  const [profiles, assets] = await Promise.all([
    loadProfilesForRows(rows),
    relatedRowsByIds(
      'data_assets',
      'id',
      uniqueIds(rows, 'asset_id'),
      'id,user_id,purpose_slug,data_category,mime_type,size_bytes,checksum_sha256,scan_status,status,uploaded_at,created_at,updated_at',
      { requireAll: true },
    ),
  ])
  const profileMap = rowsBy(profiles.rows, 'user_id')
  const assetMap = rowsBy(assets.rows)
  const unavailable = profiles.unavailable || assets.unavailable
  const truncated = profiles.truncated || assets.truncated
  return rows.map((row) => {
    const profile = row.user_id ? profileMap.get(String(row.user_id)) : null
    const asset = row.asset_id ? safeAssetMetadata(assetMap.get(String(row.asset_id))) : null
    const next = {
      ...row,
      ...(row.user_id ? userContext(profile) : {}),
      ...(row.asset_id
        ? {
            asset,
            data_category: asset?.data_category ?? null,
            mime_type: asset?.mime_type ?? null,
            size_bytes: asset?.size_bytes ?? null,
            scan_status: asset?.scan_status ?? null,
          }
        : {}),
    }
    return withRelatedFailure(next, unavailable, truncated)
  })
}

async function enrichDeletionRows(rows) {
  const [profiles, assets] = await Promise.all([
    loadProfilesForRows(rows),
    relatedRowsByIds(
      'data_assets',
      'id',
      uniqueIds(rows, 'asset_id'),
      'id,user_id,purpose_slug,data_category,mime_type,size_bytes,checksum_sha256,scan_status,status,uploaded_at,created_at,updated_at',
      { requireAll: true },
    ),
  ])
  const profileMap = rowsBy(profiles.rows, 'user_id')
  const assetMap = rowsBy(assets.rows)
  const unavailable = profiles.unavailable || assets.unavailable
  const truncated = profiles.truncated || assets.truncated
  return rows.map((row) => {
    const profile = row.user_id ? profileMap.get(String(row.user_id)) : null
    const asset = row.asset_id ? safeAssetMetadata(assetMap.get(String(row.asset_id))) : null
    const next = {
      ...row,
      ...(row.user_id ? userContext(profile) : {}),
      data_category: asset?.data_category ?? row.data_category ?? null,
      ...(row.asset_id ? { asset } : {}),
    }
    return withRelatedFailure(next, unavailable, truncated)
  })
}

function referralEligibility(row, profile, { profilesUnavailable = false } = {}) {
  if (row.status === 'qualified') {
    return {
      eligibility_status: 'ready',
      eligibility_reason: 'Referral is already approved.',
      eligible_at: row.eligible_at ?? null,
    }
  }
  if (row.status === 'rejected') {
    return {
      eligibility_status: 'unverified',
      eligibility_reason: 'Referral was rejected.',
      eligible_at: row.eligible_at ?? null,
    }
  }
  if (profilesUnavailable) {
    return {
      eligibility_status: 'unavailable',
      eligibility_reason: 'Invited user details are unavailable. Refresh to retry.',
      eligible_at: row.eligible_at ?? null,
    }
  }
  if (!profile) {
    return {
      eligibility_status: 'unverified',
      eligibility_reason: 'Invited user details could not be verified.',
      eligible_at: row.eligible_at ?? null,
    }
  }
  if (profile.status !== 'active') {
    return {
      eligibility_status: 'unverified',
      eligibility_reason: 'Invited user is not active.',
      eligible_at: row.eligible_at ?? null,
    }
  }
  if (!profile.email_verified_at) {
    return {
      eligibility_status: 'unverified',
      eligibility_reason: 'Invited user email is not verified.',
      eligible_at: row.eligible_at ?? null,
    }
  }
  return {
    eligibility_status: 'ready',
    eligibility_reason: 'Ready for approval.',
    eligible_at: row.eligible_at ?? null,
  }
}

const moderationTargetSources = {
  event: {
    table: 'community_events',
    field: 'id',
    select: 'id,title,description',
    name: 'title',
    content: 'description',
  },
  community_event: {
    table: 'community_events',
    field: 'id',
    select: 'id,title,description',
    name: 'title',
    content: 'description',
  },
  announcement: {
    table: 'community_announcements',
    field: 'id',
    select: 'id,title,body',
    name: 'title',
    content: 'body',
  },
  community_announcement: {
    table: 'community_announcements',
    field: 'id',
    select: 'id,title,body',
    name: 'title',
    content: 'body',
  },
  marketplace_review: {
    table: 'marketplace_reviews',
    field: 'id',
    select: 'id,review_text,rating',
    name: null,
    content: 'review_text',
  },
  review: {
    table: 'marketplace_reviews',
    field: 'id',
    select: 'id,review_text,rating',
    name: null,
    content: 'review_text',
  },
  community_profile: {
    table: 'community_leaderboard_profiles',
    field: 'user_id',
    select: 'user_id,display_alias',
    name: 'display_alias',
    content: null,
  },
  profile: {
    table: 'community_leaderboard_profiles',
    field: 'user_id',
    select: 'user_id,display_alias',
    name: 'display_alias',
    content: null,
  },
}

const OPERATOR_REFERENCE = /^operator:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

function operatorReferenceUserId(value) {
  const match = OPERATOR_REFERENCE.exec(String(value || ''))
  return match ? match[1].toLowerCase() : null
}

async function enrichModerationRows(rows) {
  const reviewerIds = uniqueValues(rows.map((row) => operatorReferenceUserId(row.operator_reference)))
  const reviewerResult = await relatedRowsByIds(
    'user_profiles',
    'user_id',
    reviewerIds,
    'user_id,full_name,normalized_email',
    { requireAll: true },
  )
  const reviewerMap = rowsBy(reviewerResult.rows, 'user_id')
  const results = new Map()
  await Promise.all(
    Object.entries(moderationTargetSources).map(async ([targetType, source]) => {
      const ids = uniqueValues(rows.filter((row) => row.target_type === targetType).map((row) => row.target_id))
      if (!ids.length) return
      const result = await relatedRowsByIds(source.table, source.field, ids, source.select, { requireAll: true })
      results.set(targetType, { source, ...result, byId: rowsBy(result.rows, source.field) })
    }),
  )
  return rows.map((row) => {
    const result = results.get(row.target_type)
    const target = result?.byId.get(String(row.target_id))
    const reviewerId = operatorReferenceUserId(row.operator_reference)
    const reviewer = reviewerId ? reviewerMap.get(reviewerId) : null
    const next = {
      ...row,
      reviewer_name: reviewer?.full_name ?? null,
      reviewer_email: reviewer?.normalized_email ?? null,
      ...(result
        ? {
            target_name: result.source.name ? (target?.[result.source.name] ?? null) : null,
            target_content: result.source.content ? (target?.[result.source.content] ?? null) : null,
          }
        : {}),
    }
    return withRelatedFailure(
      next,
      (result ? Boolean(result.unavailable) : true) || reviewerResult.unavailable,
      Boolean(result?.truncated) || reviewerResult.truncated,
    )
  })
}

export async function operationsSnapshot(scope = 'overview') {
  const safeScope = String(scope || 'overview')
  if (safeScope === 'users') {
    const profileFields =
      'user_id,full_name,normalized_email,status,kyc_status,country_code,email_verified_at,phone_verified_at,created_at,updated_at'
    const [users, identityChecks, total, active, pending, suspended, verificationPending, verified] = await Promise.all(
      [
        recentRows(`/rest/v1/user_profiles?status=neq.deleted&select=${profileFields}&order=created_at.desc&limit=100`),
        recentRows(
          `/rest/v1/user_profiles?status=neq.deleted&kyc_status=eq.pending&select=${profileFields}&order=updated_at.asc&limit=100`,
        ).catch(() => null),
        optionalExactCount('/rest/v1/user_profiles?status=neq.deleted&select=user_id'),
        optionalExactCount('/rest/v1/user_profiles?status=eq.active&select=user_id'),
        optionalExactCount('/rest/v1/user_profiles?status=eq.pending&select=user_id'),
        optionalExactCount('/rest/v1/user_profiles?status=eq.suspended&select=user_id'),
        optionalExactCount('/rest/v1/user_profiles?status=neq.deleted&kyc_status=eq.pending&select=user_id'),
        optionalExactCount('/rest/v1/user_profiles?status=neq.deleted&kyc_status=eq.verified&select=user_id'),
      ],
    )
    return {
      users,
      identityChecks,
      userStats: { total, active, pending, suspended, verificationPending, verified },
    }
  }
  if (safeScope === 'support') {
    const rows = await recentRows(
      `/rest/v1/support_tickets?select=id,user_id,category,subject,status,priority,assigned_operator_id,created_at,updated_at,resolved_at&order=updated_at.desc&limit=${OPERATIONS_ROW_LIMIT}`,
    )
    const [support, stats] = await Promise.all([
      enrichSupportRows(rows),
      countStats({
        total: '/rest/v1/support_tickets?select=id',
        open: '/rest/v1/support_tickets?status=in.(open,in_progress)&select=id',
        waiting: '/rest/v1/support_tickets?status=eq.waiting_user&select=id',
        resolved: '/rest/v1/support_tickets?status=in.(resolved,closed)&select=id',
      }),
    ])
    return { support, stats: { support: stats } }
  }
  if (safeScope === 'finance') {
    const [withdrawals, payments, settlements] = await Promise.all([
      recentRows(
        `/rest/v1/withdrawals?select=id,user_id,amount_minor,currency,status,created_at,updated_at&order=created_at.desc&limit=${OPERATIONS_ROW_LIMIT}`,
      ),
      recentRows(
        `/rest/v1/payment_intents?select=id,user_id,package_slug,amount_minor,currency,status,created_at,updated_at&order=created_at.desc&limit=${OPERATIONS_ROW_LIMIT}`,
      ),
      recentRows(
        `/rest/v1/deployments?status=eq.completed&select=id,user_id,robot_id,opportunity_id,status,completed_at,updated_at&order=completed_at.desc&limit=${OPERATIONS_ROW_LIMIT}`,
      ),
    ])
    const [withdrawalProfiles, paymentProfiles, jobRelated, settlementRows, stats] = await Promise.all([
      loadProfilesForRows(withdrawals),
      loadProfilesForRows(payments),
      loadJobRelatedRows(settlements),
      relatedRowsByIds(
        'deployment_settlements',
        'deployment_id',
        uniqueIds(settlements, 'id'),
        'id,deployment_id,user_id,amount_minor,currency,verified_work_count,status,settled_at',
      ),
      Promise.all([
        countStats({
          total: '/rest/v1/payment_intents?select=id',
          paid: '/rest/v1/payment_intents?status=eq.succeeded&select=id',
          pending: '/rest/v1/payment_intents?status=in.(initialized,pending)&select=id',
          failed: '/rest/v1/payment_intents?status=in.(failed,refunded,reversed)&select=id',
        }),
        countStats({
          total: '/rest/v1/withdrawals?select=id',
          inProgress: '/rest/v1/withdrawals?status=in.(reserved,provider_pending)&select=id',
          paid: '/rest/v1/withdrawals?status=eq.succeeded&select=id',
          failed: '/rest/v1/withdrawals?status=in.(failed,reversed)&select=id',
        }),
        countStats({
          total: '/rest/v1/deployments?status=eq.completed&select=id',
          ready:
            '/rest/v1/deployments?status=eq.completed&select=id,deployment_settlements!left(id)&deployment_settlements=is.null',
          paid: '/rest/v1/deployment_settlements?status=eq.settled&select=id',
        }),
      ]),
    ])
    const paymentProfileMap = rowsBy(paymentProfiles.rows, 'user_id')
    const withdrawalProfileMap = rowsBy(withdrawalProfiles.rows, 'user_id')
    const enrichedPayments = payments.map((row) => {
      const profile = row.user_id ? paymentProfileMap.get(String(row.user_id)) : null
      return withRelatedFailure(
        {
          ...row,
          ...(row.user_id ? userContext(profile) : {}),
          plan_name: packageName(row.package_slug),
          current_package: row.package_slug,
        },
        paymentProfiles.unavailable,
      )
    })
    const enrichedWithdrawals = withdrawals.map((row) => {
      const profile = row.user_id ? withdrawalProfileMap.get(String(row.user_id)) : null
      return withRelatedFailure(
        { ...row, ...(row.user_id ? userContext(profile) : {}) },
        withdrawalProfiles.unavailable,
      )
    })
    const settlementMap = rowsBy(settlementRows.rows, 'deployment_id')
    const enrichedSettlements = await enrichJobs(settlements, jobRelated)
    const finalSettlements = enrichedSettlements.map((row) => {
      const settlement = settlementMap.get(String(row.id))
      const next = settlementRows.unavailable
        ? {
            ...row,
            payout_status: 'unavailable',
            settlement_unavailable: true,
          }
        : settlement
          ? {
              ...row,
              settlement_id: settlement.id,
              settlement_amount_minor: settlement.amount_minor,
              amount_minor: settlement.amount_minor,
              currency: settlement.currency,
              verified_work_count: settlement.verified_work_count,
              settlement_status: settlement.status,
              paid_status: settlement.status === 'settled' ? 'paid' : settlement.status,
              payout_status: settlement.status,
              settled_at: settlement.settled_at,
            }
          : {
              ...row,
              paid_status: 'unpaid',
              payout_status: 'ready',
            }
      return withRelatedFailure(next, row.relatedDataUnavailable || settlementRows.unavailable)
    })
    return {
      withdrawals: enrichedWithdrawals,
      payments: enrichedPayments,
      settlements: finalSettlements,
      stats: { payments: stats[0], withdrawals: stats[1], settlements: stats[2] },
    }
  }
  if (safeScope === 'deployments') {
    const [deploymentRequests, deployments] = await Promise.all([
      recentRows(
        `/rest/v1/deployment_requests?select=id,user_id,robot_id,opportunity_id,status,requested_at,matched_at,decided_at&order=requested_at.desc&limit=${OPERATIONS_ROW_LIMIT}`,
      ),
      recentRows(
        `/rest/v1/deployments?select=id,user_id,robot_id,opportunity_id,status,version,created_at,updated_at,completed_at&order=updated_at.desc&limit=${OPERATIONS_ROW_LIMIT}`,
      ),
    ])
    const [requestRelated, deploymentRelated, stats] = await Promise.all([
      loadJobRelatedRows(deploymentRequests),
      loadJobRelatedRows(deployments),
      Promise.all([
        countStats({
          total: '/rest/v1/deployment_requests?select=id',
          requested: '/rest/v1/deployment_requests?status=eq.requested&select=id',
          matched: '/rest/v1/deployment_requests?status=in.(matched,accepted)&select=id',
          cancelled: '/rest/v1/deployment_requests?status=eq.cancelled&select=id',
        }),
        countStats({
          total: '/rest/v1/deployments?select=id',
          active: '/rest/v1/deployments?status=in.(scheduled,active,paused)&select=id',
          completed: '/rest/v1/deployments?status=eq.completed&select=id',
          failed: '/rest/v1/deployments?status=in.(failed,cancelled)&select=id',
        }),
      ]),
    ])
    return {
      deploymentRequests: await enrichJobs(deploymentRequests, requestRelated),
      deployments: await enrichJobs(deployments, deploymentRelated),
      stats: { deploymentRequests: stats[0], deployments: stats[1] },
    }
  }
  if (safeScope === 'data') {
    const [submissions, taskResponses, deletions] = await Promise.all([
      recentRows(
        `/rest/v1/data_submissions?select=id,asset_id,user_id,status,quality_score,submission_metadata,review_notes,submitted_at,reviewed_at&order=submitted_at.desc&limit=${OPERATIONS_ROW_LIMIT}`,
      ),
      recentRows(
        `/rest/v1/data_task_responses?select=id,user_id,task_slug,data_category,status,quality_score,submitted_at,reviewed_at,response&order=submitted_at.desc&limit=${OPERATIONS_ROW_LIMIT}`,
      ),
      recentRows(
        `/rest/v1/data_deletion_requests?select=id,user_id,asset_id,reason,status,eligible_at,attempt_count,requested_at,completed_at&order=requested_at.desc&limit=${OPERATIONS_ROW_LIMIT}`,
      ),
    ])
    const [enrichedSubmissions, taskProfiles, enrichedDeletions, stats] = await Promise.all([
      enrichSubmissionRows(submissions),
      loadProfilesForRows(taskResponses),
      enrichDeletionRows(deletions),
      Promise.all([
        countStats({
          total: '/rest/v1/data_submissions?select=id',
          pending: '/rest/v1/data_submissions?status=in.(submitted,processing,review)&select=id',
          approved: '/rest/v1/data_submissions?status=eq.approved&select=id',
          rejected: '/rest/v1/data_submissions?status=eq.rejected&select=id',
        }),
        countStats({
          total: '/rest/v1/data_task_responses?select=id',
          pending: '/rest/v1/data_task_responses?status=in.(submitted,review)&select=id',
          approved: '/rest/v1/data_task_responses?status=eq.approved&select=id',
          rejected: '/rest/v1/data_task_responses?status=eq.rejected&select=id',
        }),
        countStats({
          total: '/rest/v1/data_deletion_requests?select=id',
          pending: '/rest/v1/data_deletion_requests?status=in.(requested,processing)&select=id',
          completed: '/rest/v1/data_deletion_requests?status=eq.completed&select=id',
          failed: '/rest/v1/data_deletion_requests?status=eq.failed&select=id',
        }),
      ]),
    ])
    const taskProfileMap = rowsBy(taskProfiles.rows, 'user_id')
    const enrichedTaskResponses = taskResponses.map((row) =>
      withRelatedFailure(
        { ...row, ...(row.user_id ? userContext(taskProfileMap.get(String(row.user_id))) : {}) },
        taskProfiles.unavailable,
        taskProfiles.truncated,
      ),
    )
    return {
      submissions: enrichedSubmissions,
      taskResponses: enrichedTaskResponses,
      deletions: enrichedDeletions,
      stats: { submissions: stats[0], taskResponses: stats[1], deletions: stats[2] },
    }
  }
  if (safeScope === 'risk') {
    const [referrals, moderation] = await Promise.all([
      recentRows(
        `/rest/v1/referral_relationships?select=id,referrer_user_id,referred_user_id,referral_code,status,eligible_at,qualified_at,created_at&order=created_at.desc&limit=${OPERATIONS_ROW_LIMIT}`,
      ),
      recentRows(
        `/rest/v1/community_moderation_actions?select=id,target_type,target_id,action,reason,operator_reference,created_at&order=created_at.desc&limit=${OPERATIONS_ROW_LIMIT}`,
      ),
    ])
    const referralUserIds = uniqueValues([
      ...uniqueIds(referrals, 'referrer_user_id'),
      ...uniqueIds(referrals, 'referred_user_id'),
    ])
    const [referralProfiles, enrichedModeration, stats] = await Promise.all([
      relatedRowsByIds(
        'user_profiles',
        'user_id',
        referralUserIds,
        'user_id,full_name,normalized_email,country_code,status,email_verified_at',
        { requireAll: true },
      ),
      enrichModerationRows(moderation),
      Promise.all([
        countStats({
          total: '/rest/v1/referral_relationships?select=id',
          pending: '/rest/v1/referral_relationships?status=eq.pending&select=id',
          qualified: '/rest/v1/referral_relationships?status=eq.qualified&select=id',
          rejected: '/rest/v1/referral_relationships?status=eq.rejected&select=id',
        }),
        countStats({
          total: '/rest/v1/community_moderation_actions?select=id',
          profiles: '/rest/v1/community_moderation_actions?target_type=eq.community_profile&select=id',
          events: '/rest/v1/community_moderation_actions?target_type=eq.event&select=id',
          announcements: '/rest/v1/community_moderation_actions?target_type=eq.announcement&select=id',
        }),
      ]),
    ])
    const referralProfileMap = rowsBy(referralProfiles.rows, 'user_id')
    const enrichedReferrals = referrals.map((row) => {
      const inviter = row.referrer_user_id ? referralProfileMap.get(String(row.referrer_user_id)) : null
      const referred = row.referred_user_id ? referralProfileMap.get(String(row.referred_user_id)) : null
      const eligibility = referralEligibility(row, referred, { profilesUnavailable: referralProfiles.unavailable })
      return withRelatedFailure(
        {
          ...row,
          inviter_name: inviter?.full_name ?? null,
          inviter_email: inviter?.normalized_email ?? null,
          referrer_name: inviter?.full_name ?? null,
          referrer_email: inviter?.normalized_email ?? null,
          referred_name: referred?.full_name ?? null,
          referred_email: referred?.normalized_email ?? null,
          ...eligibility,
        },
        referralProfiles.unavailable,
        referralProfiles.truncated,
      )
    })
    return {
      referrals: enrichedReferrals,
      moderation: enrichedModeration,
      stats: { referrals: stats[0], moderation: stats[1] },
    }
  }
  return {}
}

export async function recordOperationsAction(
  operatorUserId,
  permission,
  targetType,
  targetId,
  action,
  reason,
  metadata = {},
) {
  const { data } = await serviceRpc('wrs_record_operations_action', {
    p_operator_user_id: operatorUserId,
    p_permission: permission,
    p_target_type: targetType,
    p_target_id: targetId,
    p_action: action,
    p_reason: reason,
    p_metadata: metadata,
  })
  return { auditId: Number(data) }
}

export async function updateSupportAsOperator(operatorUserId, input) {
  await serviceRpc('wrs_staff_update_support_ticket', {
    p_operator_user_id: operatorUserId,
    p_ticket_id: input.ticketId,
    p_status: input.status,
    p_priority: input.priority,
    p_message: input.message || '',
    p_reason: input.reason,
  })
  return { status: input.status }
}

export async function setUserStatusAsOperator(operatorUserId, userId, status, reason) {
  if (!['active', 'suspended'].includes(status))
    throw new HttpError(400, 'Unsupported account status.', 'invalid-status')
  const { data: changed } = await serviceRest(
    `/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&status=neq.deleted`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: { status, updated_at: new Date().toISOString() },
    },
  )
  if (!Array.isArray(changed) || changed.length !== 1)
    throw new HttpError(404, 'This user account is no longer available.', 'user-not-found')
  await recordOperationsAction(operatorUserId, 'operations.security', 'user', userId, `user.${status}`, reason)
  return { userId, status }
}

export async function setKycAsOperator(operatorUserId, userId, kycStatus, reason) {
  if (!['unverified', 'pending', 'verified', 'rejected'].includes(kycStatus)) {
    throw new HttpError(400, 'Choose a valid identity check status.', 'invalid-kyc-status')
  }
  const { data: changed } = await serviceRest(
    `/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&status=neq.deleted`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: { kyc_status: kycStatus, updated_at: new Date().toISOString() },
    },
  )
  if (!Array.isArray(changed) || changed.length !== 1)
    throw new HttpError(404, 'This user account is no longer available.', 'user-not-found')
  await recordOperationsAction(operatorUserId, 'operations.kyc', 'user', userId, 'kyc.set', reason, { kycStatus })
  return { userId, kycStatus }
}
