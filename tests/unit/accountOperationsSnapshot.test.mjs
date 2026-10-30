import { beforeEach, describe, expect, it, vi } from 'vitest'

const serviceRest = vi.hoisted(() => vi.fn())
const serviceRpc = vi.hoisted(() => vi.fn())

vi.mock('../../api/_lib/supabase.js', () => ({
  authSecret: vi.fn(),
  serviceRest,
  serviceRpc,
}))
vi.mock('../../api/_lib/auth.js', () => ({ issueVerificationChallenge: vi.fn() }))
vi.mock('../../api/_lib/session.js', () => ({ requireSession: vi.fn() }))

const { operationsOverviewSummary, operationsSnapshot, setUserStatusAsOperator, setKycAsOperator } =
  await import('../../api/_lib/account.js')

const users = [
  {
    user_id: 'member-1',
    full_name: 'Ada Lovelace',
    normalized_email: 'ada@example.com',
    status: 'active',
    kyc_status: 'verified',
  },
  {
    user_id: 'member-2',
    full_name: 'Grace Hopper',
    normalized_email: 'grace@example.com',
    status: 'suspended',
    kyc_status: 'pending',
  },
]

function countResponse(total) {
  return {
    data: [],
    response: {
      headers: {
        get: (name) => (name === 'content-range' ? `0-0/${total}` : null),
      },
    },
  }
}

function rowsResponse(data) {
  return {
    data,
    response: {
      headers: {
        get: () => null,
      },
    },
  }
}

function countFor(path) {
  if (path.includes('status=eq.active')) return 401
  if (path.includes('kyc_status=eq.pending')) return 29
  if (path.includes('status=eq.pending')) return 11
  if (path.includes('status=eq.suspended')) return 17
  if (path.includes('kyc_status=eq.verified')) return 312
  return 430
}

beforeEach(() => {
  serviceRest.mockImplementation((path) => {
    if (path.includes('order=created_at.desc')) return Promise.resolve(rowsResponse(users))
    if (path.includes('order=updated_at.asc')) return Promise.resolve(rowsResponse([users[1]]))
    return Promise.resolve(countResponse(countFor(path)))
  })
})

describe('operationsSnapshot users', () => {
  it('returns identity fields and exact stats independent of the 100-row directory limit', async () => {
    const snapshot = await operationsSnapshot('users')

    expect(snapshot.users).toEqual(users)
    expect(snapshot.identityChecks).toEqual([users[1]])
    expect(snapshot.userStats).toEqual({
      total: 430,
      active: 401,
      pending: 11,
      suspended: 17,
      verificationPending: 29,
      verified: 312,
    })
    const directoryCall = serviceRest.mock.calls.find(([path]) => path.includes('order=created_at.desc'))
    expect(directoryCall[0]).toContain('select=user_id,full_name,normalized_email,status,kyc_status')
    expect(directoryCall[0]).toContain('status=neq.deleted')
    expect(directoryCall[0]).toContain('limit=100')
    const identityCall = serviceRest.mock.calls.find(([path]) => path.includes('order=updated_at.asc'))
    expect(identityCall[0]).toContain('status=neq.deleted')
    const countCalls = serviceRest.mock.calls.filter(([path]) => !path.includes('order='))
    expect(countCalls).toHaveLength(6)
    for (const [, options] of countCalls) {
      expect(options.headers).toEqual({ Prefer: 'count=exact', Range: '0-0' })
    }
    expect(
      countCalls.find(([path]) => path === '/rest/v1/user_profiles?status=neq.deleted&select=user_id'),
    ).toBeTruthy()
    expect(
      countCalls
        .filter(([path]) => path.includes('kyc_status=eq.'))
        .every(([path]) => path.includes('status=neq.deleted')),
    ).toBe(true)
  })

  it('fetches older pending identity checks independently and reports a failed queue read', async () => {
    const older = { ...users[1], user_id: 'older-user' }
    serviceRest.mockImplementation((path) => {
      if (path.includes('order=created_at.desc')) return Promise.resolve(rowsResponse([users[0]]))
      if (path.includes('order=updated_at.asc')) return Promise.resolve(rowsResponse([older]))
      return Promise.resolve(countResponse(countFor(path)))
    })
    const snapshot = await operationsSnapshot('users')
    expect(snapshot.users).toEqual([users[0]])
    expect(snapshot.identityChecks).toEqual([older])
    serviceRest.mockImplementation((path) => {
      if (path.includes('order=updated_at.asc')) return Promise.reject(new Error('Queue unavailable'))
      if (path.includes('order=created_at.desc')) return Promise.resolve(rowsResponse(users))
      return Promise.resolve(countResponse(countFor(path)))
    })
    const failedQueue = await operationsSnapshot('users')
    expect(failedQueue.users).toEqual(users)
    expect(failedQueue.identityChecks).toBeNull()
  })

  it('keeps the directory when one exact count is unavailable', async () => {
    serviceRest.mockImplementation((path) => {
      if (path.includes('order=created_at.desc')) return Promise.resolve(rowsResponse(users))
      if (path.includes('order=updated_at.asc')) return Promise.resolve(rowsResponse([users[1]]))
      if (path.includes('status=eq.active')) return Promise.reject(new Error('count unavailable'))
      return Promise.resolve(countResponse(countFor(path)))
    })

    const snapshot = await operationsSnapshot('users')

    expect(snapshot.users).toEqual(users)
    expect(snapshot.userStats).toEqual({
      total: 430,
      active: null,
      pending: 11,
      suspended: 17,
      verificationPending: 29,
      verified: 312,
    })
  })
})

