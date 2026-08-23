import fs from 'node:fs'

export const REQUIRED_GATES = [
  'supabase-infrastructure',
  'vercel-infrastructure',
  'github-branch-protection',
  'payment-sandbox',
  'payout-sandbox',
  'storage-scanning-deletion',
  'alert-routing',
  'staging-e2e',
  'manual-accessibility',
  'mobile-web-vitals',
  'provider-backup-restore',
  'hosting-rollback',
  'legal-privacy-compliance',
  'named-launch-owners',
]

const VALID = new Set(['PASS', 'FAIL', 'PENDING', 'EXTERNAL_BLOCKER'])
const HUMAN_SIGNOFF_GATES = new Set(['manual-accessibility', 'legal-privacy-compliance', 'named-launch-owners'])

export function loadEvidence(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'))
}

function validIsoTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

function meaningfulEvidenceRef(value) {
  return typeof value === 'string' && value.trim().length >= 8 && !/^(todo|tbd|pending|none)$/i.test(value.trim())
}

export function validateEvidence(matrix) {
  const issues = []
  if (matrix?.schemaVersion !== 1) issues.push('schemaVersion must be 1')
  if (!Array.isArray(matrix?.gates)) issues.push('gates must be an array')

  const gates = Array.isArray(matrix?.gates) ? matrix.gates : []
  const seen = new Set()
  for (const gate of gates) {
    if (!gate?.id) continue
    if (seen.has(gate.id)) issues.push(`duplicate gate: ${gate.id}`)
    seen.add(gate.id)
  }

  const byId = new Map(gates.map((gate) => [gate.id, gate]))
  for (const id of REQUIRED_GATES) {
    const gate = byId.get(id)
    if (!gate) {
      issues.push(`missing gate: ${id}`)
      continue
    }
    if (!VALID.has(gate.status)) issues.push(`invalid status for ${id}`)
    if (!gate.owner || !gate.evidence) issues.push(`owner/evidence required for ${id}`)

    if (gate.status === 'PASS') {
      if (!meaningfulEvidenceRef(gate.evidenceRef)) issues.push(`PASS requires evidenceRef for ${id}`)
      if (!validIsoTimestamp(gate.checkedAt)) issues.push(`PASS requires checkedAt ISO timestamp for ${id}`)
      if (HUMAN_SIGNOFF_GATES.has(id)) {
        if (!Array.isArray(gate.approvedBy) || gate.approvedBy.length === 0) {
          issues.push(`PASS requires approvedBy for ${id}`)
        }
      }
    }
  }
  return issues
}

export function decision(matrix) {
  const issues = validateEvidence(matrix)
  if (issues.length) return { decision: 'NO_GO', issues, blockers: [] }
  const blockers = matrix.gates.filter((gate) => gate.status !== 'PASS')
  return { decision: blockers.length ? 'NO_GO' : 'GO', issues: [], blockers }
}
