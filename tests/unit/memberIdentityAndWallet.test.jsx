import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import More from '../../src/screens/More.jsx'
import ProfileProduction from '../../src/screens/ProfileProduction.jsx'
import Wallet from '../../src/screens/Wallet.jsx'
import { browserAccountClient } from '../../src/infrastructure/account/browserAccountClient.ts'
import { browserFinanceClient } from '../../src/infrastructure/finance/browserFinanceClient.ts'

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Link: ({ to, children, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => vi.fn(),
  }
})
vi.mock('../../src/components/AppShell.jsx', () => ({ default: ({ children }) => <main>{children}</main> }))
vi.mock('../../src/components/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({
    isDemo: true,
    session: { userId: 'demo-user', emailVerified: true, phoneVerified: true, roles: [] },
    refresh: vi.fn(),
    logout: vi.fn(),
  }),
}))
vi.mock('../../src/components/robot/RobotProvider.jsx', () => ({ useRobot: () => ({ robot: null }) }))
vi.mock('../../src/components/ui.jsx', () => ({
  Icon: ({ name }) => <span>{name}</span>,
  List: ({ children }) => <div>{children}</div>,
  Row: ({ title }) => <p>{title}</p>,
  SectionTitle: ({ children }) => <h2>{children}</h2>,
  Badge: ({ children }) => <span>{children}</span>,
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Card: ({ children }) => <div>{children}</div>,
  Field: ({ label, value }) => (
    <label>
      {label}
      <input value={value} readOnly />
    </label>
  ),
  Disclosure: ({ children }) => <aside>{children}</aside>,
  DataRow: ({ label, value }) => (
    <p>
      {label}: {value}
    </p>
  ),
}))
vi.mock('../../src/infrastructure/account/browserAccountClient.ts', () => ({
  browserAccountClient: { snapshot: vi.fn(), updateProfile: vi.fn() },
}))
vi.mock('../../src/infrastructure/finance/browserFinanceClient.ts', () => ({
  browserFinanceClient: { wallet: vi.fn(), transactions: vi.fn(), createPayoutMethod: vi.fn(), withdraw: vi.fn() },
}))
vi.mock('../../src/lib/runtimeConfig.js', () => ({ runtimeConfig: { isDemo: true } }))
vi.mock('../../src/lib/sensitiveActions.js', () => ({
  getSensitiveActionPolicy: () => ({ enabled: false, authoritative: false }),
}))

describe('member identity and wallet', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    browserAccountClient.snapshot.mockResolvedValue({ profile: { fullName: 'Ada Lovelace', email: 'ada@example.com' } })
    browserFinanceClient.wallet.mockResolvedValue({
      wallet: { currency: 'EUR', availableMinor: 12345, pendingWithdrawalMinor: 0 },
    })
    browserFinanceClient.transactions.mockResolvedValue({
      transactions: [
        {
          id: 'tx-1',
          kind: 'reward',
          status: 'posted',
          reference: 'Reward',
          direction: 'credit',
          amountMinor: 2500,
          currency: 'EUR',
          createdAt: '2026-09-29T12:00:00.000Z',
        },
      ],
    })
  })

  it('uses the authenticated profile name in More and never renders demo identity', async () => {
    render(<More />)
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.queryByText(/demo account|demo-user/i)).not.toBeInTheDocument()
  })

  it('loads the authenticated Profile name and recovers with an unavailable state', async () => {
    render(<ProfileProduction />)
    expect(await screen.findByDisplayValue('Ada Lovelace')).toBeInTheDocument()
    cleanup()
    browserAccountClient.snapshot.mockRejectedValueOnce(new Error('Profile service is unavailable'))
    render(<ProfileProduction />)
    expect(await screen.findByText(/profile unavailable/i)).toBeInTheDocument()
  })

  it('shows the ledger balance and recent activity using the returned fiat currency', async () => {
    render(<Wallet />)
    expect(await screen.findByText('€123.45')).toBeInTheDocument()
    expect(screen.getByText(/pending withdrawals: €0.00/i)).toBeInTheDocument()
    expect(await screen.findByText('Recent activity')).toBeInTheDocument()
    expect(screen.getByText(/€25.00/)).toBeInTheDocument()
    expect(browserFinanceClient.wallet).toHaveBeenCalledWith('USD')
    expect(browserFinanceClient.transactions).toHaveBeenCalledWith('USD')
  })

  it('shows a real zero ledger balance and never substitutes sample wallet values when unavailable', async () => {
    browserFinanceClient.wallet.mockResolvedValueOnce({
      wallet: { currency: 'EUR', availableMinor: 0, pendingWithdrawalMinor: 0 },
    })
    render(<Wallet />)
    expect(await screen.findByText('€0.00')).toBeInTheDocument()
    cleanup()
    browserFinanceClient.wallet.mockRejectedValueOnce(new Error('Ledger unavailable'))
    render(<Wallet />)
    expect(await screen.findByText(/wallet unavailable/i)).toBeInTheDocument()
    expect(screen.queryByText('$154.40')).not.toBeInTheDocument()
  })
})
