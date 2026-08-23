import { describe, expect, it } from 'vitest'
import { scanText } from '../../../scripts/check-secrets.mjs'

describe('repository secret scanner', () => {
  it('detects a seeded credential-shaped secret without storing a real credential', () => {
    const fake = ['ghp_', 'A'.repeat(36)].join('')
    expect(scanText(`example=${fake}`)).toEqual([
      expect.objectContaining({ kind: 'github-token' }),
    ])
  })

  it('does not flag ordinary security documentation', () => {
    expect(scanText('Rotate API tokens and keep service-role credentials in managed secrets.')).toEqual([])
  })
})
