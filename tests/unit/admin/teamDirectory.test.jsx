import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import OperatorAccessPanel from '../../../src/components/admin/OperatorAccessPanel.jsx'
import { browserAccountClient } from '../../../src/infrastructure/account/browserAccountClient.ts'

const actor = '11111111-1111-4111-8111-111111111111'
const subject = {
  userId: '22222222-2222-4222-8222-222222222222',
  identifier: 'ada@example.com',
  roles: ['support_operator'],
}

beforeEach(() => {
  vi.spyOn(browserAccountClient, 'team').mockResolvedValue({
    members: [
      {
        userId: subject.userId,
        fullName: 'Ada Okafor',
        email: subject.identifier,
        roles: ['support_operator'],
      },
      {
        userId: '33333333-3333-4333-8333-333333333333',
        fullName: 'Kwame Mensah',
        email: 'kwame@example.com',
        roles: ['finance_operator'],
      },
    ],
    stats: { total: 2, active: 2, pending: 0, suspended: 0, roleCounts: {}, scope: 'all' },
    hasMore: false,
  })
  vi.spyOn(browserAccountClient, 'roleSubject').mockResolvedValue(subject)
  vi.spyOn(browserAccountClient, 'operationsAction').mockResolvedValue({ changed: true })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('loads real staff context and routes a selected member through exact role lookup', async () => {
  render(<OperatorAccessPanel compact recentMfa actorUserId={actor} />)

  expect(await screen.findByText('Ada Okafor')).toBeInTheDocument()
  expect(screen.getByLabelText('Staff statistics')).toHaveTextContent('2')
  expect(browserAccountClient.roleSubject).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: /Ada Okafor/ }))
  await waitFor(() => expect(browserAccountClient.roleSubject).toHaveBeenCalledWith('ada@example.com'))
  expect(await screen.findByText(subject.userId)).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Reason for access change'), {
    target: { value: 'Approved support coverage' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Grant finance staff' }))
  await waitFor(() =>
    expect(browserAccountClient.operationsAction).toHaveBeenCalledWith({
      action: 'role.grant',
      userId: subject.userId,
      role: 'finance_operator',
      reason: 'Approved support coverage',
    }),
  )
  await waitFor(() => expect(browserAccountClient.team).toHaveBeenCalledTimes(2))
})

it('shows a failed directory load with a retry that restores the real list', async () => {
  browserAccountClient.team.mockReset()
  browserAccountClient.team
    .mockRejectedValueOnce(new Error('Staff service is temporarily unavailable.'))
    .mockResolvedValueOnce({
      members: [
        { userId: subject.userId, fullName: 'Ada Okafor', email: subject.identifier, roles: ['support_operator'] },
      ],
      stats: { total: 1, active: 1, pending: 0, suspended: 0, roleCounts: {}, scope: 'all' },
      hasMore: false,
    })

  render(<OperatorAccessPanel compact recentMfa actorUserId={actor} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Staff service is temporarily unavailable.')
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByText('Ada Okafor')).toBeInTheDocument()
  expect(browserAccountClient.team).toHaveBeenCalledTimes(2)
})
