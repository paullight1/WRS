import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import WalletDashboard, { RoboCoinWallet } from '../../src/components/dashboard/WalletDashboard.jsx'

afterEach(cleanup)

describe('wallet dashboard mining progress', () => {
  it('shows elapsed cycle progress instead of presenting an active cycle as complete', () => {
    render(
      <MemoryRouter>
        <WalletDashboard
          mining={{
            serverNow: '2026-11-03T03:00:00Z',
            session: { status: 'active', startedAt: '2026-11-03T00:00:00Z', endsAt: '2026-11-03T06:00:00Z' },
          }}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('progressbar', { name: 'Current mining cycle' })).toHaveAttribute('aria-valuenow', '50')
    const hero = within(screen.getByRole('region', { name: 'Wallet balance' }))
    expect(hero.queryByText('Mining in progress')).not.toBeInTheDocument()
    expect(hero.queryByRole('timer')).not.toBeInTheDocument()
    expect(hero.queryByRole('link', { name: 'View mining' })).not.toBeInTheDocument()
  })

  it('keeps RoboCoin mining history visible when cash transaction history is unavailable', () => {
    render(
      <MemoryRouter>
        <RoboCoinWallet
          ledger={{ historyError: 'Cash history unavailable' }}
          mining={{
            recentSessions: [
              {
                id: 'cycle-1',
                status: 'settled',
                estimatedAwardAtomic: '108',
                rule: { atomicUnitScale: 2 },
                settledAt: '2026-11-03T06:00:00Z',
              },
            ],
          }}
        />
      </MemoryRouter>,
    )
    expect(within(screen.getByRole('region', { name: 'RoboCoin wallet' })).getByText('≈ 1.08 RBC')).toBeInTheDocument()
  })

  it('does not present historical average mining as an active current rate', () => {
    render(
      <MemoryRouter>
        <RoboCoinWallet mining={{ session: null, stats: { averageRateAtomicPerHour: '18', atomicScale: 2 } }} />
      </MemoryRouter>,
    )
    expect(screen.queryByText('0.18 RBC / hour')).not.toBeInTheDocument()
    expect(screen.getByText('Not mining')).toBeInTheDocument()
  })

  it('keeps daily mining details collapsed until requested and lets members close them again', () => {
    render(
      <MemoryRouter>
        <WalletDashboard
          progress={{
            serverNow: '2026-11-03T03:00:00Z',
            days: [{ day: '2026-11-03', miningMilliseconds: 3600000, completedCycles: 1 }],
          }}
        />
      </MemoryRouter>,
    )
    const toggle = screen.getByRole('button', { name: 'Mining Progress', exact: true })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('1h 00m')).not.toBeVisible()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('1h 00m')).toBeVisible()
    fireEvent.click(toggle)
    expect(screen.getByText('1h 00m')).not.toBeVisible()
  })

  it('does not promote packages from the deposit dialog', () => {
    render(
      <MemoryRouter>
        <WalletDashboard />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Deposit', exact: true }))
    const dialog = document.querySelector('.dw-dialog')
    expect(dialog).toHaveTextContent('Direct wallet deposits are not available yet.')
    expect(dialog).not.toHaveTextContent('Explore packages')
    expect(dialog.querySelector('.dw-primary-button')).toBeNull()
  })
  it('shows live cycle progress while daily mining details stay collapsed and caps it at completion', () => {
    const mining = {
      serverNow: '2026-11-03T03:00:00Z',
      session: { status: 'active', startedAt: '2026-11-03T00:00:00Z', endsAt: '2026-11-03T06:00:00Z' },
    }
    const view = render(
      <MemoryRouter>
        <WalletDashboard mining={mining} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Mining Progress', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    const bar = screen.getByRole('progressbar', { name: 'Current mining cycle' })
    expect(bar).toBeVisible()
    expect(bar).toHaveAttribute('aria-valuenow', '50')
    view.rerender(
      <MemoryRouter>
        <WalletDashboard mining={mining} now={Date.parse('2026-11-03T07:00:00Z')} />
      </MemoryRouter>,
    )
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(
      within(screen.getByRole('region', { name: 'Daily mining progress' })).getByText('Cycle complete'),
    ).toBeVisible()
  })
})
