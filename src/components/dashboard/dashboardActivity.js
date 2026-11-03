import { atomicUnitsToDecimal } from '../../domain/mining/metrics.ts'

const labels = {
  daily: 'Daily reward',
  'daily-login': 'Daily login reward',
  'daily-active': 'Daily activity reward',
  'daily-activity': 'Daily activity reward',
  'signup-welcome': 'Welcome reward',
  welcome: 'Welcome reward',
  signup: 'Welcome reward',
  mining: 'Mining reward',
  referral: 'Referral reward',
  training: 'Training reward',
  'data-task': 'Data contribution reward',
  academy: 'Academy reward',
  community: 'Community reward',
  reversal: 'Reward adjustment',
}

export function dashboardActivity(rewards, cash = []) {
  const records = []
  if (rewards?.authoritative === true && Array.isArray(rewards.dashboard?.history)) {
    for (const award of rewards.dashboard.history) {
      if (
        !['XP', 'RBC'].includes(award.currency) ||
        !/^-?\d+$/.test(award.amount) ||
        !Number.isInteger(award.atomicScale) ||
        award.atomicScale < 0 ||
        award.atomicScale > 12 ||
        !Number.isFinite(Date.parse(award.createdAt))
      )
        continue
      records.push({
        id: `reward:${award.currency}:${award.id}`,
        kind: labels[award.source] || `${award.source.replace(/[_-]/g, ' ')} reward`,
        direction: BigInt(award.amount) < 0n ? 'debit' : 'credit',
        currency: award.currency,
        amountAtomic: award.amount,
        atomicScale: award.atomicScale,
        createdAt: award.createdAt,
        reference:
          BigInt(award.amount) < 0n
            ? 'Reward adjustment'
            : award.currency === 'XP'
              ? 'Points added to your account'
              : award.source === 'mining'
                ? 'Confirmed mining reward'
                : 'RoboCoin added to your account',
        status: 'Posted',
      })
    }
  }
  for (const transaction of Array.isArray(cash) ? cash : []) {
    if (!Number.isSafeInteger(transaction.amountMinor) || !Number.isFinite(Date.parse(transaction.createdAt))) continue
    records.push({ ...transaction, id: `cash:${transaction.id}` })
  }
  return [...new Map(records.map((record) => [record.id, record])).values()].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id),
  )
}

export function activityAmount(transaction) {
  const sign = transaction.direction === 'debit' ? '−' : '+'
  if (typeof transaction.amountAtomic === 'string') {
    const amount = atomicUnitsToDecimal(transaction.amountAtomic.replace(/^-/, ''), transaction.atomicScale)
    const [whole, fraction = ''] = amount.split('.')
    const digits = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const decimal =
      transaction.currency === 'XP' ? fraction.replace(/0+$/, '') : fraction.replace(/0+$/, '').padEnd(2, '0')
    return `${sign}${digits}${decimal ? `.${decimal}` : ''} ${transaction.currency}`
  }
  if (transaction.currency === 'RBC')
    return transaction.amountRbc === null ? 'Completed' : `≈ ${transaction.amountRbc} RBC`
  return (
    sign +
    new Intl.NumberFormat('en-US', { style: 'currency', currency: transaction.currency }).format(
      Math.abs(transaction.amountMinor) / 100,
    )
  )
}
