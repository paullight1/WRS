import type {
  DeploymentContractRecord,
  DeploymentOpportunity,
  DeploymentRecord,
  DeploymentRequestRecord,
  DeploymentWorkInput,
} from '../../domain/deployment/types'

export interface DeploymentCatalogItem {
  opportunity: DeploymentOpportunity
  eligibility: { eligible: boolean; reasons: string[] }
  request?: DeploymentRequestRecord | null
  contractId?: string | null
}

export interface DeploymentRepository {
  catalog(): Promise<DeploymentCatalogItem[]>
  detail(opportunityId: string): Promise<DeploymentCatalogItem | null>
  request(opportunityId: string, idempotencyKey: string): Promise<DeploymentRequestRecord & { eligibility?: unknown }>
  contract(contractId: string): Promise<DeploymentContractRecord | null>
  acceptContract(contractId: string, idempotencyKey: string): Promise<{ deployment: DeploymentRecord }>
  active(): Promise<DeploymentRecord[]>
  deployment(deploymentId: string): Promise<DeploymentRecord | null>
  transition(deploymentId: string, state: string, reason: string, idempotencyKey: string): Promise<DeploymentRecord>
  recordWork(deploymentId: string, input: DeploymentWorkInput): Promise<{ workLogId: string; verificationStatus: string }>
}

export class DeploymentService {
  constructor(private readonly repository: DeploymentRepository) {}

  catalog() {
    return this.repository.catalog()
  }

  detail(opportunityId: string) {
    return this.repository.detail(opportunityId)
  }

  request(opportunityId: string, idempotencyKey: string) {
    if (!opportunityId || !idempotencyKey) throw new Error('Opportunity and idempotency key are required.')
    return this.repository.request(opportunityId, idempotencyKey)
  }

  contract(contractId: string) {
    return this.repository.contract(contractId)
  }

  acceptContract(contractId: string, idempotencyKey: string) {
    if (!contractId || !idempotencyKey) throw new Error('Contract and idempotency key are required.')
    return this.repository.acceptContract(contractId, idempotencyKey)
  }

  active() {
    return this.repository.active()
  }

  deployment(deploymentId: string) {
    return this.repository.deployment(deploymentId)
  }

  transition(deploymentId: string, state: string, reason: string, idempotencyKey: string) {
    if (!deploymentId || !state || !idempotencyKey) throw new Error('Deployment transition is incomplete.')
    return this.repository.transition(deploymentId, state, reason, idempotencyKey)
  }

  recordWork(deploymentId: string, input: DeploymentWorkInput) {
    if (!deploymentId || !input.idempotencyKey || !input.taskReference) throw new Error('Work evidence is incomplete.')
    if (!Number.isFinite(input.durationMinutes) || input.durationMinutes < 0) throw new Error('Invalid work duration.')
    if (!Number.isFinite(input.units) || input.units < 0) throw new Error('Invalid work units.')
    return this.repository.recordWork(deploymentId, input)
  }
}