describe('operationsSnapshot related operational data', () => {
  it('loads a support thread, actor context, and exact queue counts without N+1 reads', async () => {
    const tickets = [
      {
        id: 'ticket-1',
        user_id: 'member-old',
        category: 'billing',
        subject: 'Payment question',
        status: 'waiting_user',
        priority: 'high',
        assigned_operator_id: 'operator-1',
        created_at: '2026-10-01T09:00:00Z',
        updated_at: '2026-10-02T09:00:00Z',
      },
    ]
    const messages = [
      {
        id: 'message-2',
        ticket_id: 'ticket-1',
        author_user_id: 'operator-1',
        author_role: 'operator',
        body: 'Please share the payment reference.',
        created_at: '2026-10-02T09:00:00Z',
      },
      {
        id: 'message-1',
        ticket_id: 'ticket-1',
        author_user_id: 'member-old',
        author_role: 'user',
        body: 'The payment is still pending.',
        created_at: '2026-10-01T09:01:00Z',
      },
    ]
    const profiles = [
      { user_id: 'member-old', full_name: 'Older Member', normalized_email: 'older@example.com', country_code: 'NG' },
      {
        user_id: 'operator-1',
        full_name: 'Support Operator',
        normalized_email: 'operator@example.com',
        country_code: 'GB',
      },
    ]
    serviceRest.mockImplementation((path, options = {}) => {
      if (options.headers?.Prefer === 'count=exact' && options.headers?.Range === '0-0') {
        if (path.includes('status=in.(open,in_progress)')) return Promise.resolve(countResponse(4))
        if (path.includes('status=eq.waiting_user')) return Promise.resolve(countResponse(3))
        if (path.includes('status=in.(resolved,closed)')) return Promise.resolve(countResponse(5))
        return Promise.resolve(countResponse(12))
      }
      if (path.startsWith('/rest/v1/support_tickets?')) return Promise.resolve(rowsResponse(tickets))
      if (path.startsWith('/rest/v1/support_messages?')) return Promise.resolve(rowsResponse(messages))
      if (path.startsWith('/rest/v1/user_profiles?user_id=in.')) return Promise.resolve(rowsResponse(profiles))
      throw new Error(`Unexpected read: ${path}`)
    })

    const snapshot = await operationsSnapshot('support')

    expect(snapshot.support[0]).toMatchObject({
      user_name: 'Older Member',
      user_email: 'older@example.com',
      country_code: 'NG',
      assigned_operator_name: 'Support Operator',
      messages: [
        { id: 'message-1', author_name: 'Older Member', actor_name: 'Older Member', actor_email: 'older@example.com' },
        {
          id: 'message-2',
          author_name: 'Support Operator',
          actor_name: 'Support Operator',
          actor_email: 'operator@example.com',
        },
      ],
    })
    expect(snapshot.stats).toEqual({ support: { total: 12, open: 4, waiting: 3, resolved: 5 } })
    expect(
      serviceRest.mock.calls.filter(([path]) => path.startsWith('/rest/v1/user_profiles?user_id=in.')),
    ).toHaveLength(1)
  })

  it('adds safe asset metadata and preserves older profile context for data queues', async () => {
    const submissions = [
      {
        id: 'submission-1',
        asset_id: 'asset-1',
        user_id: 'older-contributor',
        status: 'review',
        quality_score: 88,
        submission_metadata: { source: 'capture' },
        review_notes: 'Review context',
        submitted_at: '2026-10-01T09:00:00Z',
        reviewed_at: null,
      },
    ]
    const taskResponses = [
      {
        id: 'response-1',
        user_id: 'older-contributor',
        task_slug: 'navigation',
        data_category: 'text',
        status: 'submitted',
        quality_score: null,
        submitted_at: '2026-10-01T08:00:00Z',
        reviewed_at: null,
        response: { answer: 'stop' },
      },
    ]
    const deletions = [
      {
        id: 'deletion-1',
        user_id: 'older-contributor',
        status: 'requested',
        eligible_at: '2026-10-03T09:00:00Z',
        attempt_count: 0,
        requested_at: '2026-10-01T10:00:00Z',
        completed_at: null,
      },
    ]
    serviceRest.mockImplementation((path, options = {}) => {
      if (options.headers?.Prefer === 'count=exact' && options.headers?.Range === '0-0')
        return Promise.resolve(countResponse(path.includes('status=eq.approved') ? 8 : 20))
      if (path.startsWith('/rest/v1/data_submissions?')) return Promise.resolve(rowsResponse(submissions))
      if (path.startsWith('/rest/v1/data_task_responses?')) return Promise.resolve(rowsResponse(taskResponses))
      if (path.startsWith('/rest/v1/data_deletion_requests?')) return Promise.resolve(rowsResponse(deletions))
      if (path.startsWith('/rest/v1/data_assets?'))
        return Promise.resolve(
          rowsResponse([
            {
              id: 'asset-1',
              user_id: 'older-contributor',
              purpose_slug: 'dataset-contribution',
              data_category: 'text',
              storage_bucket: 'private-data',
              storage_path: 'secret/member/file.txt',
              mime_type: 'text/plain',
              size_bytes: 42,
              checksum_sha256: 'abc',
              scan_status: 'clean',
              status: 'uploaded',
              uploaded_at: '2026-10-01T08:30:00Z',
              created_at: '2026-10-01T08:20:00Z',
              updated_at: '2026-10-01T08:30:00Z',
            },
          ]),
        )
      if (path.startsWith('/rest/v1/user_profiles?user_id=in.'))
        return Promise.resolve(
          rowsResponse([
            {
              user_id: 'older-contributor',
              full_name: 'Older Contributor',
              normalized_email: 'older-contributor@example.com',
              country_code: 'NG',
            },
          ]),
        )
      throw new Error(`Unexpected read: ${path}`)
    })

    const snapshot = await operationsSnapshot('data')

    expect(snapshot.submissions[0]).toMatchObject({
      user_name: 'Older Contributor',
      data_category: 'text',
      mime_type: 'text/plain',
      size_bytes: 42,
      scan_status: 'clean',
      submission_metadata: { source: 'capture' },
      review_notes: 'Review context',
      asset: {
        id: 'asset-1',
        data_category: 'text',
        mime_type: 'text/plain',
        size_bytes: 42,
        scan_status: 'clean',
      },
    })
    expect(snapshot.submissions[0].asset).not.toHaveProperty('storage_path')
    expect(snapshot.submissions[0].asset).not.toHaveProperty('storage_bucket')
    expect(snapshot.taskResponses[0]).toMatchObject({
      user_id: 'older-contributor',
      user_name: 'Older Contributor',
      reviewed_at: null,
    })
    expect(snapshot.stats.submissions).toEqual({ total: 20, pending: 20, approved: 8, rejected: 20 })
  })

  it('enriches money and job rows from bounded id lookups and keeps payout state authoritative', async () => {
    const profile = {
      user_id: 'member-1',
      full_name: 'Ada Lovelace',
      normalized_email: 'ada@example.com',
      country_code: 'NG',
    }
    const withdrawal = {
      id: 'withdrawal-1',
      user_id: 'member-1',
      amount_minor: 1500,
      currency: 'USD',
      status: 'provider_pending',
      created_at: '2026-10-01T09:00:00Z',
      updated_at: '2026-10-01T09:00:00Z',
    }
    const payment = {
      id: 'payment-1',
      user_id: 'member-1',
      package_slug: 'professional',
      amount_minor: 10000,
      currency: 'USD',
      status: 'succeeded',
      created_at: '2026-10-01T08:00:00Z',
      updated_at: '2026-10-01T08:00:00Z',
    }
    const completedJob = {
      id: 'deployment-1',
      user_id: 'member-1',
      robot_id: 'robot-1',
      opportunity_id: 'opportunity-1',
      status: 'completed',
      completed_at: '2026-10-02T09:00:00Z',
      updated_at: '2026-10-02T09:00:00Z',
    }
    serviceRest.mockImplementation((path, options = {}) => {
      if (options.headers?.Prefer === 'count=exact' && options.headers?.Range === '0-0') {
        if (path.includes('payment_intents') && path.includes('status=eq.succeeded'))
          return Promise.resolve(countResponse(7))
        if (path.includes('payment_intents') && path.includes('status=in.')) return Promise.resolve(countResponse(2))
        if (path.includes('payment_intents')) return Promise.resolve(countResponse(9))
        if (path.includes('withdrawals') && path.includes('status=in.')) return Promise.resolve(countResponse(3))
        if (path.includes('withdrawals') && path.includes('status=eq.succeeded'))
          return Promise.resolve(countResponse(4))
        if (path.includes('withdrawals')) return Promise.resolve(countResponse(8))
        if (path.includes('deployment_settlements=is.null')) return Promise.resolve(countResponse(2))
        if (path.includes('deployment_settlements')) return Promise.resolve(countResponse(6))
        if (path.includes('deployments') && path.includes('status=eq.completed'))
          return Promise.resolve(countResponse(8))
        return Promise.resolve(countResponse(10))
      }
      if (path.startsWith('/rest/v1/withdrawals?')) return Promise.resolve(rowsResponse([withdrawal]))
      if (path.startsWith('/rest/v1/payment_intents?')) return Promise.resolve(rowsResponse([payment]))
      if (path.startsWith('/rest/v1/deployments?status=eq.completed&select='))
        return Promise.resolve(rowsResponse([completedJob]))
      if (path.startsWith('/rest/v1/user_profiles?user_id=in.')) return Promise.resolve(rowsResponse([profile]))
      if (path.startsWith('/rest/v1/robots?')) return Promise.resolve(rowsResponse([{ id: 'robot-1', name: 'Atlas' }]))
      if (path.startsWith('/rest/v1/deployment_opportunities?'))
        return Promise.resolve(rowsResponse([{ id: 'opportunity-1', title: 'Warehouse inspection' }]))
      if (path.startsWith('/rest/v1/deployment_settlements?'))
        return Promise.resolve(
          rowsResponse([
            {
              id: 'settlement-1',
              deployment_id: 'deployment-1',
              user_id: 'member-1',
              amount_minor: 4200,
              currency: 'USD',
              verified_work_count: 3,
              status: 'settled',
              settled_at: '2026-10-03T09:00:00Z',
            },
          ]),
        )
      throw new Error(`Unexpected read: ${path}`)
    })

    const snapshot = await operationsSnapshot('finance')

    expect(snapshot.payments[0]).toMatchObject({
      user_name: 'Ada Lovelace',
      plan_name: 'Professional',
      current_package: 'professional',
    })
    expect(snapshot.withdrawals[0]).toMatchObject({
      user_name: 'Ada Lovelace',
      amount_minor: 1500,
      status: 'provider_pending',
    })
    expect(snapshot.settlements[0]).toMatchObject({
      id: 'deployment-1',
      robot_name: 'Atlas',
      job_title: 'Warehouse inspection',
      amount_minor: 4200,
      currency: 'USD',
      payout_status: 'settled',
    })
    expect(snapshot.stats.settlements).toEqual({ total: 8, ready: 2, paid: 6 })
  })

  it('marks related-data failures explicitly and still rejects failed source collections', async () => {
    const ticket = {
      id: 'ticket-2',
      user_id: 'member-2',
      category: 'technical',
      subject: 'Device issue',
      status: 'open',
      priority: 'normal',
      created_at: '2026-10-01T09:00:00Z',
      updated_at: '2026-10-01T09:00:00Z',
    }
    serviceRest.mockImplementation((path, options = {}) => {
      if (options.headers?.Prefer === 'count=exact' && options.headers?.Range === '0-0')
        return Promise.resolve(countResponse(1))
      if (path.startsWith('/rest/v1/support_tickets?')) return Promise.resolve(rowsResponse([ticket]))
      if (path.startsWith('/rest/v1/support_messages?')) return Promise.reject(new Error('messages unavailable'))
      if (path.startsWith('/rest/v1/user_profiles?user_id=in.')) return Promise.resolve(rowsResponse([]))
      throw new Error(`Unexpected read: ${path}`)
    })
    const snapshot = await operationsSnapshot('support')
    expect(snapshot.support).toEqual([
      expect.objectContaining({ id: 'ticket-2', relatedDataUnavailable: true, messages: null }),
    ])

    serviceRest.mockImplementation((path) => {
      if (path.startsWith('/rest/v1/support_tickets?')) return Promise.reject(new Error('ticket source unavailable'))
      return Promise.resolve(countResponse(0))
    })
    await expect(operationsSnapshot('support')).rejects.toThrow('ticket source unavailable')
  })
})

