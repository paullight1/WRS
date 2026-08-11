import test from 'node:test'
import assert from 'node:assert/strict'
import {
  approveWithdrawal,
  createAdminMiningApi,
  formatAuditRow,
} from '../src/lib/adminMiningApi.js'

function recordingClient(calls) {
  return {
    get: async (path) => { calls.push([path, 'GET']); return {} },
    post: async (path, body) => { calls.push([path, 'POST', body]); return { id: 'response-id' } },
  }
}

test('ordinary members are denied from the admin mining overview', async () => {
  const api = createAdminMiningApi({
    get: async () => { throw Object.assign(new Error('Admin role required'), { status: 403, code: 'FORBIDDEN' }) },
    post: async () => ({}),
  })
  await assert.rejects(api.getOverview(), (error) => error.status === 403 && error.code === 'FORBIDDEN')
})

test('conversion rate drafts publish through the server lifecycle that retires the prior live version', async () => {
  const calls = []
  const api = createAdminMiningApi(recordingClient(calls))
  await api.createConversionRate({
    currency: 'ngn',
    rateMinorPerRbcCent: 1532,
    sourceNote: 'Treasury rate card 2026-08-12',
  })
  await api.publishConversionRate('rate-1', { confirmed: true })

  assert.deepEqual(
    calls,
    [
      ['/admin/mining/conversion-rates', 'POST', {
        currency: 'NGN',
        rateMinorPerRbcCent: 1532,
        sourceNote: 'Treasury rate card 2026-08-12',
      }],
      ['/admin/mining/conversion-rates/rate-1/publish', 'POST', {}],
    ],
  )
})

test('withdrawal review uses explicit approve, reject, and mark-paid requests', async () => {
  const calls = []
  const api = createAdminMiningApi(recordingClient(calls))
  await api.approveWithdrawal('withdrawal-7', { reviewNote: 'Identity and bank details reviewed.' })
  await api.rejectWithdrawal('withdrawal-7', { rejectionReason: 'Account holder name does not match.', reviewNote: 'Ask member to resubmit.' })
  await api.markWithdrawalPaid('withdrawal-7', { payoutReference: 'BANK-REF-8201', reviewNote: 'Paid through the bank portal.' })

  assert.deepEqual(calls, [
    ['/admin/mining/withdrawals/withdrawal-7/approve', 'POST', { reviewNote: 'Identity and bank details reviewed.' }],
    ['/admin/mining/withdrawals/withdrawal-7/reject', 'POST', { rejectionReason: 'Account holder name does not match.', reviewNote: 'Ask member to resubmit.' }],
    ['/admin/mining/withdrawals/withdrawal-7/mark-paid', 'POST', { payoutReference: 'BANK-REF-8201', reviewNote: 'Paid through the bank portal.' }],
  ])
})

test('rejection and paid actions require their audit evidence before a request is sent', async () => {
  const api = createAdminMiningApi(recordingClient([]))
  assert.throws(() => api.rejectWithdrawal('withdrawal-7', { reviewNote: 'Missing reason.' }), /rejection reason/i)
  assert.throws(() => api.markWithdrawalPaid('withdrawal-7', { reviewNote: 'Missing bank reference.' }), /payout reference/i)
})

test('audit rows preserve actor, timestamps, reason, payout reference, and masked account details', () => {
  assert.deepEqual(
    formatAuditRow({
      id: 'audit-4',
      action: 'withdrawal.paid',
      actorUserId: 'admin-ada',
      actorRoles: ['platform_admin'],
      requestId: 'withdrawal-7',
      targetId: 'withdrawal-7',
      createdAt: '2026-08-11T10:15:00.000Z',
      reason: 'Bank confirmation received',
      after: { payoutReference: 'BANK-REF-8201', bank: { name: 'WRS Bank', accountName: 'P***r', accountNumber: '******8042' } },
    }),
    {
      id: 'audit-4',
      action: 'Marked paid',
      actor: 'admin-ada',
      actorRole: 'platform_admin',
      requestId: 'withdrawal-7',
      occurredAt: '2026-08-11T10:15:00.000Z',
      reason: 'Bank confirmation received',
      payoutReference: 'BANK-REF-8201',
      account: 'P***r · WRS Bank · ******8042',
    },
  )
})
