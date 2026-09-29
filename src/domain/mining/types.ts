export type MiningSessionStatus = 'active' | 'ended' | 'settled' | 'cancelled'
export type MiningLeaderboardPeriod = 'week' | 'all-time'

export interface MiningRuleSnapshot {
  ruleId: string
  version: number
  issuanceEnabled: boolean
  rateAtomicPerHour: string
  atomicUnitScale: number
  perSessionCapAtomic: string | null
  perUserDailyCapAtomic: string | null
}

export interface MiningSession {
  id: string
  status: MiningSessionStatus
  startedAt: string
  endsAt: string
  settledAt: string | null
  robotId: string
  worksiteId: string | null
  rule: MiningRuleSnapshot
  miningPower: number
  estimatedAwardAtomic: string | null
  awardTransactionId: string | null
}

export interface MiningRobotChoice {
  robotId: string
  name: string
  lifecycle: 'pending' | 'active' | 'suspended' | 'retired'
  unlocked: boolean
  unlockRequirement: string | null
}

export interface MiningWorksiteChoice {
  worksiteId: string
  name: string
  description?: string
  available: boolean
}

export interface MiningStats {
  activeRobots: 0 | 1
  miningMilliseconds: number
  averageRateAtomicPerHour: string | null
  atomicScale: number | null
}

export interface MiningBalance {
  availableAtomic: string | null
  atomicScale: number | null
}

export interface MiningSnapshot {
  authoritative: true
  serverNow: string
  session: MiningSession | null
  recentSessions: MiningSession[]
  robots: MiningRobotChoice[]
  worksites: MiningWorksiteChoice[]
  stats: MiningStats
  balance: MiningBalance
  eligibility: { eligible: boolean; reasonCodes: string[] }
  issuanceEnabled: boolean
  miningPower: number
  rateBreakdown: Record<string, string | number> | null
}

export interface MiningLeaderboardRow {
  rank: number
  memberHandle: string
  earnedAtomic: string
  atomicScale: number
}

export interface MiningLeaderboard {
  period: MiningLeaderboardPeriod
  rows: MiningLeaderboardRow[]
}