it('returns exact system totals and recent real users separately from pending work', async () => {
  serviceRpc.mockImplementation((name) =>
    Promise.resolve(
      name === 'wrs_operator_has_permission' ? { data: true } : { data: { issuance: { enabled: false }, rules: [] } },
    ),
  )
  serviceRest.mockImplementation((path, options = {}) => {
    if (path.includes('order=created_at.desc')) return Promise.resolve(rowsResponse(users))
    if (options.headers?.Prefer === 'count=exact') {
      if (path.includes('user_profiles')) return Promise.resolve(countResponse(countFor(path)))
      return Promise.resolve(countResponse(24))
    }
    throw new Error(`Unexpected read: ${path}`)
  })
  const summary = await operationsOverviewSummary('operator-1')
  expect(summary.totals).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ key: 'users_total', value: 430, scope: 'users', status: 'ready' }),
      expect.objectContaining({ key: 'users_active', value: 401 }),
      expect.objectContaining({ key: 'payments_total', value: 24 }),
      expect.objectContaining({ key: 'robots_total', value: 24 }),
      expect.objectContaining({ key: 'submissions_total', value: 24 }),
      expect.objectContaining({ key: 'referrals_total', value: 24 }),
    ]),
  )
  expect(summary.recentUsers).toEqual(users)
  const recentRead = serviceRest.mock.calls.find(([path]) => path.includes('order=created_at.desc'))[0]
  expect(recentRead).toContain('limit=5')
  expect(recentRead).toContain('status=neq.deleted')
  const permissions = serviceRpc.mock.calls
    .filter(([name]) => name === 'wrs_operator_has_permission')
    .map(([, args]) => args.p_permission)
  expect(permissions.length).toBe(new Set(permissions).size)
})

