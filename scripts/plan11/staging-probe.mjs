#!/usr/bin/env node
const base = String(process.env.WRS_STAGING_URL || process.argv[2] || '').replace(/\/$/, '')
const expectedCandidate = String(process.env.WRS_EXPECTED_RELEASE_CANDIDATE || '').trim()
if (!/^https:\/\//.test(base)) throw new Error('WRS_STAGING_URL must be an https URL')
if (!/^[0-9a-f]{40}$/i.test(expectedCandidate)) {
  throw new Error('WRS_EXPECTED_RELEASE_CANDIDATE must be a full 40-character commit SHA')
}

const routes = ['/', '/app', '/login']
for (const route of routes) {
  const response = await fetch(`${base}${route}`, { redirect: 'follow' })
  if (!response.ok) throw new Error(`${route} returned ${response.status}`)
  const headers = response.headers
  for (const required of [
    'content-security-policy',
    'strict-transport-security',
    'x-content-type-options',
    'referrer-policy',
  ]) {
    if (!headers.get(required)) throw new Error(`${route} missing ${required}`)
  }
}

const healthResponse = await fetch(`${base}/api/health`, { headers: { accept: 'application/json' } })
if (!healthResponse.ok) throw new Error(`/api/health returned ${healthResponse.status}`)
const health = await healthResponse.json().catch(() => null)
if (health?.status !== 'ok') throw new Error('/api/health did not report ok')
if (!healthResponse.headers.get('cache-control')?.includes('no-store')) {
  throw new Error('/api/health must be no-store')
}

const expectedRelease = expectedCandidate.slice(0, 12).toLowerCase()
const deployedRelease = String(health.release || '').toLowerCase()
if (deployedRelease !== expectedRelease) {
  throw new Error(`staging release mismatch: deployed=${deployedRelease || 'unknown'} expected=${expectedRelease}`)
}

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      base,
      releaseCandidate: expectedCandidate,
      deployedRelease,
      healthStatus: health.status,
    },
    null,
    2,
  ),
)
