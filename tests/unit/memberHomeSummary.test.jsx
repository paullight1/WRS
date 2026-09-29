import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Home from '../../src/screens/Home.jsx'
import { browserAccountClient } from '../../src/infrastructure/account/browserAccountClient.ts'
import { browserRobotClient } from '../../src/infrastructure/robot/browserRobotClient.ts'
import { browserMiningClient } from '../../src/infrastructure/mining/browserMiningClient.ts'

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
  return { ...actual, Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }
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
}))
vi.mock('../../src/components/auth/AuthProvider.jsx', () => ({ useAuth: () => ({ session: { userId: 'user-1' } }) }))
vi.mock('../../src/lib/runtimeConfig.js', () => ({
  runtimeConfig: { isDemo: false, services: { identity: true, robots: true, rewards: true } },
}))
vi.mock('../../src/infrastructure/account/browserAccountClient.ts', () => ({
  browserAccountClient: { snapshot: vi.fn() },
}))
vi.mock('../../src/infrastructure/robot/browserRobotClient.ts', () => ({ browserRobotClient: { passport: vi.fn() } }))
vi.mock('../../src/infrastructure/mining/browserMiningClient.ts', () => ({ browserMiningClient: { snapshot: vi.fn() } }))

const miningSnapshot = (availableAtomic = '0') => ({
  authoritative: true,
  session: null,
  recentSessions: [],
  robots: [],
  worksites: [],
  stats: { activeRobots: 0, miningMilliseconds: 0, averageRateAtomicPerHour: null, atomicScale: 2 },
  balance: { availableAtomic, atomicScale: 2 },
})

describe('verified Home summary', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    browserAccountClient.snapshot.mockResolvedValue({ profile: { fullName: 'Ada Lovelace' } })
    browserRobotClient.passport.mockResolvedValue({ passport: { authoritative: true, totalXp: 1250 } })
    browserMiningClient.snapshot.mockResolvedValue(miningSnapshot('3475'))
  })

  it('uses the WRS logo and greets the authenticated profile name', async () => {
    render(<Home />)
    expect(await screen.findByRole('img', { name: 'World Robotic System' })).toHaveAttribute(
      'src',
      '/wrs-logo-footer.png',
    )
    expect(screen.getByText(new RegExp(`Ada Lovelace`))).toBeInTheDocument()
    expect(browserAccountClient.snapshot).toHaveBeenCalledOnce()
  })

  it('shows XP before the RoboCoin balance from authoritative services', async () => {
    render(<Home />)
    await screen.findByText('1,250 XP')
    expect(screen.getByText('34.75 RBC')).toBeInTheDocument()
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toContain('XP balance')
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent)
    expect(headings.indexOf('XP balance')).toBeLessThan(headings.indexOf('RoboCoin balance'))
  })

  it('shows a loading state while the verified summary is unresolved', () => {
    browserMiningClient.snapshot.mockImplementation(() => new Promise(() => {}))
    render(<Home />)
    expect(screen.getByRole('status', { name: /member balances/i })).toBeInTheDocument()
  })

  it('shows a verified zero balance and never converts a missing value to zero', async () => {
    browserMiningClient.snapshot.mockResolvedValue(miningSnapshot('0'))
    render(<Home />)
    expect(await screen.findByText('0.00 RBC')).toBeInTheDocument()
    cleanup()
    browserMiningClient.snapshot.mockResolvedValue(miningSnapshot(null))
    render(<Home />)
    await waitFor(() => expect(screen.getByText(/balance unavailable/i)).toBeInTheDocument())
  })

  it('shows unavailable values and a neutral greeting when account services fail', async () => {
    browserAccountClient.snapshot.mockRejectedValue(new Error('Account unavailable'))
    browserRobotClient.passport.mockRejectedValue(new Error('Passport unavailable'))
    browserMiningClient.snapshot.mockRejectedValue(new Error('Mining unavailable'))
    render(<Home />)
    expect(await screen.findByText(/Good (morning|afternoon|evening), there/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText(/unavailable/i).length).toBeGreaterThanOrEqual(2))
    expect(screen.queryByText('0 XP')).not.toBeInTheDocument()
    expect(screen.queryByText('0.00 RBC')).not.toBeInTheDocument()
  })
})
