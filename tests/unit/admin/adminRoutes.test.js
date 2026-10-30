import { beforeEach, expect, it, vi } from 'vitest'
const account = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  operationsSnapshot: vi.fn(),
  operationsOverviewSummary: vi.fn(),
  recordOperationsAction: vi.fn(),
  setKycAsOperator: vi.fn(),
  setUserStatusAsOperator: vi.fn(),
  updateSupportAsOperator: vi.fn(),
}))
const database = vi.hoisted(() => ({ serviceRpc: vi.fn() }))
vi.mock('../../../api/_lib/account.js', () => account)
vi.mock('../../../api/_lib/supabase.js', () => database)
vi.mock('../../../server/adminDataReview.js', () => ({
  assertReviewableSubmission: vi.fn().mockResolvedValue(undefined),
}))
const deployment = vi.hoisted(() => ({ matchDeploymentRequest: vi.fn(), settleDeployment: vi.fn() }))
vi.mock('../../../api/_lib/deployment.js', () => deployment)
const ecosystem = vi.hoisted(() => ({ moderateCommunity: vi.fn(), qualifyReferral: vi.fn() }))
vi.mock('../../../api/_lib/ecosystem.js', () => ecosystem)
import operations from '../../../server/routes/admin/operations.js'
import action from '../../../server/routes/admin/action.js'
beforeEach(() => {
  vi.clearAllMocks()
  account.requireAdminSession.mockResolvedValue({ user: { id: 'operator-1' }, cookies: [] })
  account.operationsSnapshot.mockResolvedValue({ users: [] })
  for (const fn of [
    account.recordOperationsAction,
    account.setKycAsOperator,
    account.setUserStatusAsOperator,
    account.updateSupportAsOperator,
    deployment.matchDeploymentRequest,
    deployment.settleDeployment,
    ecosystem.moderateCommunity,
    ecosystem.qualifyReferral,
  ])
    fn.mockResolvedValue({ changed: true })
  account.operationsOverviewSummary.mockResolvedValue({ metrics: [{ key: 'support_open', value: 2 }] })
  database.serviceRpc.mockResolvedValue({ data: { ruleId: 'rule-1' } })
})
const post = (body) =>
  action.fetch(
    new Request('https://wrs.test/api/admin/action', {
      method: 'POST',
      headers: { origin: 'https://wrs.test', 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'Reviewed by operator', ...body }),
    }),
  )
it('serves the existing overview summary and reward snapshot', async () => {
  const overview = await operations.fetch(new Request('https://wrs.test/api/admin/operations?scope=overview'))
  expect((await overview.json()).summary.metrics[0].value).toBe(2)
  const rewards = await operations.fetch(new Request('https://wrs.test/api/admin/operations?scope=rewards'))
  expect(rewards.status).toBe(200)
  expect(account.requireAdminSession).toHaveBeenLastCalledWith(expect.any(Request), 'operations.rewards')
  expect(database.serviceRpc).toHaveBeenCalledWith('wrs_mining_operations_snapshot', {
    p_operator_user_id: 'operator-1',
  })
})
it('requires reward permission and recent MFA before saving a rule', async () => {
  const response = await post({ action: 'rewards.rule.save', rule: { activityRules: {} } })
  expect(response.status).toBe(200)
  expect(account.requireAdminSession).toHaveBeenCalledWith(expect.any(Request), 'operations.rewards', { stepUp: true })
  expect(database.serviceRpc).toHaveBeenCalledWith('wrs_admin_save_reward_rule', {
    p_operator_user_id: 'operator-1',
    p_reason: 'Reviewed by operator',
    p_rule: { activityRules: {} },
  })
})
it('submits role assignments to the existing guarded RPC', async () => {
  const response = await post({
    action: 'role.grant',
    userId: '33333333-3333-4333-8333-333333333333',
    role: 'support_operator',
  })
  expect(response.status).toBe(200)
  expect(account.requireAdminSession).toHaveBeenCalledWith(expect.any(Request), 'operations.roles', { stepUp: true })
  expect(database.serviceRpc).toHaveBeenCalledWith(
    'wrs_admin_set_operator_role',
    expect.objectContaining({
      p_subject_user_id: '33333333-3333-4333-8333-333333333333',
      p_role_slug: 'support_operator',
      p_enabled: true,
    }),
  )
})
it('validates training quality before calling the review RPC', async () => {
  expect(
    (await post({ action: 'data.task.review', responseId: 'response-1', status: 'approved', qualityScore: '' })).status,
  ).toBe(400)
  expect(
    (await post({ action: 'data.task.review', responseId: 'response-1', status: 'approved', qualityScore: 90 })).status,
  ).toBe(200)
  expect(database.serviceRpc).toHaveBeenCalledWith(
    'wrs_review_data_task_response',
    expect.objectContaining({ p_response_id: 'response-1', p_status: 'approved', p_quality_score: 90 }),
  )
})

it('requires KYC permission before returning member identity records', async () => {
  await operations.fetch(new Request('https://wrs.test/api/admin/operations?scope=users'))
  expect(account.requireAdminSession).toHaveBeenCalledWith(expect.any(Request), 'operations.kyc')
})

it.each([' ', '\t', null, false])('rejects incomplete review quality %j before any mutation', async (qualityScore) => {
  const response = await post({
    action: 'data.task.review',
    responseId: 'response-1',
    status: 'rejected',
    qualityScore,
  })
  expect(response.status).toBe(400)
  expect(database.serviceRpc).not.toHaveBeenCalled()
})

it.each([
  ['user.suspend', { userId: 'member-1' }, 'operations.security', true],
  ['user.restore', { userId: 'member-1' }, 'operations.security', true],
  ['kyc.set', { userId: 'member-1', kycStatus: 'verified' }, 'operations.kyc', true],
  [
    'support.update',
    { ticketId: 'ticket-1', status: 'resolved', priority: 'high', message: 'Resolved' },
    'operations.support',
    false,
  ],
  ['deployment.match', { requestId: 'request-1' }, 'operations.deployment', false],
  ['deployment.settle', { deploymentId: 'deployment-1' }, 'operations.finance', true],
  [
    'data.review',
    {
      submissionId: 'submission-1',
      completeness: 90,
      accuracy: 90,
      consistency: 90,
      signalQuality: 90,
      reviewerAgreement: 90,
      policyCompliance: 90,
    },
    'operations.data',
    false,
  ],
  ['referral.qualify', { relationshipId: 'referral-1' }, 'operations.risk', false],
  [
    'community.moderate',
    { targetType: 'community_profile', targetId: 'member-1', moderationAction: 'hide' },
    'operations.risk',
    false,
  ],
])('preserves the authorized session after %s', async (name, values, permission, stepUp) => {
  account.requireAdminSession.mockResolvedValueOnce({
    user: { id: 'operator-1' },
    cookies: ['wrs_session=rotated; Path=/; HttpOnly; SameSite=Lax'],
  })
  const response = await post({ action: name, ...values })
  expect(response.status).toBe(200)
  expect(response.headers.get('set-cookie')).toContain('wrs_session=rotated')
  expect(account.requireAdminSession).toHaveBeenCalledWith(
    expect.any(Request),
    permission,
    ...(stepUp ? [{ stepUp: true }] : []),
  )
})
