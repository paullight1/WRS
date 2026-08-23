import { describe, expect, it } from 'vitest'
import health from '../../api/health.js'

describe('deployment health endpoint', () => {
  it('returns no-store liveness without environment details', async () => {
    const response = await health.fetch(new Request('https://wrs.example/api/health'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    const payload = await response.json()
    expect(payload.status).toBe('ok')
    expect(Object.keys(payload).sort()).toEqual(['release', 'status'])
  })

  it('rejects mutation methods', async () => {
    const response = await health.fetch(new Request('https://wrs.example/api/health', { method: 'POST' }))
    expect(response.status).toBe(405)
  })
})
