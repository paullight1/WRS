#!/usr/bin/env node
import { decision, loadEvidence } from './evidence.mjs'

const args = process.argv.slice(2)
const allowBlocked = args.includes('--allow-blocked')
const explicitPath = args.find((arg) => !arg.startsWith('--'))
const path = explicitPath || 'Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json'
const expectedReleaseCandidate = String(process.env.WRS_EXPECTED_RELEASE_CANDIDATE || '').trim()
const result = decision(loadEvidence(path), { expectedReleaseCandidate })

console.log(JSON.stringify(result, null, 2))
if (result.issues.length) process.exit(2)
if (result.decision !== 'GO' && !allowBlocked) process.exit(1)
