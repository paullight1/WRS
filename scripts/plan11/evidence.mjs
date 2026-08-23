import fs from 'node:fs'

export const REQUIRED_GATES = [
  'supabase-infrastructure','vercel-infrastructure','github-branch-protection','payment-sandbox','payout-sandbox',
  'storage-scanning-deletion','alert-routing','staging-e2e','manual-accessibility','mobile-web-vitals',
  'provider-backup-restore','hosting-rollback','legal-privacy-compliance','named-launch-owners',
]
const VALID = new Set(['PASS','FAIL','PENDING','EXTERNAL_BLOCKER'])

export function loadEvidence(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'))
}

export function validateEvidence(matrix) {
  const issues = []
  if (matrix?.schemaVersion !== 1) issues.push('schemaVersion must be 1')
  if (!Array.isArray(matrix?.gates)) issues.push('gates must be an array')
  const byId = new Map((matrix?.gates || []).map((gate) => [gate.id, gate]))
  for (const id of REQUIRED_GATES) {
    const gate = byId.get(id)
    if (!gate) { issues.push(`missing gate: ${id}`); continue }
    if (!VALID.has(gate.status)) issues.push(`invalid status for ${id}`)
    if (!gate.owner || !gate.evidence) issues.push(`owner/evidence required for ${id}`)
  }
  return issues
}

export function decision(matrix) {
  const issues = validateEvidence(matrix)
  if (issues.length) return { decision: 'NO_GO', issues, blockers: [] }
  const blockers = matrix.gates.filter((gate) => gate.status !== 'PASS')
  return { decision: blockers.length ? 'NO_GO' : 'GO', issues: [], blockers }
}
