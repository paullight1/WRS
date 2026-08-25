import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SENSITIVE_ACTIONS,
  getSensitiveActionPolicy,
  requiredSensitiveActionIds,
} from '../../src/lib/sensitiveActions.js'

const REQUIRED = [
  'payment.checkout',
  'payment.success',
  'wallet.deposit',
  'wallet.withdraw',
  'reward.eventCode',
  'reward.boost',
  'training.biometricSubmit',
  'training.fileUpload',
  'data.taskSubmit',
  'deployment.request',
  'deployment.pause',
  'marketplace.purchase',
  'account.deleteData',
  'support.ticket',
]

test('inventory covers every audited P0/P1 sensitive action', () => {
  assert.deepEqual([...requiredSensitiveActionIds()].sort(), [...REQUIRED].sort())
  for (const id of REQUIRED) assert.ok(SENSITIVE_ACTIONS[id], `missing ${id}`)
})

test('production defaults closed when a required authoritative service is unavailable', () => {
  const policy = getSensitiveActionPolicy('wallet.withdraw', {
    mode: 'production',
    services: { payments: false },
  })
  assert.equal(policy.enabled, false)
  assert.equal(policy.authoritative, false)
  assert.match(policy.reason, /unavailable/i)
})

test('service flags alone cannot activate an unfinished production action', () => {
  const policy = getSensitiveActionPolicy('reward.eventCode', {
    mode: 'production',
    services: { rewards: true },
  })
  assert.equal(policy.enabled, false)
  assert.equal(policy.authoritative, false)
  assert.match(policy.reason, /not completed|implementation gate/i)
})

test('a completed action still requires its authoritative service', () => {
  const disabled = getSensitiveActionPolicy('payment.checkout', {
    mode: 'production',
    services: { payments: false },
  })
  const enabled = getSensitiveActionPolicy('payment.checkout', {
    mode: 'production',
    services: { payments: true },
  })
  assert.equal(disabled.authoritative, false)
  assert.equal(enabled.authoritative, true)
})

test('demo actions are explicitly simulation-only and never authoritative', () => {
  const policy = getSensitiveActionPolicy('payment.checkout', {
    mode: 'demo',
    services: {},
  })
  assert.equal(policy.enabled, true)
  assert.equal(policy.authoritative, false)
  assert.equal(policy.demo, true)
  assert.match(policy.label, /demo/i)
})
