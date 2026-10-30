import { assertReviewableSubmission } from '../../adminDataReview.js'
import {
  recordOperationsAction,
  requireAdminSession,
  setKycAsOperator,
  setUserStatusAsOperator,
  updateSupportAsOperator,
} from '../../../api/_lib/account.js'
import { matchDeploymentRequest, settleDeployment } from '../../../api/_lib/deployment.js'
import { moderateCommunity, qualifyReferral } from '../../../api/_lib/ecosystem.js'
import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../../../api/_lib/http.js'
import { serviceRpc } from '../../../api/_lib/supabase.js'

function text(value, max = 1000) {
  return String(value || '')
    .trim()
    .slice(0, max)
}

function quality(value, name) {
  const supplied = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
  const number = supplied ? Number(value) : NaN
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    throw new HttpError(400, `${name} must be between 0 and 100.`, 'invalid-quality')
  }
  return number
}

export default functionHandler(async (request) => {
  requireMethod(request, 'POST')
  assertSameOrigin(request)
  const body = await readJson(request, 48_000)
  const action = text(body.action, 100)
  const reason = text(body.reason)
  if (!action || reason.length < 3) throw new HttpError(400, 'Action and reason are required.', 'action-required')

  if (action === 'role.grant' || action === 'role.revoke') {
    const resolved = await requireAdminSession(request, 'operations.roles', { stepUp: true })
    const userId = String(body.userId || '').trim()
    const role = String(body.role || '').trim()
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const roles = [
      'support_operator',
      'kyc_operator',
      'finance_operator',
      'data_operator',
      'deployment_operator',
      'risk_operator',
      'reward_operator',
    ]
    if (!uuid.test(userId) || userId.toLowerCase() === resolved.user.id.toLowerCase() || !roles.includes(role)) {
      throw new HttpError(400, 'Choose another valid account and a supported operator role.', 'invalid-role-target')
    }
    const { data } = await serviceRpc('wrs_admin_set_operator_role', {
      p_operator_user_id: resolved.user.id,
      p_subject_user_id: userId,
      p_role_slug: role,
      p_enabled: action === 'role.grant',
      p_reason: reason,
    })
    return appendCookies(json(data), resolved.cookies)
  }

  const rewardActions = [
    'rewards.rule.save',
    'rewards.rule.activate',
    'rewards.rule.disable',
    'rewards.issuance.enable',
    'rewards.issuance.disable',
    'rewards.activity.verify',
  ]
  if (rewardActions.includes(action)) {
    const resolved = await requireAdminSession(request, 'operations.rewards', { stepUp: true })
    const common = { p_operator_user_id: resolved.user.id, p_reason: reason }
    let result
    if (action === 'rewards.rule.save') {
      if (!body.rule || typeof body.rule !== 'object' || Array.isArray(body.rule))
        throw new HttpError(400, 'Reward rule is required.', 'rule-required')
      result = await serviceRpc('wrs_admin_save_reward_rule', { ...common, p_rule: body.rule })
    } else if (action === 'rewards.activity.verify') {
      const evidence = text(body.evidence, 10000)
      if (
        !text(body.userId) ||
        !text(body.referenceId) ||
        !['validation', 'community', 'mission'].includes(body.source) ||
        evidence.length < 10
      ) {
        throw new HttpError(400, 'Member, activity reference and reviewed evidence are required.', 'evidence-required')
      }
      result = await serviceRpc('wrs_admin_verify_reward_activity', {
        p_operator_user_id: resolved.user.id,
        p_user_id: text(body.userId, 100),
        p_source: body.source,
        p_reference_id: text(body.referenceId, 200),
        p_evidence: evidence,
        p_achievement_code: text(body.achievementCode, 100),
      })
    } else {
      const ruleId = text(body.ruleId, 100)
      if (!ruleId) throw new HttpError(400, 'Select a saved reward rule.', 'rule-required')
      result = action.startsWith('rewards.issuance.')
        ? await serviceRpc('wrs_admin_set_mining_issuance', {
            ...common,
            p_rule_id: ruleId,
            p_enabled: action === 'rewards.issuance.enable',
          })
        : await serviceRpc('wrs_admin_set_reward_rule_status', {
            ...common,
            p_rule_id: ruleId,
            p_status: action === 'rewards.rule.activate' ? 'active' : 'disabled',
          })
    }
    return appendCookies(json(result.data), resolved.cookies)
  }

  if (action === 'data.task.review') {
    const resolved = await requireAdminSession(request, 'operations.data')
    const responseId = text(body.responseId, 100)
    const status = text(body.status, 40)
    const score = quality(body.qualityScore, 'Quality score')
    if (!responseId || !['approved', 'rejected'].includes(status) || (status === 'approved' && score < 80)) {
      throw new HttpError(
        400,
        'A response and valid review decision are required. Approval requires a score of at least 80.',
        'invalid-review',
      )
    }
    const { data } = await serviceRpc('wrs_review_data_task_response', {
      p_operator_user_id: resolved.user.id,
      p_response_id: responseId,
      p_status: status,
      p_quality_score: score,
      p_reason: reason,
    })
    return appendCookies(json(data), resolved.cookies)
  }

  if (action === 'support.update') {
    const resolved = await requireAdminSession(request, 'operations.support')
    const result = await updateSupportAsOperator(resolved.user.id, {
      ticketId: text(body.ticketId, 100),
      status: text(body.status, 40),
      priority: text(body.priority, 40),
      message: text(body.message, 10000),
      reason,
    })
    return appendCookies(json(result), resolved.cookies)
  }

  if (action === 'user.suspend' || action === 'user.restore') {
    const resolved = await requireAdminSession(request, 'operations.security', { stepUp: true })
    const userId = text(body.userId, 100)
    if (!userId) throw new HttpError(400, 'Target user is required.', 'user-required')
    return appendCookies(
      json(
        await setUserStatusAsOperator(
          resolved.user.id,
          userId,
          action === 'user.suspend' ? 'suspended' : 'active',
          reason,
        ),
      ),
      resolved.cookies,
    )
  }

  if (action === 'kyc.set') {
    const resolved = await requireAdminSession(request, 'operations.kyc', { stepUp: true })
    const userId = text(body.userId, 100)
    const kycStatus = text(body.kycStatus, 40)
    if (!userId || !kycStatus) throw new HttpError(400, 'Target user and KYC status are required.', 'kyc-required')
    return appendCookies(json(await setKycAsOperator(resolved.user.id, userId, kycStatus, reason)), resolved.cookies)
  }

  if (action === 'deployment.match') {
    const resolved = await requireAdminSession(request, 'operations.deployment')
    const requestId = text(body.requestId, 100)
    if (!requestId) throw new HttpError(400, 'Deployment request is required.', 'deployment-request-required')
    const contractId = await matchDeploymentRequest(
      requestId,
      typeof body.termsOverride === 'object' && body.termsOverride ? body.termsOverride : {},
    )
    await recordOperationsAction(
      resolved.user.id,
      'operations.deployment',
      'deployment.request',
      requestId,
      action,
      reason,
      { contractId },
    )
    return appendCookies(json({ contractId }), resolved.cookies)
  }

  if (action === 'deployment.settle') {
    const resolved = await requireAdminSession(request, 'operations.finance', { stepUp: true })
    const deploymentId = text(body.deploymentId, 100)
    if (!deploymentId) throw new HttpError(400, 'Deployment is required.', 'deployment-required')
    const result = await settleDeployment(deploymentId)
    await recordOperationsAction(
      resolved.user.id,
      'operations.finance',
      'deployment',
      deploymentId,
      action,
      reason,
      result || {},
    )
    return appendCookies(json(result), resolved.cookies)
  }

  if (action === 'data.review') {
    const resolved = await requireAdminSession(request, 'operations.data')
    const submissionId = text(body.submissionId, 100)
    if (!submissionId) throw new HttpError(400, 'Data submission is required.', 'submission-required')
    const dimensions = {
      completeness: quality(body.completeness, 'Completeness'),
      accuracy: quality(body.accuracy, 'Accuracy'),
      consistency: quality(body.consistency, 'Consistency'),
      signalQuality: quality(body.signalQuality, 'Signal quality'),
      reviewerAgreement: quality(body.reviewerAgreement, 'Reviewer agreement'),
      policyCompliance: quality(body.policyCompliance, 'Policy compliance'),
    }
    await assertReviewableSubmission(submissionId)
    const { data } = await serviceRpc('wrs_review_data_submission', {
      p_submission_id: submissionId,
      p_completeness: dimensions.completeness,
      p_accuracy: dimensions.accuracy,
      p_consistency: dimensions.consistency,
      p_signal_quality: dimensions.signalQuality,
      p_reviewer_agreement: dimensions.reviewerAgreement,
      p_policy_compliance: dimensions.policyCompliance,
      p_notes: text(body.notes, 2000) || null,
    })
    await recordOperationsAction(resolved.user.id, 'operations.data', 'data.submission', submissionId, action, reason, {
      ...dimensions,
      result: data,
    })
    return appendCookies(json(data), resolved.cookies)
  }

  if (action === 'referral.qualify') {
    const resolved = await requireAdminSession(request, 'operations.risk')
    const relationshipId = text(body.relationshipId, 100)
    if (!relationshipId) throw new HttpError(400, 'Referral relationship is required.', 'relationship-required')
    const result = await qualifyReferral(relationshipId)
    await recordOperationsAction(
      resolved.user.id,
      'operations.risk',
      'referral.relationship',
      relationshipId,
      action,
      reason,
      result || {},
    )
    return appendCookies(json(result), resolved.cookies)
  }

  if (action === 'community.moderate') {
    const resolved = await requireAdminSession(request, 'operations.risk')
    const targetType = text(body.targetType, 80)
    const targetId = text(body.targetId, 200)
    const moderationAction = text(body.moderationAction, 100)
    if (!targetType || !targetId || !moderationAction) {
      throw new HttpError(400, 'Moderation target and action are required.', 'moderation-required')
    }
    const result = await moderateCommunity(
      targetType,
      targetId,
      moderationAction,
      reason,
      `operator:${resolved.user.id}`,
      {
        source: 'operations-console',
      },
    )
    await recordOperationsAction(resolved.user.id, 'operations.risk', targetType, targetId, action, reason, {
      moderationAction,
      result,
    })
    return appendCookies(json(result), resolved.cookies)
  }

  throw new HttpError(400, 'Unsupported operator action.', 'unsupported-action')
})
