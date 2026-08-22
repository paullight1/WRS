import { HttpError } from './http.js'
import { serviceRest, serviceRpc } from './supabase.js'

function mapOpportunity(row) {
  if (!row) return null
  return {
    id: row.id,
    industrySlug: row.industry_slug,
    industryName: row.deployment_industries?.name || row.industry_slug,
    clientName: row.deployment_clients?.name || 'WRS client',
    title: row.title,
    description: row.description,
    status: row.status,
    minPackageSlug: row.min_package_slug,
    requiredSkills: row.required_skills || [],
    requiredCertifications: row.required_certifications || [],
    minQualityScore: Number(row.min_quality_score || 0),
    requireKyc: Boolean(row.require_kyc),
    regulated: Boolean(row.regulated),
    allowedCountries: row.allowed_countries || [],
    rateMinor: Number(row.rate_minor),
    rateUnit: row.rate_unit,
    currency: row.currency,
    slots: Number(row.slots),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    termsTemplate: row.terms_template || {},
  }
}

function mapRequest(row) {
  if (!row) return null
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    robotId: row.robot_id,
    status: row.status,
    eligibility: row.eligibility_snapshot || null,
    requestedAt: row.requested_at,
    matchedAt: row.matched_at,
    decidedAt: row.decided_at,
  }
}

function mapContract(row) {
  if (!row) return null
  return {
    id: row.id,
    requestId: row.request_id,
    status: row.status,
    rateMinor: Number(row.rate_minor),
    rateUnit: row.rate_unit,
    currency: row.currency,
    termsSnapshot: row.terms_snapshot || {},
    offeredAt: row.offered_at,
    acceptedAt: row.accepted_at,
    declinedAt: row.declined_at,
  }
}

