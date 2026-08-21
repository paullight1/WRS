// RED contract: these tests intentionally precede the safety implementation.
import test from 'node:test'
import assert from 'node:assert/strict'

import { parseRuntimeConfig, assertProductionConfig } from '../../src/lib/runtimeConfig.js'

test('rejects unknown application modes', () => {
  assert.throws(() => parseRuntimeConfig({ VITE_WRS_MODE: 'banana' }), /VITE_WRS_MODE/)
})

test('defaults to explicit demo behavior when mode is omitted', () => {
  const config = parseRuntimeConfig({})
  assert.equal(config.mode, 'demo')
  assert.equal(config.isDemo, true)
  assert.equal(config.isProduction, false)
})

test('production refuses to validate without authoritative sensitive services', () => {
  const config = parseRuntimeConfig({ VITE_WRS_MODE: 'production' })
  assert.throws(() => assertProductionConfig(config), /production configuration/i)
})

test('production accepts only explicitly configured authoritative services', () => {
  const config = parseRuntimeConfig({
    VITE_WRS_MODE: 'production',
    VITE_WRS_AUTHORITY_URL: 'https://api.example.test',
    VITE_WRS_PAYMENT_SERVICE: 'enabled',
    VITE_WRS_IDENTITY_SERVICE: 'enabled',
    VITE_WRS_DATA_SERVICE: 'enabled',
    VITE_WRS_REWARD_SERVICE: 'enabled',
    VITE_WRS_DEPLOYMENT_SERVICE: 'enabled',
    VITE_WRS_SUPPORT_SERVICE: 'enabled',
  })
  assert.doesNotThrow(() => assertProductionConfig(config))
})
