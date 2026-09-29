export interface MiningMetricSession {
  status: 'active' | 'ended' | 'settled' | 'cancelled'
  startedAt: string
  endsAt: string
  rateAtomicPerHour: string
}

function decimal(value: string, scale: number) {
  if (!/^-?\d+$/.test(value) || !Number.isInteger(scale) || scale < 0 || scale > 12) {
    throw new TypeError('Invalid atomic amount or scale.')
  }
  const negative = value.startsWith('-')
  const digits = (negative ? value.slice(1) : value).replace(/^0+(?=\d)/, '')
  if (scale === 0) return `${negative && digits !== '0' ? '-' : ''}${digits}`
  const padded = digits.padStart(scale + 1, '0')
  const whole = padded.slice(0, -scale)
  const fraction = padded.slice(-scale)
  return `${negative && digits !== '0' ? '-' : ''}${whole}.${fraction}`
}

export function atomicUnitsToDecimal(value: string, scale: number): string {
  return decimal(value, scale)
}

export function summarizeMiningSessions(sessions: MiningMetricSession[], now: number) {
  let activeRobots = 0
  let miningMilliseconds = 0
  let weightedRate = 0n

  for (const session of sessions) {
    if (session.status === 'cancelled') continue
    const startedAt = Date.parse(session.startedAt)
    const endsAt = Date.parse(session.endsAt)
    if (!Number.isFinite(startedAt) || !Number.isFinite(endsAt)) continue
    const currentActive = session.status === 'active' && startedAt <= now && now < endsAt
    if (currentActive) activeRobots = 1
    const duration =
      session.status === 'active' ? Math.max(0, Math.min(endsAt, now) - startedAt) : Math.max(0, endsAt - startedAt)
    if (!duration) continue
    if (!/^\d+$/.test(session.rateAtomicPerHour)) throw new TypeError('Invalid mining rate.')
    miningMilliseconds += duration
    weightedRate += BigInt(session.rateAtomicPerHour) * BigInt(duration)
  }

  let averageRateAtomicPerHour: string | null = null
  if (miningMilliseconds > 0) {
    const scaledAverage = (weightedRate * 1_000_000n + BigInt(miningMilliseconds) / 2n) / BigInt(miningMilliseconds)
    const whole = scaledAverage / 1_000_000n
    const fraction = (scaledAverage % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '')
    averageRateAtomicPerHour = fraction ? `${whole}.${fraction}` : whole.toString()
  }

  return { activeRobots: activeRobots as 0 | 1, miningMilliseconds, averageRateAtomicPerHour }
}
