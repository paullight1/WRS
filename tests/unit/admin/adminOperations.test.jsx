import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Link, MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { recordActions } from '../../../admin/src/lib/operations.js'
import Operations from '../../../admin/src/screens/Operations.jsx'
import { browserAccountClient } from '../../../src/infrastructure/account/browserAccountClient.ts'

const auth = vi.hoisted(() => ({ session: null, stepUpMfa: vi.fn() }))
vi.mock('../../../src/components/auth/AuthProvider.jsx', () => ({ useAuth: () => auth }))
vi.mock('../../../admin/src/components/AdminShell.jsx', () => ({
  default: ({ children, title }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}))

function open(scope, page, links = []) {
  const entry = `/?scope=${scope}${page ? `&page=${page}` : ''}`
  return render(
    <MemoryRouter initialEntries={[entry]}>
      {links.map(({ to, label }) => (
        <Link key={to} to={to}>
          {label}
        </Link>
      ))}
      <Operations />
    </MemoryRouter>,
  )
}
const overviewSummary = {
  totals: [
    { key: 'users_total', scope: 'users', value: 430, status: 'ready' },
    { key: 'users_active', scope: 'users', value: 401, status: 'ready' },
    { key: 'users_pending', scope: 'users', value: 11, status: 'ready' },
    { key: 'users_suspended', scope: 'users', value: 18, status: 'ready' },
    { key: 'payments_total', scope: 'finance', value: 240, status: 'ready' },
    { key: 'submissions_total', scope: 'data', value: 24, status: 'ready' },
  ],
  recentUsers: [
    {
      user_id: 'member-1',
      full_name: 'Ada Lovelace',
      normalized_email: 'ada@example.com',
      status: 'active',
      created_at: '2026-10-30T12:00:00Z',
    },
  ],
  metrics: [{ key: 'referrals_pending', scope: 'risk', value: 29, status: 'ready' }],
}

it('shows full overview totals and named recent users with working page links', async () => {
  browserAccountClient.operations.mockImplementation((scope) =>
    Promise.resolve(scope === 'overview' ? { summary: overviewSummary } : { submissions: [] }),
  )
  open('overview')
  expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
  const users = within(screen.getByLabelText('User totals'))
  expect(users.getByText('430')).toBeInTheDocument()
  expect(users.getByText('401')).toBeInTheDocument()
  expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Payments.*240/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Data submissions.*24/ }))
  expect(await screen.findByRole('heading', { name: 'Data submissions' })).toBeInTheDocument()
  expect(browserAccountClient.operations).toHaveBeenCalledWith('data')
})

