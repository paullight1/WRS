import {
  recordOperationsAction,
  requireAdminSession,
  setKycAsOperator,
  setUserStatusAsOperator,
  updateSupportAsOperator,
} from '../_lib/account.js'
import { matchDeploymentRequest, settleDeployment } from '../_lib/deployment.js'
import { moderateCommunity, qualifyReferral } from '../_lib/ecosystem.js'
import {
  appendCookies,
  assertSameOrigin,
  functionHandler,
  HttpError,
  json,
  readJson,
  requireMethod,
} from '../_lib/http.js'
import { serviceRpc } from '../_lib/supabase.js'

function text(value, max = 1000) {
  return String(value || '')
    .trim()
    .slice(0, max)
}

function quality(value, name) {
  const number = Number(value)
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
    const scopedRoles = [
      'support_operator',
      'kyc_operator',
      'finance_operator',
      'data_operator',
      'deployment_operator',
      'risk_operator',
      'reward_operator',
    ]
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      throw new HttpError(400, 'A target account UUID is required.', 'invalid-role-subject')
    }
    if (!scopedRoles.includes(role))
      throw new HttpError(400, 'Select a supported scoped operator role.', 'invalid-operator-role')
    if (userId.toLowerCase() === resolved.user.id.toLowerCase())
      throw new HttpError(403, 'Self role changes are forbidden.', 'self-role-change')
    const { data } = await serviceRpc('wrs_admin_set_operator_role', {
      p_operator_user_id: resolved.user.id,
      p_subject_user_id: userId,
      p_role_slug: role,
      p_enabled: action === 'role.grant',
      p_reason: reason,
    })
    return appendCookies(json(data), resolved.cookies)
  }

  if (
    [
      'rewards.rule.save',
      'rewards.rule.activate',
      'rewards.rule.disable',
      'rewards.issuance.enable',
      'rewards.issuance.disable',
      'rewards.activity.verify',
    ].includes(action)
  ) {
    const resolved = await requireAdminSession(request, 'operations.rewards', { stepUp: true })
    let rpc
    let args
    if (action === 'rewards.rule.save') {
      if (!body.rule || typeof body.rule !== 'object' || Array.isArray(body.rule))
        throw new HttpError(400, 'Reward settings are required.', 'rule-required')
      rpc = 'wrs_admin_save_reward_rule'
      args = { p_operator_user_id: resolved.user.id, p_reason: reason, p_rule: body.rule }
    } else if (action === 'rewards.activity.verify') {
      rpc = 'wrs_admin_verify_reward_activity'
      args = {
        p_operator_user_id: resolved.user.id,
        p_user_id: text(body.userId, 100),
        p_source: text(body.source, 40),
        p_reference_id: text(body.referenceId, 200),
        p_evidence: text(body.evidence, 2000),
        p_achievement_code: text(body.achievementCode, 80) || null,
      }
    } else {
      const ruleId = text(body.ruleId, 100)
      if (!ruleId) throw new HttpError(400, 'Select a saved reward rule.', 'rule-required')
      const issuance = action.startsWith('rewards.issuance.')
      rpc = issuance ? 'wrs_admin_set_mining_issuance' : 'wrs_admin_set_reward_rule_status'
      args = {
        p_operator_user_id: resolved.user.id,
        p_rule_id: ruleId,
        p_reason: reason,
        ...(issuance
          ? { p_enabled: action.endsWith('.enable') }
          : { p_status: action.endsWith('.activate') ? 'active' : 'disabled' }),
      }
    }
    const { data } = await serviceRpc(rpc, args)
    return json(data)
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
    return json(result)
  }

  if (action === 'user.suspend' || action === 'user.restore') {
    const resolved = await requireAdminSession(request, 'operations.security', { stepUp: true })
    const userId = text(body.userId, 100)
    if (!userId) throw new HttpError(400, 'Target user is required.', 'user-required')
    return json(
      await setUserStatusAsOperator(
        resolved.user.id,
        userId,
        action === 'user.suspend' ? 'suspended' : 'active',
        reason,
      ),
    )
  }

  if (action === 'kyc.set') {
    const resolved = await requireAdminSession(request, 'operations.kyc', { stepUp: true })
    const userId = text(body.userId, 100)
    const kycStatus = text(body.kycStatus, 40)
    if (!userId || !kycStatus) throw new HttpError(400, 'Target user and KYC status are required.', 'kyc-required')
    return json(await setKycAsOperator(resolved.user.id, userId, kycStatus, reason))
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
    return json({ contractId })
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
    return json(result)
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
    return json(data)
  }

  if (action === 'data.task.review') {
    const resolved = await requireAdminSession(request, 'operations.data')
    const responseId = text(body.responseId, 100)
    const status = text(body.status, 40)
    if (!responseId || !['approved', 'rejected'].includes(status)) {
      throw new HttpError(400, 'Task response and a valid review decision are required.', 'task-review-required')
    }
    const { data } = await serviceRpc('wrs_review_data_task_response', {
      p_operator_user_id: resolved.user.id,
      p_response_id: responseId,
      p_status: status,
      p_quality_score: quality(body.qualityScore, 'Quality score'),
      p_reason: reason,
    })
    return json(data)
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
    return json(result)
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
    return json(result)
  }

  throw new HttpError(400, 'Unsupported operator action.', 'unsupported-action')
})
