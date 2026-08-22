import { describe, expect, it } from 'vitest'
import { getSensitiveActionPolicy } from '../../src/lib/sensitiveActions.js'

describe('production action authority', () => {
  it('does not turn unfinished payments live merely because a service flag is enabled', () => {
    const policy = getSensitiveActionPolicy('payment.checkout', {
      mode: 'production',
      services: { payments: true },
    })
    expect(policy.enabled).toBe(false)
    expect(policy.authoritative).toBe(false)
  })
})