it('does not show other areas or recent users to a support operator', async () => {
  auth.session.roles = ['support_operator']
  browserAccountClient.operations.mockResolvedValue({ summary: overviewSummary })
  open('overview')
  await screen.findByRole('heading', { name: 'At a glance' })
  expect(screen.queryByLabelText('User totals')).not.toBeInTheDocument()
  expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Payments.*240/ })).not.toBeInTheDocument()
})
beforeEach(() => {
  auth.session = { userId: 'operator', roles: ['admin'], mfaEnabled: true, mfaSatisfiedAt: new Date().toISOString() }
  vi.spyOn(browserAccountClient, 'operations').mockResolvedValue({
    users: [{ user_id: 'member-1', status: 'active', kyc_status: 'pending' }],
  })
  vi.spyOn(browserAccountClient, 'operationsAction').mockResolvedValue({ changed: true })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('shows only actions belonging to the selected independent page', async () => {
  browserAccountClient.operations.mockResolvedValue({
    payments: [
      {
        id: 'pay-1',
        user_name: 'Ada Okafor',
        user_email: 'ada@example.com',
        amount_minor: 250000,
        currency: 'NGN',
        status: 'succeeded',
      },
    ],
    settlements: [
      {
        id: 'deploy-1',
        job_title: 'Warehouse inspection',
        user_name: 'Ada Okafor',
        payout_status: 'ready',
        status: 'completed',
      },
    ],
  })
  open('finance', undefined, [{ to: '/?scope=finance&page=settlements', label: 'Open job payouts' }])
  await screen.findByText('Ada Okafor')
  expect(screen.getByRole('heading', { name: 'Payments' })).toBeInTheDocument()
  expect(browserAccountClient.operations).toHaveBeenCalledWith('finance')
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /^Details for / }))
  expect(screen.queryByRole('button', { name: 'Pay for job' })).not.toBeInTheDocument()
  expect(screen.getByText('This record is view-only')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close record details' }))
  fireEvent.click(screen.getByRole('link', { name: 'Open job payouts' }))
  expect(await screen.findByText('Warehouse inspection')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Job payouts' })).toBeInTheDocument()
  expect(browserAccountClient.operations).not.toHaveBeenCalledWith('settlements')
  fireEvent.click(screen.getByRole('button', { name: /^Details for / }))
  expect(screen.getByRole('button', { name: 'Pay for job' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Settle deployment' })).not.toBeInTheDocument()
})

it('requires all six quality scores before submitting a data review', async () => {
  browserAccountClient.operations.mockResolvedValue({
    submissions: [{ id: 'submission-1', status: 'review' }],
    taskResponses: [],
    deletions: [],
  })
  open('data')
  fireEvent.click(await screen.findByRole('button', { name: /^Details for / }))
  fireEvent.change(screen.getByLabelText('Reason for change'), { target: { value: 'Reviewed quality' } })
  const submit = screen.getByRole('button', { name: 'Save review' })
  expect(submit).toBeDisabled()
  for (const name of [
    'Complete information',
    'Correct information',
    'Consistent information',
    'Clear data',
    'Reviewers agree',
    'Follows the rules',
  ]) {
    fireEvent.change(screen.getByLabelText(name), { target: { value: '90' } })
  }
  expect(submit).toBeEnabled()
  fireEvent.click(submit)
  await waitFor(() =>
    expect(browserAccountClient.operationsAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'data.review',
        submissionId: 'submission-1',
        completeness: 90,
        reason: 'Reviewed quality',
      }),
    ),
  )
  expect(await screen.findByRole('status')).toHaveTextContent('Review saved')
})

it('keeps action success visible when the follow-up refresh fails', async () => {
  browserAccountClient.operations
    .mockResolvedValueOnce({ support: [{ id: 'ticket-1', subject: 'Robot help', status: 'open' }] })
    .mockRejectedValueOnce(new Error('Network unavailable'))
  open('support')
  fireEvent.click(await screen.findByRole('button', { name: /^Details for / }))
  fireEvent.change(screen.getByLabelText('Reason for change'), { target: { value: 'Helping member' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save ticket' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Ticket updated')
  expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable')
  expect(screen.queryByRole('button', { name: 'Save ticket' })).not.toBeInTheDocument()
})

it('does not offer suspension actions to KYC operators', async () => {
  auth.session.roles = ['kyc_operator']
  open('users')
  fireEvent.click(await screen.findByRole('button', { name: /^Details for / }))
  expect(screen.queryByRole('option', { name: 'Suspend account' })).not.toBeInTheDocument()
  expect(screen.queryByRole('combobox', { name: 'Action' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save identity check' })).toBeDisabled()
})

it('renders user identity fields and server counts instead of deriving stats from visible rows', async () => {
  browserAccountClient.operations.mockResolvedValue({
    users: [
      {
        user_id: 'member-1',
        full_name: 'Ada Lovelace',
        normalized_email: 'ada@example.com',
        status: 'active',
        kyc_status: 'verified',
      },
    ],
    userStats: { total: 237, active: 220, pending: 11, suspended: 17, verificationPending: 42, verified: 195 },
  })
  open('users')

  expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
  expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  expect(screen.getByText('237')).toBeInTheDocument()
  expect(screen.getByText('220')).toBeInTheDocument()
  expect(screen.getByText('11')).toBeInTheDocument()
  expect(screen.getByText('17')).toBeInTheDocument()
  expect(screen.getByText('1 user')).toBeInTheDocument()
})

it('uses account status on Users and kyc_status on the independent identity page', async () => {
  browserAccountClient.operations.mockResolvedValue({
    users: [
      { user_id: 'member-active', full_name: 'Active User', status: 'active', kyc_status: 'pending' },
      { user_id: 'member-suspended', full_name: 'Suspended User', status: 'suspended', kyc_status: 'verified' },
    ],
    userStats: { total: 2, active: 1, pending: 0, suspended: 1, verificationPending: 1, verified: 1 },
  })
  open('users', undefined, [{ to: '/?scope=users&page=identity', label: 'Open identity checks' }])
  expect(await screen.findByText('Active User')).toBeInTheDocument()

  const statusFilter = screen.getByRole('combobox', { name: 'Filter by status' })
  expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Suspended' })).toBeInTheDocument()
  fireEvent.change(statusFilter, { target: { value: 'suspended' } })
  expect(screen.getByText('Suspended User')).toBeInTheDocument()
  expect(screen.queryByText('Active User')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('link', { name: 'Open identity checks' }))
  expect(await screen.findByRole('heading', { name: 'Identity checks' })).toBeInTheDocument()
  const identityStats = within(screen.getByLabelText('User statistics'))
  expect(identityStats.getByText('Pending review')).toBeInTheDocument()
  expect(identityStats.getByText('Verified users')).toBeInTheDocument()
  expect(identityStats.getAllByText('1')).toHaveLength(2)
  expect(screen.queryByRole('combobox', { name: 'Filter by status' })).not.toBeInTheDocument()
  expect(screen.getByText('Active User')).toBeInTheDocument()
  expect(screen.queryByText('Suspended User')).not.toBeInTheDocument()
})

it('ignores a slow response after navigating to a different area', async () => {
  let finishUsers
  browserAccountClient.operations.mockImplementation((scope) =>
    scope === 'users'
      ? new Promise((resolve) => {
          finishUsers = resolve
        })
      : Promise.resolve({ support: [{ id: 'ticket-new', subject: 'Current support ticket', status: 'open' }] }),
  )
  render(
    <MemoryRouter initialEntries={['/?scope=users']}>
      <Link to="/?scope=support">Go to support</Link>
      <Operations />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('link', { name: 'Go to support' }))
  expect(await screen.findByText('Current support ticket')).toBeInTheDocument()
  finishUsers({ users: [{ user_id: 'stale-member', status: 'active' }] })
  await waitFor(() => expect(screen.queryByText('stale-member')).not.toBeInTheDocument())
  expect(screen.getByText('Current support ticket')).toBeInTheDocument()
})

it('keeps the selected independent page when its initial data finishes loading', async () => {
  let finish
  browserAccountClient.operations.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  open('data', undefined, [{ to: '/?scope=data&page=taskResponses', label: 'Open training reviews' }])
  await waitFor(() => expect(finish).toEqual(expect.any(Function)))
  fireEvent.click(screen.getByRole('link', { name: 'Open training reviews' }))
  finish({ submissions: [], taskResponses: [{ id: 'response-loaded', task_slug: 'navigation', status: 'submitted' }] })
  expect(await screen.findByText('Navigation')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Training reviews' })).toBeInTheDocument()
})

it('keeps authenticator verification separate from the record action form', async () => {
  auth.session.mfaSatisfiedAt = new Date(Date.now() - 11 * 60_000).toISOString()
  const view = open('users')
  fireEvent.click(await screen.findByRole('button', { name: /^Details for / }))
  expect(screen.getByLabelText('Security code')).toBeInTheDocument()
  expect(view.container.querySelectorAll('form form')).toHaveLength(0)
})

it('shows older pending identities independently and reports queue errors without claiming no pending work', async () => {
  browserAccountClient.operations.mockResolvedValue({
    users: [{ user_id: 'recent', full_name: 'Recent Verified User', kyc_status: 'verified' }],
    identityChecks: [{ user_id: 'older', full_name: 'Older Pending User', kyc_status: 'pending' }],
    userStats: { verificationPending: 1, verified: 200 },
  })
  open('users', 'identity')
  expect(await screen.findByText('Older Pending User')).toBeInTheDocument()
  expect(screen.queryByText('Recent Verified User')).not.toBeInTheDocument()
  cleanup()
  browserAccountClient.operations.mockResolvedValue({
    users: [],
    identityChecks: null,
    userStats: { verificationPending: 1 },
  })
  open('users', 'identity')
  expect(await screen.findByRole('alert')).toHaveTextContent('Identity checks could not be loaded')
  expect(screen.queryByText('No identity checks pending')).not.toBeInTheDocument()
})

it('hides changes that cannot be applied to deleted accounts or completed training reviews', () => {
  expect(recordActions('users', ['admin'], { user_id: 'deleted', status: 'deleted' })).toEqual([])
  for (const status of ['approved', 'rejected', 'deleted'])
    expect(recordActions('taskResponses', ['admin'], { status })).toEqual([])
  expect(recordActions('taskResponses', ['data_operator'], { status: 'submitted' })).toHaveLength(1)
})
it('keeps success feedback on the page where the action was made', async () => {
  open('users', undefined, [{ to: '/?scope=users&page=identity', label: 'Open identity checks' }])
  fireEvent.click(await screen.findByRole('button', { name: /^Details for / }))
  fireEvent.change(screen.getByLabelText('Reason for change'), { target: { value: 'Reviewed identity' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save identity check' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Identity check updated')
  fireEvent.click(screen.getByRole('link', { name: 'Open identity checks' }))
  expect(screen.queryByText('Identity check updated.')).not.toBeInTheDocument()
})
