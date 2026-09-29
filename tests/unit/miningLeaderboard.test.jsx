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

const snapshot = {
  authoritative: true,
  serverNow: '2026-09-29T12:00:00.000Z',
  session: null,
  recentSessions: [],
  robots: [],
  worksites: [],
  stats: { activeRobots: 0, miningMilliseconds: 0, averageRateAtomicPerHour: null, atomicScale: 2 },
  balance: { availableAtomic: '0', atomicScale: 2 },
  eligibility: { eligible: false, reasonCodes: ['robot-required'] },
  issuanceEnabled: false,
  miningPower: 0,
  rateBreakdown: null,
}

describe('Mining leaderboard', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    browserMiningClient.snapshot.mockResolvedValue(snapshot)
    browserMiningClient.leaderboard.mockResolvedValue({
      period: 'week',
      rows: [{ rank: 1, memberHandle: 'RobotFan', earnedAtomic: '1250', atomicScale: 2 }],
    })
  })

  it('loads weekly and all-time rankings from the server', async () => {
    render(<MiningProduction />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Leaderboard' }))
    expect(await screen.findByText('RobotFan')).toBeInTheDocument()
    expect(browserMiningClient.leaderboard).toHaveBeenCalledWith('week')
    fireEvent.click(screen.getByRole('button', { name: 'All time' }))
    await waitFor(() => expect(browserMiningClient.leaderboard).toHaveBeenLastCalledWith('all-time'))
  })

  it('shows real empty and error states', async () => {
    browserMiningClient.leaderboard.mockResolvedValueOnce({ period: 'week', rows: [] })
    render(<MiningProduction />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Leaderboard' }))
    expect(await screen.findByText(/No settled mining awards/)).toBeInTheDocument()

    browserMiningClient.leaderboard.mockRejectedValueOnce(new Error('Leaderboard unavailable'))
    fireEvent.click(screen.getByRole('button', { name: 'All time' }))
    expect(await screen.findAllByText('Leaderboard unavailable')).toHaveLength(2)
  })
})
