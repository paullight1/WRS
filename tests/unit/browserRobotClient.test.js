import { afterEach, describe, expect, it, vi } from 'vitest'
import { browserRobotClient } from '../../src/infrastructure/robot/browserRobotClient.ts'

describe('browserRobotClient active robot response', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rejects Vite-served route modules instead of reporting an empty robot account', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/javascript' },
        json: async () => {
          throw new SyntaxError('Unexpected token i in JSON')
        },
      }),
    )

    await expect(browserRobotClient.active()).rejects.toThrow(/robot service returned an invalid response/i)
  })

  it('accepts an explicit empty robot state from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json; charset=utf-8' },
        json: async () => ({ robot: null, configuration: null }),
      }),
    )

    await expect(browserRobotClient.active()).resolves.toEqual({ robot: null, configuration: null })
  })
})
