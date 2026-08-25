import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const evidencePath = resolve(process.cwd(), process.argv[2] || process.env.WRS_LIVE_EVIDENCE_FILE || '')
const requiredGates = [
  'infrastructure',
  'governance',
  'payments',
  'sensitiveData',
  'observability',
  'staging',
  'recovery',
  'humanReview',
]
const requiredOwners = ['releaseOwner', 'rollbackOwner', 'incidentOwner', 'privacyOwner', 'financeOwner']
const placeholder = /<|>|placeholder|example|external blocker|todo|tbd/i

function realReference(value) {
  const current = String(value || '').trim()
  return current.length >= 3 && !placeholder.test(current)
}

function evidenceListIsReal(items) {
  return Array.isArray(items) && items.length > 0 && items.every(realReference)
}

async function main() {
  if (!process.argv[2] && !process.env.WRS_LIVE_EVIDENCE_FILE) {
    throw new Error('Provide the live evidence JSON path as argv[2] or WRS_LIVE_EVIDENCE_FILE.')
  }

  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'))
  const failures = []

  if (evidence.schemaVersion !== 1) failures.push('unsupported or missing schemaVersion')
  if (!/^[0-9a-f]{40}$/i.test(String(evidence.releaseCommit || ''))) failures.push('releaseCommit is not an exact commit SHA')
  if (!realReference(evidence.stagingDeployment)) failures.push('stagingDeployment evidence is missing')
  if (!realReference(evidence.productionTarget)) failures.push('productionTarget evidence is missing')
  if (Number(evidence.openP0) !== 0) failures.push(`openP0 must be 0, got ${evidence.openP0}`)
  if (Number(evidence.openP1) !== 0) failures.push(`openP1 must be 0, got ${evidence.openP1}`)

  for (const name of requiredGates) {
    const gate = evidence.gates?.[name]
    if (!gate || gate.status !== 'PASS') failures.push(`${name} gate is not PASS`)
    if (!evidenceListIsReal(gate?.evidence)) failures.push(`${name} gate has no real evidence references`)
  }

  const repositoryChecks = evidence.repositoryChecks || {}
  for (const name of ['quality', 'securityLaunch', 'recovery']) {
    if (!realReference(repositoryChecks[name])) failures.push(`repository check ${name} is missing`)
  }
  if (!evidenceListIsReal(repositoryChecks.database)) failures.push('database workflow evidence is missing')

  for (const owner of requiredOwners) {
    if (!realReference(evidence.approvals?.[owner])) failures.push(`${owner} is not assigned`)
  }

  if (evidence.decision !== 'GO') failures.push('evidence decision is not explicitly GO')

  if (failures.length) {
    console.error('WRS LIVE DECISION: NO-GO')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }

  console.log(`WRS LIVE DECISION: GO releaseCommit=${evidence.releaseCommit}`)
  console.log(`stagingDeployment=${evidence.stagingDeployment}`)
  console.log(`productionTarget=${evidence.productionTarget}`)
}

main().catch((error) => {
  console.error(`WRS LIVE DECISION: NO-GO — ${error instanceof Error ? error.message : 'invalid evidence package'}`)
  process.exitCode = 1
})
