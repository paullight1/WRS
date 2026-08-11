export const analyticsPeriods = ['day', 'month', 'all']
export const leaderboardCategories = ['miners', 'contributors', 'validators', 'ambassadors', 'referrers', 'cities', 'countries']
export const withdrawalStates = ['pending', 'approved', 'paid', 'rejected', 'failed', 'cancelled']

const defaultIdempotencyKey = () => crypto.randomUUID()
const productionGet = (...args) => import('./api.js').then(({ apiGet }) => apiGet(...args))
const productionPost = (...args) => import('./api.js').then(({ apiPost }) => apiPost(...args))

function requiredIdentifier(value, label) {
  const identifier = String(value || '').trim()
  if (!identifier) throw new Error(`${label} is required`)
  return encodeURIComponent(identifier)
}

function rbcCents(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

function amountCents(value, keys) {
  for (const key of keys) {
    if (Number.isFinite(Number(value?.[key]))) return Number(value[key])
  }
  return 0
}

export function formatRbcCents(value) {
  return `${(Number(value || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RBC`
}

export function formatCurrencyCents(value, currency = 'USD') {
  return `${String(currency || 'USD').toUpperCase()} ${(Number(value || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function buildConversionQuoteSnapshot(quote = {}) {
  const destinationCurrency = String(quote.destinationCurrency || quote.currency || 'USD').toUpperCase()
  return {
    source: formatRbcCents(amountCents(quote, ['sourceAmountRbcCents', 'amountRbcCents'])),
    destination: formatCurrencyCents(amountCents(quote, ['destinationAmountCents', 'destinationCents', 'destinationAmountMinor']), destinationCurrency),
    fee: formatRbcCents(amountCents(quote, ['feeRbcCents', 'feeCents'])),
    rateVersion: quote.rate?.version ?? quote.rateVersion ?? quote.conversionRateVersion ?? 'Not published',
    expiresAt: quote.expiresAt || null,
  }
}

export function maskBankAccount(value) {
  const normalized = String(value || '').replace(/\s/g, '')
  return normalized.length > 4 ? `•••• ${normalized.slice(-4)}` : '••••'
}

export function validateWithdrawalRequest(input = {}, wallet = {}) {
  const errors = {}
  const amount = rbcCents(input.amount)
  const available = amountCents(wallet, ['availableRbcCents'])

  if (!amount) errors.amount = 'Enter an amount greater than 0 RBC.'
  else if (amount < 100) errors.amount = 'Enter at least 1.00 RBC.'
  else if (amount > available) errors.amount = `Amount exceeds your available ${(available / 100).toFixed(2)} RBC balance.`
  if (!String(input.quoteId || '').trim()) errors.quoteId = 'Get a current conversion quote before requesting a withdrawal.'
  if (!String(input.bankCountry || '').trim()) errors.bankCountry = 'Choose the bank country.'
  else if (!/^[a-z]{2}$/i.test(String(input.bankCountry).trim())) errors.bankCountry = 'Use the two-letter ISO country code, for example NG.'
  if (!String(input.bankName || '').trim()) errors.bankName = 'Enter the bank name.'
  if (!String(input.accountName || '').trim()) errors.accountName = 'Enter the account holder name.'
  if (!String(input.accountNumber || '').trim()) errors.accountNumber = 'Enter the account number or IBAN.'
  if (!String(input.currency || '').trim()) errors.currency = 'Choose the destination currency.'
  if (!input.confirmed) errors.confirmed = 'Confirm that these bank details are correct.'
  return errors
}

export function withdrawalPayload(input = {}, quote = {}) {
  const amountRbcCents = Number.isSafeInteger(quote.amountRbcCents) ? quote.amountRbcCents : rbcCents(input.amount)
  return {
    quoteId: String(quote.id || input.quoteId || '').trim(),
    bankCountry: String(input.bankCountry || '').trim().toUpperCase(),
    bankName: String(input.bankName || '').trim(),
    accountName: String(input.accountName || '').trim(),
    accountNumber: String(input.accountNumber || '').replace(/\s/g, ''),
    amountRbcCents,
    currency: String(quote.currency || input.currency || '').trim().toUpperCase(),
    confirmed: Boolean(input.confirmed),
  }
}

export function withdrawalStatusPresentation(status) {
  const state = String(status || '').toLowerCase()
  const messages = {
    pending: { label: 'Pending review', tone: 'gold', detail: 'Request submitted. No bank payout has been made.' },
    approved: { label: 'Approved', tone: 'tertiary', detail: 'Approved for manual bank payout. Payment is not yet complete.' },
    paid: { label: 'Paid', tone: 'success', detail: 'An administrator recorded the completed bank payout.' },
    rejected: { label: 'Rejected', tone: 'error', detail: 'This request was not approved. Review the reason before submitting another request.' },
    failed: { label: 'Payout failed', tone: 'error', detail: 'The bank payout did not complete. Contact support before submitting another request.' },
    cancelled: { label: 'Cancelled', tone: 'outline', detail: 'This withdrawal request was cancelled before payout.' },
  }
  return messages[state] || { label: 'Recorded', tone: 'outline', detail: 'Check this request for the latest server-confirmed status.' }
}

export function walletTabs() {
  return ['Overview', 'Withdrawals', 'History']
}

export function normalizeEventCode(value) {
  const code = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!/^[A-Z0-9]{6,30}$/.test(code)) throw new Error('Enter a six to thirty character event code')
  return code
}

export function normalizeAnalyticsPeriod(value) {
  if (!analyticsPeriods.includes(value)) throw new Error('Choose a valid analytics period')
  return value
}

export function activityStatus(status) {
  const states = {
    pending: { label: 'Pending validation', tone: 'gold' },
    approved: { label: 'Approved', tone: 'success' },
    rejected: { label: 'Rejected', tone: 'error' },
    claimed: { label: 'Claimed', tone: 'tertiary' },
    settled: { label: 'Settled', tone: 'success' },
  }
  return states[String(status || '').toLowerCase()] || { label: 'Recorded', tone: 'outline' }
}

export function createMiningApi({ get = productionGet, post = productionPost, makeIdempotencyKey = defaultIdempotencyKey } = {}) {
  const mutation = (path, body = {}, idempotencyKey) => post(path, body, { idempotencyKey: idempotencyKey || makeIdempotencyKey() })

  return {
    getOverview: () => get('/mining'),
    getMissions: (scope = 'daily') => get(`/mining/missions?scope=${encodeURIComponent(scope)}`),
    claimMission: (missionId) => mutation(`/mining/missions/${requiredIdentifier(missionId, 'Mission')}/claim`),
    getPower: () => get('/mining/power'),
    getAnalytics: (period = 'day') => get(`/mining/analytics?period=${normalizeAnalyticsPeriod(period)}`),
    getActivity: () => get('/mining/activity'),
    getBoosts: () => get('/mining/boosts'),
    activateBoost: (boostId) => mutation(`/mining/boosts/${requiredIdentifier(boostId, 'Boost')}/activate`),
    extendBoost: (boostId) => mutation(`/mining/boosts/${requiredIdentifier(boostId, 'Boost')}/extend`),
    getEventCodes: () => get('/mining/event-codes'),
    redeemEventCode: (code) => mutation('/mining/event-codes/redeem', { code: normalizeEventCode(code) }),
    getLeaderboard: (category = 'miners') => {
      if (!leaderboardCategories.includes(category)) throw new Error('Choose a valid leaderboard category')
      return get(`/mining/leaderboard?category=${encodeURIComponent(category)}`)
    },
    getWallet: () => get('/rbc/wallet'),
    getConversionRate: () => get('/rbc/conversion-rate'),
    createConversionQuote: (input, idempotencyKey) => mutation('/rbc/conversion-quotes', input, idempotencyKey),
    createWithdrawal: (input, idempotencyKey) => mutation('/rbc/withdrawals', input, idempotencyKey),
    getWithdrawals: () => get('/rbc/withdrawals'),
    getTransactions: () => get('/rbc/transactions'),
  }
}

export const miningApi = createMiningApi()
