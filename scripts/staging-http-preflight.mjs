const baseURL = String(process.env.WRS_STAGING_URL || '').trim().replace(/\/$/, '')
const errors = []

if (!baseURL.startsWith('https://') || /localhost|127\.0\.0\.1|\.invalid/i.test(baseURL)) {
  errors.push('WRS_STAGING_URL must be a real HTTPS staging deployment URL')
}

async function fetchChecked(path) {
  const response = await fetch(`${baseURL}${path}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
    headers: { 'user-agent': 'wrs-plan11-staging-preflight' },
  })
  return response
}

async function main() {
  if (errors.length) throw new Error(errors.join('; '))

  const landing = await fetchChecked('/')
  if (!landing.ok) throw new Error(`staging landing returned HTTP ${landing.status}`)
  const html = await landing.text()
  if (!/World Robotic/i.test(html) && !/id=["']root["']/i.test(html)) {
    throw new Error('staging landing did not return the WRS application shell')
  }

  const session = await fetchChecked('/api/auth/session')
  if (!session.ok) throw new Error(`anonymous session endpoint returned HTTP ${session.status}`)
  const body = await session.json().catch(() => null)
  if (!body || !Object.prototype.hasOwnProperty.call(body, 'session')) {
    throw new Error('session endpoint did not return the expected authoritative envelope')
  }

  const requiredHeaders = ['content-security-policy', 'x-content-type-options', 'referrer-policy']
  for (const name of requiredHeaders) {
    if (!landing.headers.get(name)) throw new Error(`staging response is missing security header ${name}`)
  }

  console.log(`WRS staging HTTP preflight PASS: ${baseURL}`)
}

main().catch((error) => {
  console.error(`WRS staging HTTP preflight FAILED: ${error instanceof Error ? error.message : 'unknown error'}`)
  process.exitCode = 1
})
