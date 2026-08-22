import test from 'node:test'
import assert from 'node:assert/strict'

import { getMockDataPolicy, isStaleOperationalYear } from '../../src/lib/mockDataPolicy.js'

test('production never exposes sensitive mock balances, payouts, contracts or identities', () => {
  const policy = getMockDataPolicy('production')
  assert.equal(policy.showSensitiveMockData, false)
  assert.equal(policy.requiresDemoLabel, false)
})

test('demo mock data is allowed only with a prominent label', () => {
  const policy = getMockDataPolicy('demo')
  assert.equal(policy.showSensitiveMockData, true)
  assert.equal(policy.requiresDemoLabel, true)
  assert.match(policy.label, /demo|illustrative/i)
})

test('2025 is stale operational content for the current 2026 product cycle', () => {
  assert.equal(isStaleOperationalYear('31 Aug 2025', 2026), true)
  assert.equal(isStaleOperationalYear('Sample period', 2026), false)
})
