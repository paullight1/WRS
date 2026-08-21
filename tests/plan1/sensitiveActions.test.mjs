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
