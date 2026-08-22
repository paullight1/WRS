import { normalizeAccountProfile, type AccountProfileInput } from '../../domain/account/profile'
import { normalizeAccountSettings, type AccountSettings } from '../../domain/account/settings'

export interface AccountSnapshot {
  profile: Record<string, unknown>
  settings: AccountSettings
  deletion: Record<string, unknown> | null
}

export interface SupportTicketInput {
  category: string
  subject: string
  message: string
}

export interface SupportAttachmentInput {
  ticketId: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

export interface AccountRepository {
  snapshot(): Promise<AccountSnapshot>
  updateProfile(input: AccountProfileInput): Promise<Record<string, unknown>>
  updateSettings(input: AccountSettings): Promise<AccountSettings>
  requestDeletion(reason: string): Promise<Record<string, unknown>>
  cancelDeletion(requestId: string): Promise<Record<string, unknown>>
  support(): Promise<Record<string, unknown>>
  createTicket(input: SupportTicketInput): Promise<Record<string, unknown>>
  addTicketMessage(ticketId: string, message: string): Promise<Record<string, unknown>>
  createSupportAttachment(input: SupportAttachmentInput): Promise<Record<string, unknown>>
  uploadSupportAttachment(signedUrl: string, file: Blob, mimeType: string): Promise<void>
  knowledgeBase(query: string): Promise<Record<string, unknown>>
  operations(scope: string): Promise<Record<string, unknown>>
  operationsAction(input: Record<string, unknown>): Promise<Record<string, unknown>>
}

export class AccountService {
  constructor(private readonly repository: AccountRepository) {}

  snapshot() {
    return this.repository.snapshot()
  }

  updateProfile(input: AccountProfileInput) {
    return this.repository.updateProfile(normalizeAccountProfile(input))
  }

  updateSettings(input: AccountSettings) {
    return this.repository.updateSettings(normalizeAccountSettings(input))
  }

  requestDeletion(reason: string) {
    return this.repository.requestDeletion(String(reason || '').trim().slice(0, 1000))
  }

  cancelDeletion(requestId: string) {
    if (!requestId) throw new Error('Deletion request is required.')
    return this.repository.cancelDeletion(requestId)
  }

  support() {
    return this.repository.support()
  }

  createTicket(input: SupportTicketInput) {
    const category = String(input.category || '').trim()
    const subject = String(input.subject || '').trim()
    const message = String(input.message || '').trim()
    if (!category) throw new Error('Support category is required.')
    if (subject.length < 4 || subject.length > 160) throw new Error('Subject must be 4–160 characters.')
    if (!message || message.length > 10000) throw new Error('Support message is required.')
    return this.repository.createTicket({ category, subject, message })
  }

  addTicketMessage(ticketId: string, message: string) {
    const body = String(message || '').trim()
    if (!ticketId || !body || body.length > 10000) throw new Error('Ticket and message are required.')
    return this.repository.addTicketMessage(ticketId, body)
  }

  createSupportAttachment(input: SupportAttachmentInput) {
    if (!input.ticketId || !input.fileName) throw new Error('Ticket and file name are required.')
    if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > 10_485_760) {
      throw new Error('Support attachment must be 10 MB or smaller.')
    }
    return this.repository.createSupportAttachment(input)
  }

  uploadSupportAttachment(signedUrl: string, file: Blob, mimeType: string) {
    if (!signedUrl || !file) throw new Error('Support upload grant is required.')
    return this.repository.uploadSupportAttachment(signedUrl, file, mimeType)
  }

  knowledgeBase(query = '') {
    return this.repository.knowledgeBase(String(query || '').trim().slice(0, 100))
  }

  operations(scope = 'overview') {
    return this.repository.operations(String(scope || 'overview').trim())
  }

  operationsAction(input: Record<string, unknown>) {
    if (!input.action || !input.reason) throw new Error('Operation action and reason are required.')
    return this.repository.operationsAction(input)
  }
}
