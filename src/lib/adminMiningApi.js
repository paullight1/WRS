const adminPath = '/admin/mining'

function requireId(value, label) {
  const id = String(value || '').trim()
  if (!id) throw new Error(`${label} is required`)
  return encodeURIComponent(id)
}

function requireText(value, label, { max = 500 } = {}) {
  const text = String(value || '').trim()
  if (!text) throw new Error(`${label} is required`)
  if (text.length > max) throw new Error(`${label} is too long`)
  return text
}

function mutation(client, path, body) {
  return client.post(path, body, { idempotencyKey: crypto.randomUUID() })
}

export function createAdminMiningApi(client) {
  if (!client?.get || !client?.post) throw new Error('Admin mining API client requires get and post methods')
  return {
    getOverview: () => client.get(`${adminPath}/overview`),
    listConversionRates: () => client.get(`${adminPath}/conversion-rates`),
    listWithdrawals: () => client.get(`${adminPath}/withdrawals`),
    listAudit: () => client.get(`${adminPath}/audit`),
    createConversionRate: (input) => createConversionRateWith(client, input),
    publishConversionRate: (id, input) => publishConversionRateWith(client, id, input),
    approveWithdrawal: (id, input) => approveWithdrawalWith(client, id, input),
    rejectWithdrawal: (id, input) => rejectWithdrawalWith(client, id, input),
    markWithdrawalPaid: (id, input) => markWithdrawalPaidWith(client, id, input),
  }
}

function createConversionRateWith(client, input) {
  const currency = String(input?.currency || '').trim().toUpperCase()
  const rateMinorPerRbcCent = Number(input?.rateMinorPerRbcCent)
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter code')
  if (!Number.isInteger(rateMinorPerRbcCent) || rateMinorPerRbcCent <= 0) throw new Error('Rate must be a positive integer in destination minor units per RBC cent')
  const sourceNote = requireText(input?.sourceNote, 'Source note')
  return mutation(client, `${adminPath}/conversion-rates`, { currency, rateMinorPerRbcCent, sourceNote })
}

function publishConversionRateWith(client, id, { confirmed } = {}) {
  if (confirmed !== true) throw new Error('Publish confirmation is required')
  return mutation(client, `${adminPath}/conversion-rates/${requireId(id, 'Rate ID')}/publish`, {})
}

function approveWithdrawalWith(client, id, { reviewNote } = {}) {
  return mutation(client, `${adminPath}/withdrawals/${requireId(id, 'Withdrawal ID')}/approve`, { reviewNote: requireText(reviewNote, 'Review note') })
}

function rejectWithdrawalWith(client, id, { rejectionReason, reviewNote } = {}) {
  return mutation(client, `${adminPath}/withdrawals/${requireId(id, 'Withdrawal ID')}/reject`, {
    rejectionReason: requireText(rejectionReason, 'Rejection reason'),
    reviewNote: requireText(reviewNote, 'Review note'),
  })
}

function markWithdrawalPaidWith(client, id, { payoutReference, reviewNote } = {}) {
  return mutation(client, `${adminPath}/withdrawals/${requireId(id, 'Withdrawal ID')}/mark-paid`, {
    payoutReference: requireText(payoutReference, 'Payout reference', { max: 160 }),
    reviewNote: requireText(reviewNote, 'Review note'),
  })
}

const browserClient = {
  get: async (path) => (await import('./api.js')).apiGet(path),
  post: async (path, body, options) => (await import('./api.js')).apiPost(path, body, options),
}

export const adminMiningApi = createAdminMiningApi(browserClient)
export const getAdminMiningOverview = adminMiningApi.getOverview
export const listConversionRates = adminMiningApi.listConversionRates
export const listWithdrawals = adminMiningApi.listWithdrawals
export const listMiningAudit = adminMiningApi.listAudit
export const createConversionRate = adminMiningApi.createConversionRate
export const publishConversionRate = adminMiningApi.publishConversionRate
export const approveWithdrawal = adminMiningApi.approveWithdrawal
export const rejectWithdrawal = adminMiningApi.rejectWithdrawal
export const markWithdrawalPaid = adminMiningApi.markWithdrawalPaid

const actionLabels = {
  'withdrawal.approved': 'Approved',
  'withdrawal.rejected': 'Rejected',
  'withdrawal.mark_paid': 'Marked paid',
  'withdrawal.paid': 'Marked paid',
  'conversion_rate.created': 'Rate drafted',
  'conversion_rate.drafted': 'Rate drafted',
  'conversion_rate.published': 'Rate published',
  'conversion_rate.retired': 'Rate retired',
}

export function formatAuditRow(event) {
  const withdrawal = event?.after || event?.withdrawal || event?.before || {}
  const bank = withdrawal.bank || {}
  const actor = event?.actor || {}
  const accountNumber = bank.accountNumber || withdrawal.maskedAccountNumber || withdrawal.accountNumberMasked || ''
  const maskedAccountNumber = /[•*]/.test(accountNumber) ? accountNumber : ''
  const accountName = bank.accountName || withdrawal.accountName || ''
  const safeAccountName = /[•*]/.test(accountName) ? accountName : ''
  const bankName = bank.name || withdrawal.bankName || ''
  const accountBits = [safeAccountName, bankName, maskedAccountNumber].filter(Boolean)
  return {
    id: String(event?.id || ''),
    action: actionLabels[event?.action] || String(event?.action || 'Admin action').replace(/[._]/g, ' '),
    actor: String(actor.name || event?.actorName || event?.actorUserId || 'System'),
    actorRole: String(actor.role || event?.actorRole || event?.actorRoles?.[0] || 'system'),
    requestId: String(event?.requestId || event?.withdrawalId || event?.targetId || ''),
    occurredAt: String(event?.occurredAt || event?.createdAt || ''),
    reason: String(event?.reason || event?.reviewNote || ''),
    payoutReference: String(event?.payoutReference || withdrawal.payoutReference || ''),
    account: accountBits.join(' · '),
  }
}

export function formatMinorUnits(value, currency = 'RBC') {
  const amount = Number(value || 0) / 100
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}
