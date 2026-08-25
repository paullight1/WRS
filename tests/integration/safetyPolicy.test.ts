import { describe, expect, it } from 'vitest'
import { getSensitiveActionPolicy } from '../../src/lib/sensitiveActions.js'

describe('production action authority', () => {
  it('does not turn an unfinished sensitive action live merely because its service flag is enabled', () => {
    const policy = getSensitiveActionPolicy('reward.eventCode', {
      mode: 'production',
      services: { rewards: true },
    })
    expect(policy.enabled).toBe(false)
    expect(policy.authoritative).toBe(false)
  })

  it('turns a completed payment action live only when its authoritative service is enabled', () => {
    const unavailable = getSensitiveActionPolicy('payment.checkout', {
      mode: 'production',
      services: { payments: false },
    })
    const available = getSensitiveActionPolicy('payment.checkout', {
      mode: 'production',
      services: { payments: true },
    })
    expect(unavailable.authoritative).toBe(false)
    expect(available.authoritative).toBe(true)
  })
})
