import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const modulePath = '../../api/_lib/' + 'supabase.js'
const env = (globalThis as typeof globalThis & { process: { env: Record<string, string | undefined> } }).process.env

async function supabase() {
  return import(modulePath)
}

beforeEach(() => {
  env.SUPABASE_URL = 'https://example.supabase.invalid'
  env.SUPABASE_PUBLISHABLE_KEY = 'public-test-key'
  env.SUPABASE_SECRET_KEY = 'secret-test-key'
  env.WRS_UPSTREAM_TIMEOUT_MS = '500'
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete env.SUPABASE_URL
  delete env.SUPABASE_PUBLISHABLE_KEY
  delete env.SUPABASE_SECRET_KEY
  delete env.WRS_UPSTREAM_TIMEOUT_MS
})

describe('fail-closed upstream resilience', () => {
  it('aborts a hung upstream request at the configured timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: unknown, init?: RequestInit) => {
        if (!init?.signal) return Promise.reject(new Error('timeout signal missing'))
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
        })
      }),
    )
    const { supabaseRequest } = await supabase()
    const rejection = expect(supabaseRequest('/rest/v1/health')).rejects.toMatchObject({
      status: 504,
      code: 'upstream-timeout',
    })
    await vi.advanceTimersByTimeAsync(501)
    await rejection
  })

  it('maps an upstream outage to an unavailable error rather than success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"down"}', { status: 503 })))
    const { supabaseRequest } = await supabase()
    await expect(supabaseRequest('/rest/v1/health')).rejects.toMatchObject({ status: 502, code: 'upstream-error' })
  })

  it('does not blindly retry a state-changing request, preserving idempotency ownership', async () => {
    const upstream = vi.fn(async () => new Response('{"message":"outage"}', { status: 503 }))
    vi.stubGlobal('fetch', upstream)
    const { supabaseRequest } = await supabase()
    await expect(
      supabaseRequest('/rest/v1/rpc/write', { method: 'POST', body: { idempotencyKey: 'retry-safe' } }),
    ).rejects.toBeTruthy()
    expect(upstream).toHaveBeenCalledTimes(1)
  })
})