it('does not fetch people or financial totals for a support-only operator', async () => {
  serviceRpc.mockImplementation((name, args) =>
    Promise.resolve({ data: name === 'wrs_operator_has_permission' && args.p_permission === 'operations.support' }),
  )
  serviceRest.mockResolvedValue(countResponse(2))
  const summary = await operationsOverviewSummary('support-operator')
  expect(summary.recentUsers).toBeNull()
  expect(summary.totals.length).toBeGreaterThan(0)
  expect(summary.totals.every((row) => row.scope === 'support')).toBe(true)
  expect(serviceRest.mock.calls.every(([path]) => path.startsWith('/rest/v1/support_tickets?'))).toBe(true)
})

it('keeps other overview totals when one count or the recent-user list fails', async () => {
  serviceRpc.mockImplementation((name) =>
    Promise.resolve(name === 'wrs_operator_has_permission' ? { data: true } : { data: { issuance: {}, rules: [] } }),
  )
  serviceRest.mockImplementation((path) => {
    if (path.includes('order=created_at.desc') || path.includes('status=eq.active'))
      return Promise.reject(new Error('unavailable'))
    return Promise.resolve(countResponse(430))
  })
  const summary = await operationsOverviewSummary('operator-1')
  expect(summary.totals).toContainEqual(
    expect.objectContaining({ key: 'users_active', value: null, status: 'unavailable' }),
  )
  expect(summary.totals).toContainEqual(expect.objectContaining({ key: 'users_total', value: 430, status: 'ready' }))
  expect(summary.recentUsers).toBeNull()
})

