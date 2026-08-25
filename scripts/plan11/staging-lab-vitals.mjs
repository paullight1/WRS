#!/usr/bin/env node
import { chromium } from '@playwright/test'
import { loadEvidence } from './evidence.mjs'

const matrix = loadEvidence('Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json')
const base = String(process.env.WRS_STAGING_URL || process.argv[2] || '').replace(/\/$/, '')
const expectedRelease = String(matrix.releaseCandidate || '')
  .slice(0, 12)
  .toLowerCase()
if (!/^https:\/\//.test(base)) throw new Error('WRS_STAGING_URL must be an https URL')
if (!/^[0-9a-f]{12}$/i.test(expectedRelease)) throw new Error('Plan 11 release candidate is invalid')

const healthResponse = await fetch(`${base}/api/health`, { headers: { accept: 'application/json' } })
if (!healthResponse.ok) throw new Error(`/api/health returned ${healthResponse.status}`)
const health = await healthResponse.json().catch(() => null)
if (health?.status !== 'ok' || String(health.release || '').toLowerCase() !== expectedRelease) {
  throw new Error(
    `staging release mismatch: deployed=${String(health?.release || 'unknown').toLowerCase()} expected=${expectedRelease}`,
  )
}

const LCP_BUDGET_MS = 2500
const CLS_BUDGET = 0.1
const routes = ['/', '/login']
const browser = await chromium.launch({ headless: true })
const evidence = []

try {
  for (const route of routes) {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    const session = await context.newCDPSession(page)
    await session.send('Network.enable')
    await session.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    })
    await page.addInitScript(() => {
      window.__wrsVitals = { lcp: 0, cls: 0 }
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const latest = entries.at(-1)
        if (latest) window.__wrsVitals.lcp = latest.startTime
      }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__wrsVitals.cls += entry.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })

    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 30_000 })
    if (!response?.ok()) throw new Error(`${route} returned ${response?.status() || 'no response'}`)
    await page.waitForTimeout(2000)
    const vitals = await page.evaluate(() => window.__wrsVitals)
    evidence.push({ route, lcpMs: Math.round(vitals.lcp), cls: Number(vitals.cls.toFixed(4)) })
    await context.close()
  }
} finally {
  await browser.close()
}

const failed = evidence.filter((row) => row.lcpMs > LCP_BUDGET_MS || row.cls > CLS_BUDGET)
const result = {
  gate: 'mobile-web-vitals',
  status: failed.length ? 'LAB_FAIL' : 'LAB_PASS',
  checkedAt: new Date().toISOString(),
  releaseCandidate: matrix.releaseCandidate,
  profile: 'mobile-lab-1.6Mbps-150ms',
  budgets: { lcpMs: LCP_BUDGET_MS, cls: CLS_BUDGET },
  measurements: evidence,
  note: 'Lab LCP/CLS regression evidence only. Field p75 LCP/INP/CLS is still required before this launch gate can be PASS.',
}
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
if (failed.length) process.exit(1)
