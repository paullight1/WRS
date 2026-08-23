#!/usr/bin/env node
const base = String(process.env.WRS_STAGING_URL || process.argv[2] || '').replace(/\/$/, '')
if (!/^https:\/\//.test(base)) throw new Error('WRS_STAGING_URL must be an https URL')

const routes = ['/', '/app', '/login']
for (const route of routes) {
  const response = await fetch(`${base}${route}`, { redirect: 'follow' })
  if (!response.ok) throw new Error(`${route} returned ${response.status}`)
  const headers = response.headers
  for (const required of ['content-security-policy','strict-transport-security','x-content-type-options','referrer-policy']) {
    if (!headers.get(required)) throw new Error(`${route} missing ${required}`)
  }
}
console.log(`staging probe passed for ${base}`)
