#!/usr/bin/env node

const token = String(process.env.WRS_GITHUB_GOVERNANCE_TOKEN || '').trim()
const repository = String(process.env.WRS_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || 'paullight1/WRS').trim()
const apiOrigin = 'https://api.github.com'
const branchName = 'main'
const requiredContexts = [
  'static',
  'tests',
  'e2e',
  'security',
  'supply-chain-and-performance',
  'accessibility',
  'postgres-backup-restore',
]

if (!token) throw new Error('WRS_GITHUB_GOVERNANCE_TOKEN is required')
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error('WRS_GITHUB_REPOSITORY must be owner/repo')
}

async function githubJson(path, label) {
  const response = await fetch(`${apiOrigin}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload) {
    throw new Error(`${label} failed with HTTP ${response.status}; governance token needs repository Administration:read`)
  }
  return payload
}

const encodedRepo = repository
  .split('/')
  .map((part) => encodeURIComponent(part))
  .join('/')
const branchPath = `/repos/${encodedRepo}/branches/main`
const protectionPath = `/repos/${encodedRepo}/branches/main/protection`
const branch = await githubJson(branchPath, 'main branch inspection')
if (branch.protected !== true) throw new Error('main is not protected')

const protection = await githubJson(protectionPath, 'main branch protection inspection')

const requiredStatusChecks = protection.required_status_checks
if (!requiredStatusChecks) throw new Error('required_status_checks are not configured on main')
const configuredContexts = new Set([
  ...((requiredStatusChecks.contexts || []).map(String)),
  ...((requiredStatusChecks.checks || []).map((check) => String(check.context || ''))),
])
const missingContexts = requiredContexts.filter((context) => !configuredContexts.has(context))
if (missingContexts.length) {
  throw new Error(`main is missing required release check contexts: ${missingContexts.join(', ')}`)
}

const requiredReviews = protection.required_pull_request_reviews
const requiredApprovingReviewCount = Number(requiredReviews?.required_approving_review_count || 0)
if (!requiredReviews || requiredApprovingReviewCount < 1) {
  throw new Error('required_pull_request_reviews must require at least one approval')
}
if (requiredReviews.dismiss_stale_reviews !== true) {
  throw new Error('required_pull_request_reviews must dismiss stale approvals')
}

if (protection.enforce_admins?.enabled !== true) {
  throw new Error('enforce_admins must be enabled so repository admins cannot bypass main protection')
}
if (protection.allow_force_pushes?.enabled === true) throw new Error('allow_force_pushes must be disabled')
if (protection.allow_deletions?.enabled === true) throw new Error('allow_deletions must be disabled')

process.stdout.write(
  `${JSON.stringify(
    {
      gate: 'github-branch-protection',
      status: 'PROBE_PASS',
      checkedAt: new Date().toISOString(),
      repository,
      branch: branchName,
      protected: true,
      required_status_checks: requiredContexts,
      required_pull_request_reviews: true,
      required_approving_review_count: requiredApprovingReviewCount,
      dismissStaleReviews: true,
      enforce_admins: true,
      allow_force_pushes: false,
      allow_deletions: false,
      note: 'Read-only verification of the live main-branch governance configuration. The probe cannot enable or change repository rules.',
    },
    null,
    2,
  )}\n`,
)