it('keeps submission and training-review overview metrics independent', async () => {
  serviceRpc.mockImplementation((name) =>
    Promise.resolve(
      name === 'wrs_operator_has_permission' ? { data: true } : { data: { issuance: { enabled: false }, rules: [] } },
    ),
  )
  serviceRest.mockImplementation((path, options = {}) => {
    if (options.headers?.Prefer === 'count=exact' && options.headers?.Range === '0-0') {
      if (path.includes('data_task_responses')) return Promise.resolve(countResponse(3))
      if (path.includes('data_submissions')) return Promise.resolve(countResponse(5))
      return Promise.resolve(countResponse(0))
    }
    return Promise.resolve(rowsResponse([]))
  })

  const summary = await operationsOverviewSummary('operator-1')

  expect(summary.metrics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ key: 'data_submissions_review', value: 5, status: 'ready' }),
      expect.objectContaining({ key: 'data_task_responses_review', value: 3, status: 'ready' }),
    ]),
  )
})

const userChanges = [
  ['account status', (id) => setUserStatusAsOperator('staff', id, 'suspended', 'Reviewed account')],
  ['identity check', (id) => setKycAsOperator('staff', id, 'verified', 'Reviewed identity')],
]
it.each(userChanges)(
  'does not report success or write an audit when %s changes match no live user',
  async (_, change) => {
    serviceRpc.mockClear()
    serviceRest.mockResolvedValueOnce({ data: [] })
    await expect(change('deleted-user')).rejects.toMatchObject({ status: 404, code: 'user-not-found' })
    expect(serviceRpc).not.toHaveBeenCalled()
  },
)
it.each(userChanges)('audits a confirmed %s change', async (_, change) => {
  serviceRpc.mockResolvedValue({ data: 1 })
  serviceRest.mockResolvedValueOnce({ data: [{ user_id: 'live-user' }] })
  await expect(change('live-user')).resolves.toMatchObject({ userId: 'live-user' })
  expect(serviceRpc).toHaveBeenCalledWith('wrs_record_operations_action', expect.any(Object))
})