function mapDeployment(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    opportunityId: row.opportunity_id,
    robotId: row.robot_id,
    contractId: row.contract_id,
    requestId: row.request_id,
    status: row.status,
    version: Number(row.version),
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    startedAt: row.started_at,
    pausedAt: row.paused_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    failedAt: row.failed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function activeRobotForUser(userId) {
  const { data } = await serviceRest(
    `/rest/v1/robots?owner_user_id=eq.${encodeURIComponent(userId)}&lifecycle=eq.active&select=id,owner_user_id,name,lifecycle,package_slug&limit=1`,
  )
  return Array.isArray(data) ? data[0] || null : null
}

export async function deploymentEligibility(userId, robotId, opportunityId) {
  const { data } = await serviceRpc('wrs_deployment_eligibility', {
    p_user_id: userId,
    p_robot_id: robotId,
    p_opportunity_id: opportunityId,
  })
  return data
}

export async function deploymentCatalog(userId) {
  const { data } = await serviceRest(
    '/rest/v1/deployment_opportunities?status=eq.open&select=*,deployment_clients(name),deployment_industries(name,regulated)&order=starts_at.asc.nullslast,created_at.asc&limit=100',
  )
  const rows = Array.isArray(data) ? data : []
  const robot = await activeRobotForUser(userId)
  return Promise.all(
    rows.map(async (row) => ({
      opportunity: mapOpportunity(row),
      eligibility: robot
        ? await deploymentEligibility(userId, robot.id, row.id)
        : { eligible: false, reasons: ['robot-ownership'], evidence: {} },
    })),
  )
}

export async function deploymentOpportunity(userId, opportunityId) {
  const { data } = await serviceRest(
    `/rest/v1/deployment_opportunities?id=eq.${encodeURIComponent(opportunityId)}&select=*,deployment_clients(name),deployment_industries(name,regulated)&limit=1`,
  )
  const row = Array.isArray(data) ? data[0] || null : null
  if (!row) return null
  const robot = await activeRobotForUser(userId)
  const { data: requestsData } = await serviceRest(
    `/rest/v1/deployment_requests?user_id=eq.${encodeURIComponent(userId)}&opportunity_id=eq.${encodeURIComponent(opportunityId)}&status=in.(requested,matched,accepted)&select=*,deployment_contracts(id,status)&order=requested_at.desc&limit=1`,
  )
  const requestRow = Array.isArray(requestsData) ? requestsData[0] || null : null
  const contractJoin = Array.isArray(requestRow?.deployment_contracts)
    ? requestRow.deployment_contracts[0]
    : requestRow?.deployment_contracts
  return {
    opportunity: mapOpportunity(row),
    eligibility: robot
      ? await deploymentEligibility(userId, robot.id, row.id)
      : { eligible: false, reasons: ['robot-ownership'], evidence: {} },
    request: mapRequest(requestRow),
    contractId: contractJoin?.id || null,
  }
}

export async function requestDeployment(userId, opportunityId, idempotencyKey) {
  const robot = await activeRobotForUser(userId)
  if (!robot) throw new HttpError(409, 'An active owned robot is required.', 'robot-required')
  const { data } = await serviceRpc('wrs_request_deployment', {
    p_user_id: userId,
    p_robot_id: robot.id,
    p_opportunity_id: opportunityId,
    p_idempotency_key: idempotencyKey,
  })
  return data
}

export async function contractForUser(userId, contractId) {
  const { data } = await serviceRest(
    `/rest/v1/deployment_contracts?id=eq.${encodeURIComponent(contractId)}&select=*,deployment_requests(user_id)&limit=1`,
  )
  const row = Array.isArray(data) ? data[0] || null : null
  if (!row) return null
  const requestOwner = Array.isArray(row.deployment_requests)
    ? row.deployment_requests[0]?.user_id
    : row.deployment_requests?.user_id
  if (requestOwner !== userId) return null
  return mapContract(row)
}

export async function acceptDeploymentContract(userId, contractId, idempotencyKey) {
  const { data } = await serviceRpc('wrs_accept_deployment_contract', {
    p_user_id: userId,
    p_contract_id: contractId,
    p_idempotency_key: idempotencyKey,
  })
  return data
}

export async function ownedDeployments(userId) {
  const { data } = await serviceRest(
    `/rest/v1/deployments?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=100`,
  )
  return (Array.isArray(data) ? data : []).map(mapDeployment)
}

export async function ownedDeployment(userId, deploymentId) {
  const { data } = await serviceRest(
    `/rest/v1/deployments?id=eq.${encodeURIComponent(deploymentId)}&user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,
  )
  return mapDeployment(Array.isArray(data) ? data[0] || null : null)
}

export async function deploymentById(deploymentId) {
  const { data } = await serviceRest(`/rest/v1/deployments?id=eq.${encodeURIComponent(deploymentId)}&select=*&limit=1`)
  return mapDeployment(Array.isArray(data) ? data[0] || null : null)
}

export async function transitionDeployment(userId, deploymentId, state, reason, idempotencyKey) {
  const { data } = await serviceRpc('wrs_transition_deployment', {
    p_user_id: userId,
    p_deployment_id: deploymentId,
    p_next_state: state,
    p_reason: reason || null,
    p_idempotency_key: idempotencyKey,
  })
  return data
}

export async function recordDeploymentWork(userId, deploymentId, input) {
  const { data } = await serviceRpc('wrs_record_deployment_work', {
    p_user_id: userId,
    p_deployment_id: deploymentId,
    p_task_reference: input.taskReference,
    p_duration_minutes: input.durationMinutes,
    p_units: input.units,
    p_metadata: input.metadata || {},
    p_idempotency_key: input.idempotencyKey,
  })
  return String(data)
}

export async function matchDeploymentRequest(requestId, termsOverride = {}) {
  const { data } = await serviceRpc('wrs_match_deployment_request', {
    p_request_id: requestId,
    p_terms_override: termsOverride,
  })
  return String(data)
}

export async function verifyDeploymentWork(workLogId, status, qualityScore, verifierReference, evidence = {}) {
  const { data } = await serviceRpc('wrs_verify_deployment_work', {
    p_work_log_id: workLogId,
    p_status: status,
    p_quality_score: qualityScore,
    p_verifier_reference: verifierReference,
    p_evidence: evidence,
  })
  return String(data)
}

export async function reportDeploymentIncident(userId, deploymentId, severity, summary, idempotencyKey, metadata = {}) {
  const { data } = await serviceRpc('wrs_report_deployment_incident', {
    p_user_id: userId,
    p_deployment_id: deploymentId,
    p_severity: severity,
    p_summary: summary,
    p_idempotency_key: idempotencyKey,
    p_metadata: metadata,
  })
  return String(data)
}

export async function settleDeployment(deploymentId) {
  const { data } = await serviceRpc('wrs_settle_deployment', { p_deployment_id: deploymentId })
  return data
}

export { mapContract, mapDeployment, mapOpportunity, mapRequest }
