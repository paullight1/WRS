import crypto from 'node:crypto'
import { HttpError } from './http.js'
import { serviceRest, serviceRpc } from './supabase.js'

function activeRobot(data) {
  return Array.isArray(data) ? data[0] || null : null
}

export async function ecosystemRobot(userId) {
  const { data } = await serviceRest(
    `/rest/v1/robots?owner_user_id=eq.${encodeURIComponent(userId)}&lifecycle=eq.active&select=id,package_slug&limit=1`,
  )
  const robot = activeRobot(data)
  if (!robot) throw new HttpError(409, 'An active owned robot is required.', 'robot-required')
  return robot
}

export async function marketplaceCatalog(userId) {
  const robot = await ecosystemRobot(userId)
  const { data: versions } = await serviceRest(
    '/rest/v1/marketplace_versions?verification_status=eq.approved&published_at=not.is.null&select=id,version,price_minor,currency,skill_slug,item:marketplace_items!inner(id,name,description,item_type,min_package_slug,status)&item.status=eq.published&order=published_at.desc&limit=100',
  )
  const { data: entitlements } = await serviceRest(
    `/rest/v1/marketplace_entitlements?user_id=eq.${encodeURIComponent(userId)}&robot_id=eq.${encodeURIComponent(robot.id)}&status=eq.active&select=id,version_id,marketplace_installs(id,status)&limit=200`,
  )
  const entitlementByVersion = new Map(
    (Array.isArray(entitlements) ? entitlements : []).map((row) => [row.version_id, row]),
  )
  return (Array.isArray(versions) ? versions : []).map((version) => {
    const entitlement = entitlementByVersion.get(version.id)
    const install = Array.isArray(entitlement?.marketplace_installs)
      ? entitlement.marketplace_installs[0]
      : entitlement?.marketplace_installs
    return {
      id: version.item?.id,
      versionId: version.id,
      name: version.item?.name || 'Marketplace item',
      description: version.item?.description || '',
      itemType: version.item?.item_type || 'module',
      minPackageSlug: version.item?.min_package_slug || 'starter',
      version: version.version,
      priceMinor: Number(version.price_minor || 0),
      currency: version.currency,
      skillSlug: version.skill_slug || null,
      entitlementId: entitlement?.id || null,
      installed: install?.status === 'installed',
    }
  })
}

export async function acquireMarketplaceItem(userId, versionId, idempotencyKey) {
  const robot = await ecosystemRobot(userId)
  const { data } = await serviceRpc('wrs_acquire_marketplace_item', {
    p_user_id: userId,
    p_robot_id: robot.id,
    p_version_id: versionId,
    p_idempotency_key: idempotencyKey,
  })
  return data
}

export async function installMarketplaceItem(userId, entitlementId) {
  const robot = await ecosystemRobot(userId)
  const { data } = await serviceRpc('wrs_install_marketplace_item', {
    p_user_id: userId,
    p_robot_id: robot.id,
    p_entitlement_id: entitlementId,
  })
  return data
}

export async function reviewMarketplaceItem(userId, itemId, rating, reviewText) {
  const { data } = await serviceRpc('wrs_review_marketplace_item', {
    p_user_id: userId,
    p_item_id: itemId,
    p_rating: rating,
    p_review_text: reviewText || '',
  })
  return { reviewId: String(data) }
}

export async function rewardSnapshot(userId) {
  const [{ data: points }, { data: boosts }] = await Promise.all([
    serviceRpc('wrs_reward_points_balance', { p_user_id: userId }),
    serviceRest(
      `/rest/v1/reward_boost_activations?user_id=eq.${encodeURIComponent(userId)}&status=eq.active&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,boost_slug,effect_snapshot,starts_at,expires_at&order=expires_at.asc&limit=100`,
    ),
  ])
  return { points: Number(points || 0), boosts: Array.isArray(boosts) ? boosts : [] }
}

export function eventCodeHash(code) {
  return crypto.createHash('sha256').update(String(code).trim().toUpperCase(), 'utf8').digest('hex')
}

export async function redeemEventCode(userId, code) {
  const { data } = await serviceRpc('wrs_redeem_event_code', {
    p_user_id: userId,
    p_code_hash: eventCodeHash(code),
  })
  return data
}

export async function createEventRewardCode(eventId, plaintextCode, rewardPoints, expiresAt, maxRedemptions = 1) {
  const hash = eventCodeHash(plaintextCode)
  const { data } = await serviceRpc('wrs_create_event_reward_code', {
    p_event_id: eventId,
    p_code_hash: hash,
    p_reward_points: rewardPoints,
    p_expires_at: expiresAt,
    p_max_redemptions: maxRedemptions,
  })
  return { codeId: String(data), code: plaintextCode }
}

export async function activateRewardBoost(userId, boostSlug, idempotencyKey) {
  const robot = await ecosystemRobot(userId)
  const { data } = await serviceRpc('wrs_activate_reward_boost', {
    p_user_id: userId,
    p_robot_id: robot.id,
    p_boost_slug: boostSlug,
    p_idempotency_key: idempotencyKey,
  })
  return data
}