it('loads every deployment request status and preserves opportunity terms in job rows', async () => {
  const requests = [
    {
      id: 'request-1',
      user_id: 'member-1',
      robot_id: 'robot-1',
      opportunity_id: 'opportunity-1',
      status: 'requested',
      requested_at: '2026-10-04T09:00:00Z',
      matched_at: null,
      decided_at: null,
    },
    {
      id: 'request-2',
      user_id: 'member-2',
      robot_id: 'robot-2',
      opportunity_id: 'opportunity-2',
      status: 'cancelled',
      requested_at: '2026-10-03T09:00:00Z',
      matched_at: null,
      decided_at: '2026-10-03T10:00:00Z',
    },
  ]
  const deployments = [
    {
      id: 'deployment-1',
      user_id: 'member-1',
      robot_id: 'robot-1',
      opportunity_id: 'opportunity-1',
      status: 'active',
      version: 1,
      created_at: '2026-10-02T09:00:00Z',
      updated_at: '2026-10-04T09:00:00Z',
      completed_at: null,
    },
  ]
  const profiles = [
    { user_id: 'member-1', full_name: 'Ada Lovelace', normalized_email: 'ada@example.com', country_code: 'NG' },
    { user_id: 'member-2', full_name: 'Grace Hopper', normalized_email: 'grace@example.com', country_code: 'US' },
  ]
  const opportunities = [
    {
      id: 'opportunity-1',
      title: 'Warehouse inspection',
      description: 'Inspect the loading area.',
      rate_minor: 1200,
      rate_unit: 'hour',
      currency: 'USD',
    },
    {
      id: 'opportunity-2',
      title: 'Inventory scan',
      description: 'Scan inventory rows.',
      rate_minor: 900,
      rate_unit: 'task',
      currency: 'USD',
    },
  ]
  serviceRest.mockImplementation((path, options = {}) => {
    if (options.headers?.Prefer === 'count=exact' && options.headers?.Range === '0-0')
      return Promise.resolve(countResponse(4))
    if (path.startsWith('/rest/v1/deployment_requests?')) return Promise.resolve(rowsResponse(requests))
    if (path.startsWith('/rest/v1/deployments?')) return Promise.resolve(rowsResponse(deployments))
    if (path.startsWith('/rest/v1/user_profiles?user_id=in.')) return Promise.resolve(rowsResponse(profiles))
    if (path.startsWith('/rest/v1/robots?'))
      return Promise.resolve(
        rowsResponse([
          { id: 'robot-1', name: 'Atlas' },
          { id: 'robot-2', name: 'Scout' },
        ]),
      )
    if (path.startsWith('/rest/v1/deployment_opportunities?')) return Promise.resolve(rowsResponse(opportunities))
    throw new Error(`Unexpected read: ${path}`)
  })

  const snapshot = await operationsSnapshot('deployments')

  expect(snapshot.deploymentRequests).toHaveLength(2)
  expect(snapshot.deploymentRequests[1]).toMatchObject({
    status: 'cancelled',
    job_title: 'Inventory scan',
    job_description: 'Scan inventory rows.',
    rate_minor: 900,
    rate_unit: 'task',
  })
  expect(snapshot.deployments[0]).toMatchObject({
    job_description: 'Inspect the loading area.',
    rate_minor: 1200,
    robot_name: 'Atlas',
  })
  const requestRead = serviceRest.mock.calls.find(([path]) => path.startsWith('/rest/v1/deployment_requests?'))
  expect(requestRead[0]).not.toContain('status=eq.requested')
})

