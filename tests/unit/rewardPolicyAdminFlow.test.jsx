import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import RewardRulesEditor from '../../src/components/mining/RewardRulesEditor.jsx'
import RewardsProduction from '../../src/screens/RewardsProduction.jsx'
import MiningProduction from '../../src/screens/MiningProduction.jsx'
import { browserAccountClient } from '../../src/infrastructure/account/browserAccountClient.ts'
import { browserEcosystemClient } from '../../src/infrastructure/ecosystem/browserEcosystemClient.ts'
import { browserMiningClient } from '../../src/infrastructure/mining/browserMiningClient.ts'

vi.mock('../../src/components/AppShell.jsx', () => ({
  default: ({ title, children }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))
vi.mock('../../src/infrastructure/account/browserAccountClient.ts', () => ({
  browserAccountClient: { operationsAction: vi.fn() },
}))
vi.mock('../../src/infrastructure/ecosystem/browserEcosystemClient.ts', () => ({
  browserEcosystemClient: { rewards: vi.fn() },
}))
vi.mock('../../src/infrastructure/mining/browserMiningClient.ts', () => ({
  browserMiningClient: { snapshot: vi.fn(), start: vi.fn(), leaderboard: vi.fn() },
}))

const onReload = vi.fn().mockResolvedValue(undefined)
const rewardSnapshot = {
  xp: 42,
  rbc: { availableAtomic: null, atomicScale: null },
  level: null,
  dashboard: {
    totalXp: 42,
    activityXp: 0,
    referralXp: 0,
    referrals: { total: 0, pending: 0, qualified: 0 },
    history: [],
  },
  issuanceEnabled: false,
  activities: [],
  levels: [],
  recentAwards: [],
}
const miningSnapshot = {
  authoritative: true,
  serverNow: '2026-10-03T00:00:00.000Z',
  session: null,
  recentSessions: [],
  robots: [{ robotId: 'robot-1', name: 'Explorer', lifecycle: 'active', unlocked: true, unlockRequirement: null }],
  worksites: [{ worksiteId: 'site-1', name: 'Manufacturing', available: true }],
  stats: { activeRobots: 0, miningMilliseconds: 0, averageRateAtomicPerHour: null, atomicScale: null },
  balance: { availableAtomic: null, atomicScale: null },
  eligibility: { eligible: true, reasonCodes: [] },
  issuanceEnabled: false,
  miningPower: 0,
  level: null,
  rateBreakdown: null,
}

const renderMining = () =>
  render(
    <MemoryRouter>
      <MiningProduction />
    </MemoryRouter>,
  )

describe('reward policy admin and member flow', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    browserAccountClient.operationsAction.mockResolvedValue({ ruleId: 'draft-1' })
    browserEcosystemClient.rewards.mockResolvedValue(rewardSnapshot)
    browserMiningClient.snapshot.mockResolvedValue(miningSnapshot)
  })

  it('opens with blank monetary fields and saves an XP-only draft without an RBC rate', async () => {
    render(
      <RewardRulesEditor
        compact
        snapshot={{ issuance: { atomicScale: 6 }, rules: [] }}
        onReload={onReload}
        recentMfa
      />,
    )
    const tabs = within(screen.getByRole('tablist', { name: 'Reward controls' }))
    fireEvent.click(tabs.getByRole('tab', { name: 'Create a rule' }))
    const draft = screen.getByText(/unsaved examples for a draft/i).closest('section')
    const draftQueries = within(draft)
    expect(draftQueries.getByText(/unsaved examples for a draft/i)).toBeInTheDocument()
    expect(draftQueries.getByLabelText('Base RBC per hour (1×)')).toHaveValue(null)
    expect(draftQueries.getByLabelText('Maximum RBC per mining cycle')).toHaveValue(null)
    expect(draftQueries.getByLabelText('RBC decimal places')).toHaveValue(null)
    const dataTask = draftQueries.getByText(/Approved data task ·/).closest('details')
    fireEvent.click(within(dataTask).getByText(/Approved data task ·/))
    expect(dataTask.querySelector('input#reward-activity-data-task-rbc')).toHaveValue(null)
    fireEvent.change(draftQueries.getByLabelText('Reason for this change'), {
      target: { value: 'Approved reward configuration' },
    })
    fireEvent.click(draftQueries.getByRole('button', { name: 'Save draft rule' }))
    await waitFor(() => expect(browserAccountClient.operationsAction).toHaveBeenCalledOnce())
    const payload = browserAccountClient.operationsAction.mock.calls[0][0]
    expect(payload.action).toBe('rewards.rule.save')
    expect(payload.rule.baseRateAtomicPerHour).toBeUndefined()
    expect(payload.rule.activityRules['data-task'].rbcAtomic).toBe('0')
  })

  it('shows only live reward settings and supplied issuance totals in the compact overview', () => {
    render(
      <RewardRulesEditor
        compact
        snapshot={{
          issuance: { enabled: false, awardCount: 12, totalIssuedAtomic: '1250', atomicScale: 2 },
          verifiedTotals: { reviewed: 4 },
          rules: [{ id: 'rule-3', version: 3, status: 'active', issuanceEnabled: false }],
        }}
        onReload={onReload}
        recentMfa
      />,
    )

    expect(screen.getByText('Version 3')).toBeInTheDocument()
    expect(screen.getByText('12.5 RBC')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getAllByText('Paused')).toHaveLength(2)
    expect(screen.queryByText('New Miner')).not.toBeInTheDocument()
  })

  it('does not submit incomplete economics for RBC issuance while allowing XP activation', async () => {
    render(
      <RewardRulesEditor
        compact
        snapshot={{
          issuance: { atomicScale: null },
          rules: [{ id: 'draft-1', version: 1, status: 'draft', issuanceEnabled: false }],
        }}
        onReload={onReload}
        recentMfa
      />,
    )
    const tabs = within(screen.getByRole('tablist', { name: 'Reward controls' }))
    fireEvent.click(tabs.getByRole('tab', { name: 'Create a rule' }))
    const draft = within(screen.getByLabelText('Base RBC per hour (1×)').closest('section'))
    fireEvent.change(draft.getByLabelText('Base RBC per hour (1×)'), { target: { value: '1' } })
    fireEvent.change(draft.getByLabelText('Reason for this change'), {
      target: { value: 'Approved reward configuration' },
    })
    fireEvent.click(draft.getByRole('button', { name: 'Save draft rule' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fill all mining amounts and limits')
    expect(browserAccountClient.operationsAction).not.toHaveBeenCalled()
    fireEvent.click(tabs.getByRole('tab', { name: 'Saved rules' }))
    fireEvent.change(screen.getByLabelText('Saved rule'), { target: { value: 'draft-1' } })
    expect(screen.getByRole('button', { name: 'Enable RBC' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Reason for reward rule change'), {
      target: { value: 'Approved reward activation' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Activate XP rule' }))
    await waitFor(() =>
      expect(browserAccountClient.operationsAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'rewards.rule.activate', ruleId: 'draft-1' }),
      ),
    )
  })

  it('shows only server configured member rewards and makes paused issuance explicit', async () => {
    browserEcosystemClient.rewards.mockResolvedValue({
      ...rewardSnapshot,
      rbc: { availableAtomic: '0', atomicScale: 2 },
      level: { level: 2, name: 'Verified Miner', multiplierBps: 13000, totalXp: 42 },
      activities: [{ source: 'data-task', xp: 37, rbcAtomic: '250', dailyLimit: 3 }],
    })
    render(
      <MemoryRouter>
        <RewardsProduction />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Verified Miner')).toBeInTheDocument()
    expect(screen.getByText('1.3× power')).toBeInTheDocument()
    expect(screen.getByText('+37 XP')).toBeInTheDocument()
    expect(screen.queryByText(/^\+[\d.]+ RBC$/)).not.toBeInTheDocument()
    expect(screen.getByText(/Mining rewards are currently paused/i)).toBeInTheDocument()
  })

  it('shows an enabled RBC activity only when the server supplies precision and amount', async () => {
    browserEcosystemClient.rewards.mockResolvedValue({
      ...rewardSnapshot,
      rbc: { availableAtomic: '1250', atomicScale: 2 },
      dashboard: {
        ...rewardSnapshot.dashboard,
        history: [
          {
            id: 'award-1',
            source: 'data-task',
            amount: '250',
            currency: 'RBC',
            atomicScale: 2,
            createdAt: '2026-10-03T00:00:00.000Z',
          },
        ],
      },
      issuanceEnabled: true,
      activities: [{ source: 'data-task', xp: 37, rbcAtomic: '250', dailyLimit: 3 }],
    })
    render(
      <MemoryRouter>
        <RewardsProduction />
      </MemoryRouter>,
    )
    expect(await screen.findByText('+2.5 RBC')).toBeInTheDocument()
    expect(screen.getByText('12.5')).toBeInTheDocument()
    expect(screen.queryByText('New Miner')).not.toBeInTheDocument()
    expect(screen.queryByText(/1× power/)).not.toBeInTheDocument()
  })

  it('keeps mining disabled without server enabled issuance and displays slot targets only from the snapshot', async () => {
    browserMiningClient.snapshot.mockResolvedValue({
      ...miningSnapshot,
      rateBreakdown: { estimatedAtomicPerHour: '257', atomicUnitScale: 2 },
    })
    renderMining()
    await screen.findByRole('radio', { name: 'Explorer' })
    expect(screen.queryByRole('button', { name: 'Start mining' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('status')).getByText(/Mining is disabled/i)).toBeInTheDocument()
    expect(screen.queryByText('2.57 RBC per hour')).not.toBeInTheDocument()
    expect(screen.queryByText(/Earn 200 RBC/i)).not.toBeInTheDocument()
    expect(browserMiningClient.start).not.toHaveBeenCalled()
  })

  it('shows the enabled mining rate only from the server snapshot', async () => {
    browserMiningClient.snapshot.mockResolvedValue({
      ...miningSnapshot,
      issuanceEnabled: true,
      rateBreakdown: { estimatedAtomicPerHour: '257', atomicUnitScale: 2 },
    })
    renderMining()
    expect(await screen.findByText('2.57 RBC per hour')).toBeInTheDocument()
  })

  it('does not invent a miner level or multiplier when mining policy details are absent', async () => {
    browserMiningClient.snapshot.mockResolvedValue({ ...miningSnapshot, level: { name: '', multiplierBps: null } })
    renderMining()
    await screen.findByRole('radio', { name: 'Explorer' })
    expect(screen.queryByText('New Miner')).not.toBeInTheDocument()
    expect(screen.queryByText(/1× power/)).not.toBeInTheDocument()
  })
})
