import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import RecordWorkspace from '../../../admin/src/components/RecordWorkspace.jsx'
import { browserAccountClient } from '../../../src/infrastructure/account/browserAccountClient.ts'
import { AREAS, pageForArea } from '../../../admin/src/lib/operations.js'

vi.mock('../../../src/components/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ session: { roles: ['admin'], mfaEnabled: true, mfaSatisfiedAt: new Date().toISOString() } }),
}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
const person = { user_name: 'Ada Okafor', user_email: 'ada@wrs.test' }
function open(scope, group, row, extra = {}) {
  const area = pageForArea(
    AREAS.find(({ key }) => key === scope),
    group,
  )
  return render(
    <RecordWorkspace
      area={area}
      snapshot={{ [group]: [{ id: `${group}-1`, ...row }], stats: { [group]: { total: 1200 } }, ...extra }}
      loading={false}
      onSaved={vi.fn()}
    />,
  )
}
it.each([
  ['support', 'support', { ...person, subject: 'Payment question', status: 'open', messages: [] }, 'Payment question'],
  [
    'finance',
    'payments',
    { ...person, amount_minor: 250000, currency: 'NGN', package_slug: 'professional', status: 'succeeded' },
    'Ada Okafor',
  ],
  [
    'finance',
    'withdrawals',
    { ...person, amount_minor: 5000, currency: 'USD', status: 'provider_pending' },
    'Ada Okafor',
  ],
  [
    'finance',
    'settlements',
    {
      ...person,
      job_title: 'Warehouse inspection',
      status: 'completed',
      payout_status: 'settled',
      amount_minor: 30000,
      currency: 'NGN',
    },
    'Warehouse inspection',
  ],
  [
    'deployments',
    'deploymentRequests',
    { ...person, job_title: 'Inventory check', robot_name: 'Atlas', status: 'requested' },
    'Inventory check',
  ],
  [
    'deployments',
    'deployments',
    { ...person, job_title: 'Inventory check', robot_name: 'Atlas', status: 'active' },
    'Inventory check',
  ],
  ['data', 'submissions', { ...person, data_category: 'voice', quality_score: 82, status: 'review' }, 'Ada Okafor'],
  [
    'data',
    'taskResponses',
    { ...person, task_slug: 'safe-crossing', quality_score: 82, status: 'review' },
    'Ada Okafor',
  ],
  ['data', 'deletions', { ...person, data_category: 'voice', status: 'requested' }, 'Ada Okafor'],
  [
    'risk',
    'referrals',
    {
      referred_name: 'Ada Okafor',
      referred_email: 'ada@wrs.test',
      referrer_name: 'Kwame Mensah',
      referral_code: 'WRS123',
      status: 'pending',
    },
    'Ada Okafor',
  ],
  [
    'risk',
    'moderation',
    {
      target_name: 'Community announcement',
      target_type: 'announcement',
      action: 'reviewed',
      reason: 'Checked source',
    },
    'Community announcement',
  ],
])('shows real context and server totals on %s/%s', (scope, group, row, text) => {
  open(scope, group, row)
  expect(within(screen.getByRole('table')).getByText(text)).toBeInTheDocument()
  expect(screen.getByLabelText(/statistics/).textContent).toContain('1,200')
  expect(screen.getByText(/of 1200 results/)).toBeInTheDocument()
})
it('shows the conversation and preserves author names and message order', () => {
  open('support', 'support', {
    ...person,
    subject: 'Payment question',
    status: 'open',
    messages: [
      { id: 'm1', actor_name: 'Ada Okafor', author_role: 'user', body: 'My payment is missing.' },
      { id: 'm2', actor_name: 'Kwame Support', author_role: 'operator', body: 'I am checking your payment.' },
    ],
  })
  fireEvent.click(screen.getByRole('button', { name: /^Details for / }))
  const conversation = within(screen.getByRole('region', { name: 'Conversation' }))
  expect(conversation.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    expect.stringContaining('My payment is missing.'),
    expect.stringContaining('I am checking your payment.'),
  ])
  expect(conversation.getByText('Kwame Support')).toBeInTheDocument()
})
it('does not offer to pay an already-paid job', () => {
  open('finance', 'settlements', { ...person, job_title: 'Paid job', status: 'completed', payout_status: 'settled' })
  fireEvent.click(screen.getByRole('button', { name: /^Details for / }))
  expect(screen.queryByRole('button', { name: 'Pay for job' })).not.toBeInTheDocument()
})
it('opens only a clean, available submitted file through the authorized admin route', () => {
  open('data', 'submissions', { ...person, asset_id: 'asset-1', status: 'review', scan_status: 'clean' })
  fireEvent.click(screen.getByRole('button', { name: /^Details for / }))
  expect(screen.getByRole('link', { name: /Open submitted file/ })).toHaveAttribute(
    'href',
    expect.stringContaining('/api/admin/data-file?assetId=asset-1'),
  )
})
it('explains a pending referral that is not ready for approval', () => {
  open('risk', 'referrals', {
    referred_name: 'Ada Okafor',
    status: 'pending',
    eligibility_status: 'unverified',
    eligibility_reason: 'Invited user email is not verified.',
  })
  fireEvent.click(screen.getByRole('button', { name: /^Details for / }))
  expect(screen.getByRole('button', { name: 'Approve referral' })).toBeDisabled()
  expect(within(screen.getByRole('dialog')).getByText('Invited user email is not verified.')).toBeInTheDocument()
})