it.each([
  ['active', '2026-10-30T12:00:00Z', 'ready', 'Ready for approval.'],
  ['pending', '2026-10-30T12:00:00Z', 'unverified', 'Invited user is not active.'],
  ['suspended', '2026-10-30T12:00:00Z', 'unverified', 'Invited user is not active.'],
  ['active', null, 'unverified', 'Invited user email is not verified.'],
])(
  'checks referral readiness for %s accounts without reading paid plans',
  async (status, verifiedAt, readiness, reason) => {
    const referral = {
      id: 'referral-1',
      referrer_user_id: 'member-1',
      referred_user_id: 'member-2',
      referral_code: 'ABCD1234',
      status: 'pending',
      eligible_at: null,
      qualified_at: null,
      created_at: '2026-10-30T12:00:00Z',
    }
    serviceRest.mockImplementation((path, options = {}) => {
      if (options.headers?.Prefer === 'count=exact' && options.headers?.Range === '0-0')
        return Promise.resolve(countResponse(1))
      if (path.startsWith('/rest/v1/referral_relationships?')) return Promise.resolve(rowsResponse([referral]))
      if (path.startsWith('/rest/v1/community_moderation_actions?')) return Promise.resolve(rowsResponse([]))
      if (path.startsWith('/rest/v1/user_profiles?user_id=in.'))
        return Promise.resolve(
          rowsResponse([
            { user_id: 'member-1', full_name: 'Inviter', normalized_email: 'inviter@example.com' },
            {
              user_id: 'member-2',
              full_name: 'Referred',
              normalized_email: 'referred@example.com',
              status,
              email_verified_at: verifiedAt,
            },
          ]),
        )
      throw new Error(`Unexpected read: ${path}`)
    })
    const snapshot = await operationsSnapshot('risk')
    expect(snapshot.referrals[0]).toMatchObject({
      referral_code: 'ABCD1234',
      referred_name: 'Referred',
      referrer_name: 'Inviter',
      eligibility_status: readiness,
      eligibility_reason: reason,
    })
    expect(snapshot.referrals[0]).not.toHaveProperty('relatedDataUnavailable')
    expect(serviceRest.mock.calls.some(([path]) => path.startsWith('/rest/v1/package_entitlements?'))).toBe(false)
  },
)

