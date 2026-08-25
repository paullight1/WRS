#!/usr/bin/env node
import crypto from 'node:crypto'
import { loadEvidence } from './evidence.mjs'

const matrix = loadEvidence('Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json')
const drillUrl = String(process.env.WRS_ALERT_DRILL_URL || '').trim()
const secret = String(process.env.WRS_ALERT_DRILL_SECRET || '')
const maxAckSeconds = Number(process.env.WRS_ALERT_MAX_ACK_SECONDS || 120)
const pollIntervalMs = 5_000

if (!/^https:\/\//.test(drillUrl)) throw new Error('WRS_ALERT_DRILL_URL must be an https URL')
if (!secret) throw new Error('WRS_ALERT_DRILL_SECRET is required')
if (!Number.isFinite(maxAckSeconds) || maxAckSeconds < 15 || maxAckSeconds > 600) {
  throw new Error('WRS_ALERT_MAX_ACK_SECONDS must be between 15 and 600')
}
if (!/^[0-9a-f]{40}$/i.test(String(matrix.releaseCandidate || ''))) {
  throw new Error('Plan 11 evidence must identify a full release candidate SHA')
}

const bridgeOrigin = new URL(drillUrl).origin
const scenarios = [
  'auth-failure-burst',
  'upstream-timeout',
  'payment-provider-failure',
  'deletion-worker-failure',
  'ledger-reconciliation-anomaly',
]

async function readJson(response, label) {
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload) throw new Error(`${label} failed with HTTP ${response.status}`)
  return payload
}

async function createIncident(scenario) {
  const requestId = crypto.randomUUID()
  const sentAt = new Date().toISOString()
  const response = await fetch(drillUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      eventType: 'wrs.plan11.synthetic-critical',
      synthetic: true,
      severity: 'critical',
      scenario,
      requestId,
      sentAt,
      releaseCandidate: matrix.releaseCandidate,
    }),
  })
  const payload = await readJson(response, `alert injection for ${scenario}`)
  const incidentId = String(payload.incidentId || '').trim()
  const statusUrl = String(payload.statusUrl || '').trim()
  if (!incidentId || !/^https:\/\//.test(statusUrl)) {
    throw new Error(`alert bridge did not return incidentId/statusUrl for ${scenario}`)
  }
  if (new URL(statusUrl).origin !== bridgeOrigin) {
    throw new Error(`alert bridge statusUrl changed origin for ${scenario}`)
  }
  return { scenario, requestId, sentAt, incidentId, statusUrl }
}

async function pollIncident(incident) {
  const started = Date.parse(incident.sentAt)
  const deadline = started + maxAckSeconds * 1_000

  while (Date.now() <= deadline) {
    const response = await fetch(incident.statusUrl, {
      headers: { authorization: `Bearer ${secret}`, accept: 'application/json' },
    })
    const payload = await readJson(response, `alert acknowledgement poll for ${incident.scenario}`)
    if (String(payload.status || '').toLowerCase() === 'acknowledged') {
      const responder = String(payload.responder || '').trim()
      const acknowledgedAt = String(payload.acknowledgedAt || '').trim()
      const escalationOwner = String(payload.escalationOwner || '').trim()
      const acknowledgedMs = Date.parse(acknowledgedAt)
      if (!responder || !escalationOwner || !Number.isFinite(acknowledgedMs) || acknowledgedMs < started) {
        throw new Error(`alert acknowledgement evidence is incomplete for ${incident.scenario}`)
      }
      const ackLatencySeconds = Number(((acknowledgedMs - started) / 1_000).toFixed(3))
      if (ackLatencySeconds > maxAckSeconds) {
        throw new Error(`alert acknowledgement exceeded SLO for ${incident.scenario}`)
      }
      return {
        scenario: incident.scenario,
        requestId: incident.requestId,
        incidentId: incident.incidentId,
        sentAt: incident.sentAt,
        acknowledgedAt,
        responder,
        escalationOwner,
        ackLatencySeconds,
      }
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }
  throw new Error(`alert acknowledgement timed out for ${incident.scenario}`)
}

const incidents = await Promise.all(scenarios.map(createIncident))
const outcomes = await Promise.all(incidents.map(pollIncident))
const maxObservedAckSeconds = Math.max(...outcomes.map((outcome) => outcome.ackLatencySeconds))

process.stdout.write(
  `${JSON.stringify(
    {
      gate: 'alert-routing',
      status: 'PROBE_PASS',
      checkedAt: new Date().toISOString(),
      releaseCandidate: matrix.releaseCandidate,
      synthetic: true,
      maxAllowedAckSeconds: maxAckSeconds,
      maxObservedAckSeconds,
      outcomes,
      note: 'Synthetic monitoring-bridge incidents were delivered and acknowledged by named responders. Matrix PASS still requires this bridge to represent the real production monitoring/paging destination and the evidence reference to be reviewed.',
    },
    null,
    2,
  )}\n`,
)
