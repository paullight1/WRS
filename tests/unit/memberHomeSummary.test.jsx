import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Home from '../../src/screens/Home.jsx'
import { browserAccountClient } from '../../src/infrastructure/account/browserAccountClient.ts'
import { browserRobotClient } from '../../src/infrastructure/robot/browserRobotClient.ts'
import { browserMiningClient } from '../../src/infrastructure/mining/browserMiningClient.ts'
import { fireEvent } from '@testing-library/react'
import { browserEcosystemClient } from '../../src/infrastructure/ecosystem/browserEcosystemClient.ts'

vi.mock('../../src/components/AppShell.jsx', () => ({
  default: ({ title, subtitle, brand, children }) => (
    <div>
      {brand && <img src="/wrs-logo-footer.png" alt="World Robotic System" />}
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Link: ({ to, children, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  }
})

vi.mock('../../src/components/robot/RobotProvider.jsx', () => ({
  useRobot: () => ({
    loading: false,
    isDemo: false,
    robot: { id: 'robot-1', name: 'WRS One', packageSlug: 'starter', lifecycle: 'active' },
  }),
}))

vi.mock('../../src/components/robot3d/Robot3D.jsx', () => ({ default: () => <div /> }))
vi.mock('../../src/components/WelcomeModal.jsx', () => ({
  default: () => null,
  consumeWelcome: () => false,
  hasSeenOnboarding: () => true,
  markOnboardingSeen: vi.fn(),
}))
vi.mock('../../src/components/auth/AuthProvider.jsx', () => ({ useAuth: () => ({ session: { userId: 'user-1' } }) }))
vi.mock('../../src/lib/runtimeConfig.js', () => ({
  runtimeConfig: { isDemo: false, services: { identity: true, robots: true, rewards: true } },
}))
vi.mock('../../src/infrastructure/account/browserAccountClient.ts', () => ({
  browserAccountClient: { snapshot: vi.fn() },
}))
vi.mock('../../src/infrastructure/robot/browserRobotClient.ts', () => ({ browserRobotClient: { passport: vi.fn() } }))
vi.mock('../../src/infrastructure/mining/browserMiningClient.ts', () => ({
  browserMiningClient: { snapshot: vi.fn(), claimDailyActivity: vi.fn(), progress: vi.fn(), start: vi.fn() },
}))
vi.mock('../../src/infrastructure/ecosystem/browserEcosystemClient.ts', () => ({
  browserEcosystemClient: { rewards: vi.fn() },
}))
vi.mock('../../src/infrastructure/finance/browserFinanceClient.ts', () => ({
  browserFinanceClient: {
    wallet: vi.fn(async () => ({ wallet: { availableMinor: 12875, pendingWithdrawalMinor: 0, currency: 'USD' } })),
    transactions: vi.fn(async () => ({ transactions: [] })),
  },
}))

const miningSnapshot = (availableAtomic = '0') => ({
  authoritative: true,
  session: null,
  recentSessions: [],
  robots: [],
  worksites: [],
  stats: { activeRobots: 0, miningMilliseconds: 0, averageRateAtomicPerHour: null, atomicScale: 2 },
  balance: { availableAtomic, atomicScale: 2 },
})

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )

describe('verified Home summary', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    browserAccountClient.snapshot.mockResolvedValue({ profile: { fullName: 'Ada Lovelace' } })
    browserRobotClient.passport.mockResolvedValue({ passport: { authoritative: true, totalXp: 1250 } })
    browserMiningClient.snapshot.mockResolvedValue(miningSnapshot('3475'))
    browserMiningClient.claimDailyActivity.mockResolvedValue({ status: 'already-awarded' })
    browserMiningClient.progress.mockResolvedValue({
      authoritative: true,
      serverNow: '2026-11-03T03:00:00Z',
      timeZone: 'UTC',
      days: Array.from({ length: 7 }, (_, i) => ({
        day: new Date(Date.UTC(2026, 9, 28 + i)).toISOString().slice(0, 10),
        miningMilliseconds: 0,
        completedCycles: 0,
      })),
    })
    browserEcosystemClient.rewards.mockResolvedValue({ authoritative: true, dashboard: { totalXp: 1250, history: [] } })
  })

  it('uses the WRS logo and greets the authenticated profile name', async () => {
    renderHome()
    expect(await screen.findByRole('img', { name: 'World Robotic System' })).toHaveAttribute(
      'src',
      '/wrs-logo-footer.png',
    )
    expect(screen.getByText(new RegExp(`Ada Lovelace`))).toBeInTheDocument()
    expect(browserAccountClient.snapshot).toHaveBeenCalledOnce()
  })

  it('shows the reference asset cards using balances from authoritative services', async () => {
    renderHome()
    await screen.findByText('1,250 XP')
    expect(
      within(await screen.findByRole('region', { name: 'Member balances' })).getByText('34.75'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'XP balance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'RoboCoin balance' })).toBeInTheDocument()
  })

  it('claims and reports the server-confirmed daily login XP', async () => {
    browserMiningClient.claimDailyActivity.mockResolvedValue({ status: 'awarded', xp: 5 })
    renderHome()
    expect(await screen.findByText('Daily login reward: +5 XP added.')).toBeInTheDocument()
    expect(browserMiningClient.claimDailyActivity).toHaveBeenCalledOnce()
  })

  it('lets a member hide and restore their balances from the reference wallet dashboard', async () => {
    renderHome()
    await within(await screen.findByRole('region', { name: 'Member balances' })).findByText('34.75')
    fireEvent.click(screen.getByRole('button', { name: 'Hide balances' }))
    expect(screen.queryByText('34.75 RBC')).not.toBeInTheDocument()
    expect(screen.queryByText('34.75')).not.toBeInTheDocument()
    expect(screen.queryByText('1,250 XP')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show balances' }))
    expect(
      within(await screen.findByRole('region', { name: 'Member balances' })).getByText('34.75'),
    ).toBeInTheDocument()
  })

  it('shows a loading state while the verified summary is unresolved', () => {
    browserMiningClient.snapshot.mockImplementation(() => new Promise(() => {}))
    renderHome()
    expect(screen.getByRole('status', { name: /member balances/i })).toBeInTheDocument()
  })

  it('shows a verified zero balance and never converts a missing value to zero', async () => {
    browserMiningClient.snapshot.mockResolvedValue(miningSnapshot('0'))
    renderHome()
    expect(
      await within(await screen.findByRole('region', { name: 'Member balances' })).findByText('0.00'),
    ).toBeInTheDocument()
    cleanup()
    browserMiningClient.snapshot.mockResolvedValue(miningSnapshot(null))
    renderHome()
    await waitFor(() => expect(screen.getByText(/no verified balance/i)).toBeInTheDocument())
  })

  it('retains independently verified reward XP when account and mining services fail', async () => {
    browserAccountClient.snapshot.mockRejectedValue(new Error('Account unavailable'))
    browserRobotClient.passport.mockRejectedValue(new Error('Passport unavailable'))
    browserMiningClient.snapshot.mockRejectedValue(new Error('Mining unavailable'))
    renderHome()
    expect(await screen.findByText(/Good (morning|afternoon|evening), there/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText(/unavailable/i).length).toBeGreaterThanOrEqual(1))
    expect(screen.queryByText('0 XP')).not.toBeInTheDocument()
    expect(screen.queryByText('0.00 RBC')).not.toBeInTheDocument()
  })

  it('removes the marked page heading and legacy robot/cycle cards and moves shortcuts above activity', async () => {
    renderHome()
    await screen.findByText('1,250 XP')
    expect(screen.queryByRole('heading', { name: 'My Wallet', exact: true })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Latest mining cycle report')).not.toBeInTheDocument()
    expect(screen.queryByText('Amount per cycle')).not.toBeInTheDocument()
    const assets = within(screen.getByRole('region', { name: 'Member balances' }))
    expect(assets.queryByText('(RBC)')).not.toBeInTheDocument()
    expect(assets.queryByText('(USD)')).not.toBeInTheDocument()
    expect(
      screen
        .getByRole('heading', { name: 'More' })
        .compareDocumentPosition(screen.getByRole('heading', { name: 'Recent Transactions' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('shows recorded XP and RoboCoin awards in recent transactions', async () => {
    browserEcosystemClient.rewards.mockResolvedValue({
      authoritative: true,
      dashboard: {
        totalXp: 1250,
        history: [
          {
            id: 'daily',
            source: 'daily-login',
            amount: '5',
            currency: 'XP',
            atomicScale: 0,
            createdAt: '2026-11-03T03:00:00Z',
          },
          {
            id: 'mining',
            source: 'mining',
            amount: '120',
            currency: 'RBC',
            atomicScale: 2,
            createdAt: '2026-11-03T02:00:00Z',
          },
        ],
      },
    })
    renderHome()
    expect(await screen.findByText('+5 XP')).toBeInTheDocument()
    expect(screen.getByText('+1.20 RBC')).toBeInTheDocument()
  })

  it('starts an eligible mining cycle directly from the available balance card', async () => {
    const snapshot = {
      ...miningSnapshot('3475'),
      serverNow: new Date().toISOString(),
      issuanceEnabled: true,
      eligibility: { eligible: true, reasonCodes: [] },
      robots: [{ robotId: 'robot-1', unlocked: true }],
      worksites: [{ worksiteId: 'site-1', name: 'Manufacturing', available: true }],
    }
    browserMiningClient.snapshot.mockResolvedValue(snapshot)
    const activeSnapshot = {
      ...snapshot,
      session: {
        id: 'new-cycle',
        robotId: 'robot-1',
        status: 'active',
        startedAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 21600000).toISOString(),
        rule: { rateAtomicPerHour: '5', atomicUnitScale: 2 },
      },
    }
    browserMiningClient.start.mockImplementation(async () => {
      browserMiningClient.snapshot.mockResolvedValue(activeSnapshot)
      return activeSnapshot
    })
    renderHome()
    const start = await within(screen.getByRole('region', { name: 'Wallet balance' })).findByRole('button', {
      name: 'Start mining',
      exact: true,
    })
    fireEvent.click(start)
    await waitFor(() =>
      expect(browserMiningClient.start).toHaveBeenCalledWith({
        robotId: 'robot-1',
        worksiteId: 'site-1',
        idempotencyKey: expect.any(String),
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole('progressbar', { name: 'Current mining cycle' })).toHaveAttribute('aria-valuenow', '0'),
    )
    expect(screen.queryByText('Mining in progress')).not.toBeInTheDocument()
  })

  it('lets members inspect a recorded day and refresh without reclaiming daily XP', async () => {
    const days = Array.from({ length: 7 }, (_, i) => ({
      day: new Date(Date.UTC(2026, 9, 28 + i)).toISOString().slice(0, 10),
      miningMilliseconds: i === 5 ? 21600000 : 0,
      completedCycles: i === 5 ? 1 : 0,
    }))
    browserMiningClient.progress.mockResolvedValue({
      authoritative: true,
      serverNow: '2026-11-03T03:00:00Z',
      timeZone: 'UTC',
      days,
    })
    renderHome()
    const panel = within(screen.getByRole('region', { name: 'Daily mining progress' }))
    fireEvent.click(panel.getByRole('button', { name: 'Mining Progress', exact: true }))
    fireEvent.click(await panel.findByRole('button', { name: 'Monday, Nov 2: 6h 00m, 1 completed cycles' }))
    expect(panel.getByText('6h 00m')).toBeInTheDocument()
    expect(panel.getByText('1', { exact: true })).toBeInTheDocument()
    fireEvent.click(panel.getByRole('button', { name: 'Refresh mining progress' }))
    await waitFor(() => expect(browserMiningClient.progress).toHaveBeenCalledTimes(2))
    expect(browserMiningClient.claimDailyActivity).toHaveBeenCalledOnce()
  })

  it('blocks duplicate starts and reuses the same idempotency key after a failed request', async () => {
    browserMiningClient.snapshot.mockResolvedValue({
      ...miningSnapshot('3475'),
      issuanceEnabled: true,
      eligibility: { eligible: true, reasonCodes: [] },
      robots: [{ robotId: 'robot-1', unlocked: true }],
      worksites: [{ worksiteId: 'site-1', name: 'Manufacturing', available: true }],
    })
    let rejectStart
    browserMiningClient.start.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          rejectStart = reject
        }),
    )
    browserMiningClient.start.mockRejectedValueOnce(new Error('Connection interrupted'))
    renderHome()
    const hero = within(screen.getByRole('region', { name: 'Wallet balance' }))
    const button = await hero.findByRole('button', { name: 'Start mining', exact: true })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(browserMiningClient.start).toHaveBeenCalledOnce()
    rejectStart(new Error('Connection interrupted'))
    expect(await hero.findByRole('alert')).toHaveTextContent('Connection interrupted')
    fireEvent.click(hero.getByRole('button', { name: 'Start mining', exact: true }))
    await waitFor(() => expect(browserMiningClient.start).toHaveBeenCalledTimes(2))
    expect(browserMiningClient.start.mock.calls[0][0].idempotencyKey).toEqual(
      browserMiningClient.start.mock.calls[1][0].idempotencyKey,
    )
  })

  it('loads balances while a daily XP claim is stalled', async () => {
    browserMiningClient.claimDailyActivity.mockImplementation(() => new Promise(() => {}))
    renderHome()
    expect(await screen.findByText('1,250 XP')).toBeInTheDocument()
    expect(screen.getByText('34.75')).toBeInTheDocument()
  })

  it('retries a failed daily XP request when the member refreshes', async () => {
    browserMiningClient.claimDailyActivity.mockRejectedValueOnce(new Error('Temporary failure'))
    browserMiningClient.claimDailyActivity.mockResolvedValueOnce({ status: 'awarded', xp: 5 })
    renderHome()
    await screen.findByText('1,250 XP')
    fireEvent.click(screen.getByRole('button', { name: 'Mining Progress', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh mining progress' }))
    expect(await screen.findByText('Daily login reward: +5 XP added.')).toBeInTheDocument()
    await waitFor(() => expect(browserMiningClient.claimDailyActivity).toHaveBeenCalledTimes(2))
  })

  it('removes the marked shortcuts even when they were saved in older preferences', async () => {
    localStorage.setItem(
      'wrs.shortcuts',
      JSON.stringify(['events', 'data', 'referrals', 'market', 'wallet', 'rewards', 'passport', 'customize']),
    )
    renderHome()
    localStorage.removeItem('wrs.shortcuts')
    await screen.findByText('1,250 XP')
    const shortcuts = within(screen.getByRole('heading', { name: 'More' }).closest('section'))
    for (const name of ['Wallet', 'Passport', 'Add data', 'Customise'])
      expect(shortcuts.queryByRole('link', { name, exact: true })).not.toBeInTheDocument()
    for (const name of ['Events', 'Referrals', 'Market', 'Rewards'])
      expect(shortcuts.getByRole('link', { name, exact: true })).toBeInTheDocument()
    expect(shortcuts.queryByRole('button', { name: 'Edit', exact: true })).not.toBeInTheDocument()
    expect(shortcuts.queryByText('Add data', { exact: true })).not.toBeInTheDocument()
  })
})