export async function academySnapshot(userId) {
  const [{ data: courses }, { data: enrollments }] = await Promise.all([
    serviceRest(
      '/rest/v1/academy_courses?status=eq.published&select=id,slug,title,description,pass_score,academy_modules(id,slug,title,position,status)&academy_modules.status=eq.published&order=created_at.asc&limit=100',
    ),
    serviceRest(
      `/rest/v1/academy_enrollments?user_id=eq.${encodeURIComponent(userId)}&select=id,course_id,status,enrolled_at,completed_at,academy_progress(module_id,progress_percent,completed_at),academy_certificates(public_verification_id,status,issued_at)&limit=100`,
    ),
  ])
  return { courses: Array.isArray(courses) ? courses : [], enrollments: Array.isArray(enrollments) ? enrollments : [] }
}

export async function enrollAcademyCourse(userId, courseId) {
  const { data } = await serviceRpc('wrs_enroll_academy_course', { p_user_id: userId, p_course_id: courseId })
  return { enrollmentId: String(data) }
}

export async function recordAcademyProgress(userId, enrollmentId, moduleId, completionPercent) {
  const { data } = await serviceRpc('wrs_record_academy_progress', {
    p_user_id: userId,
    p_enrollment_id: enrollmentId,
    p_module_id: moduleId,
    p_progress_percent: completionPercent,
  })
  return data
}

export async function assessAcademyEnrollment(enrollmentId, score, assessorReference, evidence = {}) {
  const { data } = await serviceRpc('wrs_assess_academy_enrollment', {
    p_enrollment_id: enrollmentId,
    p_score: score,
    p_assessor_reference: assessorReference,
    p_evidence: evidence,
  })
  return data
}

export async function verifyAcademyCertificate(verificationId) {
  const { data } = await serviceRpc(
    'wrs_verify_academy_certificate',
    { p_verification_id: verificationId },
    { anonymous: true },
  )
  return data
}

export async function communitySnapshot(userId) {
  const [{ data: events }, { data: participation }, { data: announcements }, { data: profile }] = await Promise.all([
    serviceRest(
      '/rest/v1/community_events?status=eq.published&select=id,slug,title,description,starts_at,ends_at,capacity&order=starts_at.asc&limit=100',
    ),
    serviceRest(
      `/rest/v1/community_event_participants?user_id=eq.${encodeURIComponent(userId)}&select=event_id,status,reminder_enabled,joined_at,attended_at&limit=100`,
    ),
    serviceRest(
      '/rest/v1/community_announcements?status=eq.published&select=id,title,body,published_at&order=published_at.desc&limit=50',
    ),
    serviceRest(
      `/rest/v1/community_leaderboard_profiles?user_id=eq.${encodeURIComponent(userId)}&select=opted_in,display_alias&limit=1`,
    ),
  ])
  return {
    events: Array.isArray(events) ? events : [],
    participation: Array.isArray(participation) ? participation : [],
    announcements: Array.isArray(announcements) ? announcements : [],
    leaderboard: Array.isArray(profile) ? profile[0] || null : null,
  }
}

export async function joinCommunityEvent(userId, eventId, reminderEnabled) {
  const { data } = await serviceRpc('wrs_join_community_event', {
    p_user_id: userId,
    p_event_id: eventId,
    p_reminder_enabled: Boolean(reminderEnabled),
  })
  return data
}

export async function setCommunityLeaderboard(userId, optedIn, displayAlias) {
  const { data } = await serviceRpc('wrs_set_community_leaderboard_profile', {
    p_user_id: userId,
    p_opted_in: Boolean(optedIn),
    p_display_alias: displayAlias,
  })
  return data
}

export async function verifyCommunityAttendance(eventId, userId, attendanceReference) {
  const { data } = await serviceRpc('wrs_verify_community_attendance', {
    p_event_id: eventId,
    p_user_id: userId,
    p_attendance_reference: attendanceReference,
  })
  return data
}

export async function moderateCommunity(targetType, targetId, action, reason, operatorReference, metadata = {}) {
  const { data } = await serviceRpc('wrs_record_community_moderation', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_action: action,
    p_reason: reason,
    p_operator_reference: operatorReference,
    p_metadata: metadata,
  })
  return { moderationId: String(data) }
}

export async function referralSnapshot(userId) {
  const [{ data: code }, { data: relationships }] = await Promise.all([
    serviceRpc('wrs_ensure_referral_profile', { p_user_id: userId }),
    serviceRest(
      `/rest/v1/referral_relationships?or=(referrer_user_id.eq.${encodeURIComponent(userId)},referred_user_id.eq.${encodeURIComponent(userId)})&select=id,referrer_user_id,referred_user_id,referral_code,status,eligible_at,qualified_at,created_at&order=created_at.desc&limit=100`,
    ),
  ])
  return { code: String(code), relationships: Array.isArray(relationships) ? relationships : [] }
}

export async function acceptReferral(userId, code) {
  const { data } = await serviceRpc('wrs_accept_referral', { p_referred_user_id: userId, p_code: code })
  return data
}

export async function qualifyReferral(relationshipId) {
  const { data } = await serviceRpc('wrs_qualify_referral', { p_relationship_id: relationshipId })
  return data
}