it('loads earlier support messages without dropping newer messages or changing tickets', async () => {
  vi.spyOn(browserAccountClient, 'supportThread')
    .mockResolvedValueOnce({
      messages: [{ id: 'new', author_role: 'user', body: 'Latest message' }],
      hasMore: true,
      before: { id: 'new', time: '2026-10-30T12:00:00Z' },
    })
    .mockResolvedValueOnce({
      messages: [{ id: 'old', author_role: 'operator', body: 'Earlier reply' }],
      hasMore: false,
      before: null,
    })
  open('support', 'support', { ...person, subject: 'Message history', status: 'open', messages: null })
  fireEvent.click(screen.getByRole('button', { name: /^Details for / }))
  fireEvent.click(screen.getByRole('button', { name: 'Load conversation' }))
  expect(await screen.findByText('Latest message')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Load earlier messages' }))
  expect(await screen.findByText('Earlier reply')).toBeInTheDocument()
  const conversation = within(screen.getByRole('region', { name: 'Conversation' }))
  expect(conversation.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    expect.stringContaining('Earlier reply'),
    expect.stringContaining('Latest message'),
  ])
  expect(browserAccountClient.supportThread).toHaveBeenLastCalledWith('support-1', {
    id: 'new',
    time: '2026-10-30T12:00:00Z',
  })
})

it('returns keyboard focus to the ticket button after saving', async () => {
  vi.spyOn(browserAccountClient, 'operationsAction').mockResolvedValue({ changed: true })
  open('support', 'support', { ...person, subject: 'Question to resolve', status: 'open', messages: [] })
  const button = screen.getByRole('button', { name: /^Details for / })
  fireEvent.click(button)
  fireEvent.change(screen.getByLabelText('Reason for change'), { target: { value: 'Resolved question' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save ticket' }))
  await waitFor(() => expect(document.activeElement).toBe(button))
})

it('offers referral approval without requiring a paid plan or a waiting period', () => {
  open('risk', 'referrals', { referred_name: 'Ada Okafor', status: 'pending', eligibility_status: 'ready' })
  fireEvent.click(screen.getByRole('button', { name: /^Details for / }))
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByText('The invited user needs an active account and a verified email.')).toBeInTheDocument()
  fireEvent.change(dialog.getByLabelText('Reason for change'), { target: { value: 'Verified invited account' } })
  expect(dialog.getByRole('button', { name: 'Approve referral' })).toBeEnabled()
  expect(dialog.queryByText(/paid plan|7 days|review window/i)).not.toBeInTheDocument()
})
