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
  if (allowed !== true) throw new HttpError(403, 'Operator permission is required.', 'operator-forbidden')
  if (options.stepUp && !recentMfa(resolved.session)) {
    throw new HttpError(403, 'Recent MFA step-up is required for this operator action.', 'mfa-step-up-required')
  }
  return resolved
}

async function recentRows(path) {
  const { data } = await serviceRest(path)
  return Array.isArray(data) ? data : []
}

export async function operationsSnapshot(scope = 'overview') {
  const safeScope = String(scope || 'overview')
  if (safeScope === 'users') {
    return {
      users: await recentRows(
        '/rest/v1/user_profiles?select=user_id,status,kyc_status,country_code,email_verified_at,phone_verified_at,created_at,updated_at&order=created_at.desc&limit=100',
      ),
    }
  }
  if (safeScope === 'support') {
    return {
      support: await recentRows(
        '/rest/v1/support_tickets?select=id,user_id,category,subject,status,priority,assigned_operator_id,created_at,updated_at&order=updated_at.desc&limit=100',
      ),
    }
  }
  if (safeScope === 'finance') {
    return {
      withdrawals: await recentRows(
        '/rest/v1/withdrawals?select=id,user_id,amount_minor,currency,status,created_at,updated_at&order=created_at.desc&limit=100',
      ),
      payments: await recentRows(
        '/rest/v1/payment_intents?select=id,user_id,package_slug,amount_minor,currency,status,created_at,updated_at&order=created_at.desc&limit=100',
      ),
    }
  }
  if (safeScope === 'deployments') {
    return {
      deployments: await recentRows(
        '/rest/v1/deployments?select=id,user_id,robot_id,opportunity_id,status,version,created_at,updated_at&order=updated_at.desc&limit=100',
      ),
    }
  }
  if (safeScope === 'data') {
    return {
      submissions: await recentRows(
        '/rest/v1/data_submissions?select=id,user_id,status,quality_score,submitted_at,reviewed_at&order=submitted_at.desc&limit=100',
      ),
      deletions: await recentRows(
        '/rest/v1/data_deletion_requests?select=id,user_id,status,eligible_at,attempt_count,requested_at,completed_at&order=requested_at.desc&limit=100',
      ),
    }
  }
  if (safeScope === 'risk') {
    return {
      referrals: await recentRows(
        '/rest/v1/referral_relationships?select=id,referrer_user_id,referred_user_id,status,eligible_at,qualified_at,created_at&order=created_at.desc&limit=100',
      ),
      moderation: await recentRows(
        '/rest/v1/community_moderation_actions?select=id,target_type,target_id,action,reason,operator_reference,occurred_at&order=occurred_at.desc&limit=100',
      ),
    }
  }
  return {
    accountDeletions: await recentRows(
      '/rest/v1/account_deletion_requests?select=id,user_id,status,eligible_at,attempt_count,requested_at&order=requested_at.desc&limit=50',
    ),
    support: await recentRows(
      '/rest/v1/support_tickets?select=id,user_id,category,status,priority,updated_at&order=updated_at.desc&limit=50',
    ),
    audit: await recentRows(
      '/rest/v1/operations_audit_events?select=id,operator_user_id,permission_slug,action,target_type,target_id,reason,occurred_at&order=occurred_at.desc&limit=50',
    ),
  }
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
  await serviceRest(`/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&status=neq.deleted`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { status, updated_at: new Date().toISOString() },
  })
  await recordOperationsAction(operatorUserId, 'operations.security', 'user', userId, `user.${status}`, reason)
  return { userId, status }
}

export async function setKycAsOperator(operatorUserId, userId, kycStatus, reason) {
  if (!['unverified', 'pending', 'verified', 'rejected'].includes(kycStatus)) {
    throw new HttpError(400, 'Unsupported KYC status.', 'invalid-kyc-status')
  }
  await serviceRest(`/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&status=neq.deleted`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { kyc_status: kycStatus, updated_at: new Date().toISOString() },
  })
  await recordOperationsAction(operatorUserId, 'operations.kyc', 'user', userId, 'kyc.set', reason, { kycStatus })
  return { userId, kycStatus }
}
