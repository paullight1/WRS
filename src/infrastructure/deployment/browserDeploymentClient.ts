import type {
  DeploymentContractRecord,
  DeploymentRecord,
  DeploymentRequestRecord,
  DeploymentWorkInput,
} from '../../domain/deployment/types'
import type { DeploymentCatalogItem, DeploymentRepository } from '../../services/deployment/DeploymentService'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Deployment request failed.')
  return body as T
}

export const browserDeploymentClient: DeploymentRepository = {
  async catalog() {
    const result = await request<{ items: DeploymentCatalogItem[] }>('/api/deployments')
    return result.items
  },
  async detail(opportunityId) {
    const result = await request<{ item: DeploymentCatalogItem | null }>(
      `/api/deployments?opportunityId=${encodeURIComponent(opportunityId)}`,
    )
    return result.item
  },
  async request(opportunityId, idempotencyKey) {
    return request<DeploymentRequestRecord & { eligibility?: unknown }>('/api/deployments/request', {
      method: 'POST',
      body: JSON.stringify({ opportunityId, idempotencyKey }),
    })
  },
  async contract(contractId) {
    const result = await request<{ contract: DeploymentContractRecord | null }>(
      `/api/deployments/contract?contractId=${encodeURIComponent(contractId)}`,
    )
    return result.contract
  },
  async acceptContract(contractId, idempotencyKey) {
    return request<{ deployment: DeploymentRecord }>('/api/deployments/contract', {
      method: 'POST',
      body: JSON.stringify({ contractId, idempotencyKey }),
    })
  },
  async active() {
    const result = await request<{ deployments: DeploymentRecord[] }>('/api/deployments?scope=owned')
    return result.deployments
  },
  async deployment(deploymentId) {
    const result = await request<{ deployment: DeploymentRecord | null }>(
      `/api/deployments?deploymentId=${encodeURIComponent(deploymentId)}`,
    )
    return result.deployment
  },
  async transition(deploymentId, state, reason, idempotencyKey) {
    const result = await request<{ deployment: DeploymentRecord }>('/api/deployments/state', {
      method: 'POST',
      body: JSON.stringify({ deploymentId, state, reason, idempotencyKey }),
    })
    return result.deployment
  },
  async recordWork(deploymentId, input: DeploymentWorkInput) {
    return request<{ workLogId: string; verificationStatus: string }>('/api/deployments/telemetry', {
      method: 'POST',
      body: JSON.stringify({ deploymentId, ...input }),
    })
  },
}