it('resolves reviewer names only from strict operator references', async () => {
  const reviewerId = '11111111-1111-4111-8111-111111111111'
  const targetId = '22222222-2222-4222-8222-222222222222'
  const moderation = {
    id: 'moderation-1',
    target_type: 'community_profile',
    target_id: targetId,
    action: 'reviewed',
    reason: 'Checked profile details',
    operator_reference: `operator:${reviewerId}`,
    created_at: '2026-10-01T09:00:00Z',
  }
  serviceRest.mockImplementation((path, options = {}) => {
    if (options.headers?.Prefer === 'count=exact' && options.headers?.Range === '0-0')
      return Promise.resolve(countResponse(1))
    if (path.startsWith('/rest/v1/referral_relationships?')) return Promise.resolve(rowsResponse([]))
    if (path.startsWith('/rest/v1/community_moderation_actions?')) return Promise.resolve(rowsResponse([moderation]))
    if (path.startsWith('/rest/v1/community_leaderboard_profiles?'))
      return Promise.resolve(rowsResponse([{ user_id: targetId, display_alias: 'Ada profile' }]))
    if (path.startsWith('/rest/v1/user_profiles?user_id=in.'))
      return Promise.resolve(
        rowsResponse([{ user_id: reviewerId, full_name: 'Review Operator', normalized_email: 'reviewer@example.com' }]),
      )
    throw new Error(`Unexpected read: ${path}`)
  })

  const snapshot = await operationsSnapshot('risk')

  expect(snapshot.moderation[0]).toMatchObject({
    target_name: 'Ada profile',
    reviewer_name: 'Review Operator',
    reviewer_email: 'reviewer@example.com',
  })
  expect(snapshot.moderation[0]).not.toHaveProperty('relatedDataUnavailable')
})
