import { afterEach, describe, expect, it, vi } from 'vitest'
import { browserEcosystemClient } from '../../src/infrastructure/ecosystem/browserEcosystemClient.ts'

describe('browserEcosystemClient marketplace catalogue', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rejects malformed successful responses instead of passing an invalid catalogue to the screen', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'No owned robot is available' }),
      }),
    )

    await expect(browserEcosystemClient.marketplace()).rejects.toThrow(
      'Marketplace service returned an invalid catalogue.',
    )
  })

  it('returns a well-formed catalogue from the service', async () => {
    const items = [{ versionId: 'catalogue-v1', name: 'Language Pack' }]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items }) }),
    )

    await expect(browserEcosystemClient.marketplace()).resolves.toEqual(items)
  })
})
