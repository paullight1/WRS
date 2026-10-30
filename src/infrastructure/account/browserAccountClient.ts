import { apiUrl } from '../http/apiUrl'
import {
  AccountService,
  type AccountRepository,
  type SupportAttachmentInput,
  type SupportTicketInput,
} from '../../services/account/AccountService'
import type { AccountProfileInput } from '../../domain/account/profile'
import type { AccountSettings } from '../../domain/account/settings'

type Json = Record<string, unknown>

type TeamDirectory = {
  members: Array<{ userId: string; fullName: string; email: string; roles: string[] }>
  stats: {
    total: number
    active: number
    pending: number
    suspended: number
    roleCounts: Record<string, number>
    scope: 'all' | 'shown'
  }
  hasMore: boolean
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Account request failed.')
  return body as T
}

const repository: AccountRepository = {
  snapshot: () => request('/api/account'),
  updateProfile: (input: AccountProfileInput) =>
    request<Json>('/api/account/profile', { method: 'POST', body: JSON.stringify(input) }),
  updateSettings: async (input: AccountSettings) => {
    const result = await request<{ settings: AccountSettings }>('/api/account/settings', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return result.settings
  },
  requestDeletion: (reason: string) =>
    request<Json>('/api/account/delete', { method: 'POST', body: JSON.stringify({ action: 'request', reason }) }),
  cancelDeletion: (requestId: string) =>
    request<Json>('/api/account/delete', { method: 'POST', body: JSON.stringify({ action: 'cancel', requestId }) }),
  support: () => request('/api/support'),
  createTicket: (input: SupportTicketInput) =>
    request<Json>('/api/support/ticket', { method: 'POST', body: JSON.stringify({ action: 'create', ...input }) }),
  addTicketMessage: (ticketId: string, message: string) =>
    request<Json>('/api/support/ticket', {
      method: 'POST',
      body: JSON.stringify({ action: 'message', ticketId, message }),
    }),
  createSupportAttachment: (input: SupportAttachmentInput) =>
    request<Json>('/api/support/attachment', { method: 'POST', body: JSON.stringify(input) }),
  async uploadSupportAttachment(signedUrl: string, file: Blob, mimeType: string) {
    const response = await fetch(signedUrl, { method: 'PUT', headers: { 'content-type': mimeType }, body: file })
    if (!response.ok) throw new Error('Support attachment upload failed.')
  },
  knowledgeBase: (query: string) => request(`/api/knowledge-base?q=${encodeURIComponent(query)}`),
  operations: (scope: string) => request(`/api/admin/operations?scope=${encodeURIComponent(scope)}`),
  operationsAction: (input: Record<string, unknown>) =>
    request<Json>('/api/admin/action', { method: 'POST', body: JSON.stringify(input) }),
}

export const browserAccountClient = Object.assign(new AccountService(repository), {
  supportThread: (ticketId: string, before: { id: string; time: string } | null = null) =>
    request<{ messages: Record<string, unknown>[]; hasMore: boolean; before: { id: string; time: string } | null }>(
      `/api/admin/support-thread?${new URLSearchParams({ ticketId, ...(before ? { beforeId: before.id, beforeTime: before.time } : {}) })}`,
    ),

  async team() {
    return request<TeamDirectory>('/api/admin/team')
  },
  roleSubject(identifier: string) {
    return request<{ userId: string; identifier: string; roles: string[]; isAdmin?: boolean }>(
      `/api/admin/role-subject?identifier=${encodeURIComponent(identifier)}`,
    )
  },
})
