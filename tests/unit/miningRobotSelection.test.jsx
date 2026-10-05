import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MiningProduction from '../../src/screens/MiningProduction.jsx'
import { browserMiningClient } from '../../src/infrastructure/mining/browserMiningClient.ts'

vi.mock('../../src/components/AppShell.jsx', () => ({
  default: ({ title, children }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

vi.mock('../../src/infrastructure/mining/browserMiningClient.ts', () => ({
  browserMiningClient: {
    snapshot: vi.fn(),
    start: vi.fn(),
    leaderboard: vi.fn(),
  },
}))

const base = {
  authoritative: true,
  serverNow: '2026-09-29T12:00:00.000Z',
  session: null,
  recentSessions: [],
  robots: [
    { robotId: 'robot-1', name: 'WRS Explorer', lifecycle: 'active', unlocked: true, unlockRequirement: null },
    {
      robotId: 'robot-2',
      name: 'WRS Builder',
      lifecycle: 'active',
      unlocked: false,
      unlockRequirement: 'Complete one full 24-hour mining cycle with the previous robots first',
    },
  ],
  worksites: [{ worksiteId: 'site-1', name: 'Northern Test Facility', available: true }],
  stats: { activeRobots: 0, miningMilliseconds: 0, averageRateAtomicPerHour: null, atomicScale: 2 },
  balance: { availableAtomic: '0', atomicScale: 2 },
  eligibility: { eligible: true, reasonCodes: [] },
  issuanceEnabled: true,
  miningPower: 0,
  rateBreakdown: {
    baseRateAtomicPerHour: '250',
    miningPower: '0',
    miningPowerBonusAtomicPerHour: '0',
    estimatedAtomicPerHour: '250',
    atomicUnitScale: 2,
  },
}

describe('Mining robot selection', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    browserMiningClient.snapshot.mockResolvedValue(base)
    browserMiningClient.start.mockResolvedValue({
      ...base,
      session: {
        id: 'session-1',
        status: 'active',
        startedAt: '2026-09-29T12:00:00.000Z',
        endsAt: '2026-09-30T12:00:00.000Z',
        settledAt: null,
        robotId: 'robot-1',
        worksiteId: 'site-1',
        rule: { ruleId: 'rule-1', version: 1, issuanceEnabled: true, rateAtomicPerHour: '250', atomicUnitScale: 2 },
        miningPower: 0,
        estimatedAwardAtomic: null,
        awardTransactionId: null,
      },
      stats: { ...base.stats, activeRobots: 1 },
    })
  })

  it('explains and disables robots that have not unlocked', async () => {
    render(<MiningProduction />)
    expect(await screen.findByRole('radio', { name: /WRS Builder/ })).toBeDisabled()
    expect(screen.getByText(/Complete one full 24-hour mining cycle/)).toBeInTheDocument()
  })

  it('starts one selected robot at the configured server rate and shows the selection as fixed', async () => {
    render(<MiningProduction />)
    fireEvent.click(await screen.findByRole('button', { name: /Start mining/ }))
    await waitFor(() =>
      expect(browserMiningClient.start).toHaveBeenCalledWith({
        robotId: 'robot-1',
        idempotencyKey: expect.any(String),
      }),
    )
    expect(await screen.findByText('WRS Explorer')).toBeInTheDocument()
    expect(screen.getByText(/24h 00m 00s/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Start mining/ })).not.toBeInTheDocument()
  })

  it('keeps the active robot fixed when a session is already running', async () => {
    browserMiningClient.snapshot.mockResolvedValueOnce({
      ...base,
      session: {
        id: 'session-existing',
        status: 'active',
        startedAt: '2026-09-29T12:00:00.000Z',
        endsAt: '2026-09-30T12:00:00.000Z',
        settledAt: null,
        robotId: 'robot-1',
        worksiteId: 'site-1',
        rule: { ruleId: 'rule-1', version: 1, issuanceEnabled: true, rateAtomicPerHour: '250', atomicUnitScale: 2 },
        miningPower: 0,
        estimatedAwardAtomic: null,
        awardTransactionId: null,
      },
      stats: { ...base.stats, activeRobots: 1 },
    })
    render(<MiningProduction />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Active' }))
    expect(await screen.findByText('WRS Explorer')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Start mining/ })).not.toBeInTheDocument()
  })
})
