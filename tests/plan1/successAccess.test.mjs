import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluatePaymentSuccessAccess } from '../../src/lib/successAccess.js'

test('a bare success URL never renders a payment success claim', () => {
  const result = evaluatePaymentSuccessAccess({ mode: 'demo', search: '' })
  assert.equal(result.allowed, false)
})

test('demo preview requires an explicit demo token and is labeled non-authoritative', () => {
  const result = evaluatePaymentSuccessAccess({ mode: 'demo', search: '?demo=1' })
  assert.equal(result.allowed, true)
  assert.equal(result.authoritative, false)
  assert.match(result.title, /demo/i)
})

test('production rejects missing or pending transaction evidence', () => {
  assert.equal(evaluatePaymentSuccessAccess({ mode: 'production', search: '?tx=abc' }).allowed, false)
  assert.equal(
    evaluatePaymentSuccessAccess({
      mode: 'production',
      search: '?tx=abc',
      authority: { id: 'abc', status: 'pending', belongsToUser: true },
    }).allowed,
    false,
  )
})

test('production renders success only for a confirmed transaction owned by the current user', () => {
  const result = evaluatePaymentSuccessAccess({
    mode: 'production',
    search: '?tx=abc',
    authority: { id: 'abc', status: 'confirmed', belongsToUser: true },
  })
  assert.equal(result.allowed, true)
  assert.equal(result.authoritative, true)
})

test('production rejects another users confirmed transaction', () => {
  const result = evaluatePaymentSuccessAccess({
    mode: 'production',
    search: '?tx=abc',
    authority: { id: 'abc', status: 'confirmed', belongsToUser: false },
  })
  assert.equal(result.allowed, false)
})
