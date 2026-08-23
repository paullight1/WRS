#!/usr/bin/env node
import { decision, loadEvidence } from './evidence.mjs'

const path = process.argv[2] || 'Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json'
const allowBlocked = process.argv.includes('--allow-blocked')
const result = decision(loadEvidence(path))
console.log(JSON.stringify(result, null, 2))
if (result.issues.length) process.exit(2)
if (result.decision !== 'GO' && !allowBlocked) process.exit(1)
