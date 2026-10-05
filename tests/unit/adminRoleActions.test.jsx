import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminOperationsProduction from '../../src/screens/AdminOperationsProduction.jsx'
import { browserAccountClient } from '../../src/infrastructure/account/browserAccountClient.ts'

const authState = vi.hoisted(() => ({ current: null }))
vi.mock('../../src/components/auth/AuthProvider.jsx', () => ({ useAuth: () => authState.current }))
vi.mock('../../src/components/AppShell.jsx', () => ({
  default: ({ title, children }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}))

const subjectId = '33333333-3333-4333-8333-333333333333'
const actorId = '22222222-2222-4222-8222-222222222222'
const subject = { userId: subjectId, identifier: 'operator@example.com', roles: ['support_operator'] }
const currentSession = (roles = ['admin'], mfaSatisfiedAt = new Date().toISOString()) => ({
  userId: actorId,
  roles,
  mfaEnabled: true,
  mfaSatisfiedAt,
})

function openOperations() {
  render(
    <MemoryRouter>
      <AdminOperationsProduction />
    </MemoryRouter>,
  )
}

async function openAccess() {
  openOperations()
  fireEvent.click(screen.getByRole('button', { name: 'access' }))
  return screen.findByRole('heading', { name: 'Operator access' })
}

async function findSubject(identifier = 'operator@example.com') {
  fireEvent.change(screen.getByLabelText('Exact account email or UUID'), { target: { value: identifier } })
  fireEvent.click(screen.getByRole('button', { name: 'Find account' }))
  return screen.findByText('operator@example.com')
}

describe('admin operator access', () => {
  beforeEach(() => {
    authState.current = { session: currentSession(), stepUpMfa: vi.fn() }
    vi.spyOn(browserAccountClient, 'operations').mockResolvedValue({ scope: 'overview' })
    vi.spyOn(browserAccountClient, 'roleSubject').mockResolvedValue(subject)
    vi.spyOn(browserAccountClient, 'operationsAction').mockResolvedValue({ changed: true })
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows access only to a full admin, never to a reward operator', async () => {
    openOperations()
    expect(screen.getByRole('button', { name: 'access' })).toBeInTheDocument()
    cleanup()
    authState.current = { session: currentSession(['reward_operator']), stepUpMfa: vi.fn() }
    openOperations()
    expect(screen.queryByRole('button', { name: 'access' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'rewards' })).toBeInTheDocument()
  })

  it('accepts only an exact email or UUID and displays loading, absence, and errors', async () => {
    let resolveSearch
    browserAccountClient.roleSubject.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve
        }),
    )
    await openAccess()
    const identifier = screen.getByLabelText('Exact account email or UUID')
    fireEvent.change(identifier, { target: { value: 'operator' } })
    expect(screen.getByRole('button', { name: 'Find account' })).toBeDisabled()
    fireEvent.change(identifier, { target: { value: 'operator@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find account' }))
    expect(screen.getByRole('status')).toHaveTextContent('Searching')
    await waitFor(() => expect(browserAccountClient.roleSubject).toHaveBeenCalledWith('operator@example.com'))
    resolveSearch(subject)
    expect(await screen.findByText(subjectId)).toBeInTheDocument()
    expect(screen.getByText('operator@example.com')).toBeInTheDocument()
    browserAccountClient.roleSubject.mockRejectedValueOnce(new Error('Account not found.'))
    fireEvent.change(identifier, { target: { value: 'nobody@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find account' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Account not found.')
    expect(screen.queryByText(subjectId)).not.toBeInTheDocument()
    browserAccountClient.roleSubject.mockRejectedValueOnce(new Error('Lookup unavailable.'))
    fireEvent.click(screen.getByRole('button', { name: 'Find account' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Lookup unavailable.')
  })

  it('requires recent MFA, a valid target, and a 3–1000 character reason', async () => {
    authState.current = {
      session: currentSession(['admin'], new Date(Date.now() - 11 * 60_000).toISOString()),
      stepUpMfa: vi.fn(),
    }
    await openAccess()
    await findSubject()
    const grant = screen.getByRole('button', { name: 'Grant finance operator' })
    expect(grant).toBeDisabled()
    expect(screen.getByText(/recent MFA/i)).toBeInTheDocument()
    cleanup()
    authState.current = { session: currentSession(), stepUpMfa: vi.fn() }
    browserAccountClient.roleSubject.mockResolvedValueOnce({ ...subject, userId: 'invalid' })
    await openAccess()
    await findSubject()
    expect(screen.getByRole('button', { name: 'Grant finance operator' })).toBeDisabled()
    cleanup()
    browserAccountClient.roleSubject.mockResolvedValueOnce(subject)
    await openAccess()
    await findSubject()
    const reason = screen.getByLabelText('Reason for access change')
    expect(screen.getByRole('button', { name: 'Grant finance operator' })).toBeDisabled()
    fireEvent.change(reason, { target: { value: 'ab' } })
    expect(screen.getByRole('button', { name: 'Grant finance operator' })).toBeDisabled()
    fireEvent.change(reason, { target: { value: 'Approved support coverage' } })
    expect(screen.getByRole('button', { name: 'Grant finance operator' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /grant admin/i })).not.toBeInTheDocument()
  })

  it('sends scoped grant and revoke payloads and refreshes the matched roles', async () => {
    browserAccountClient.roleSubject
      .mockResolvedValueOnce(subject)
      .mockResolvedValueOnce({ ...subject, roles: ['support_operator', 'finance_operator'] })
      .mockResolvedValueOnce(subject)
    await openAccess()
    await findSubject()
    fireEvent.change(screen.getByLabelText('Reason for access change'), {
      target: { value: 'Approved shift coverage' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Grant finance operator' }))
    await waitFor(() =>
      expect(browserAccountClient.operationsAction).toHaveBeenCalledWith({
        action: 'role.grant',
        userId: subjectId,
        role: 'finance_operator',
        reason: 'Approved shift coverage',
      }),
    )
    expect(await screen.findByRole('button', { name: 'Revoke finance operator' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Revoke finance operator' }))
    await waitFor(() =>
      expect(browserAccountClient.operationsAction).toHaveBeenCalledWith({
        action: 'role.revoke',
        userId: subjectId,
        role: 'finance_operator',
        reason: 'Approved shift coverage',
      }),
    )
    expect(await screen.findByRole('button', { name: 'Grant finance operator' })).toBeEnabled()
    expect(browserAccountClient.roleSubject).toHaveBeenCalledTimes(3)
  })

  it('locks the searched identity while a role mutation is in flight', async () => {
    let finishAction
    browserAccountClient.operationsAction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishAction = resolve
        }),
    )
    await openAccess()
    await findSubject()
    fireEvent.change(screen.getByLabelText('Reason for access change'), {
      target: { value: 'Approved shift coverage' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Grant finance operator' }))
    const identifier = screen.getByLabelText('Exact account email or UUID')
    expect(identifier).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Find account' })).toBeDisabled()
    finishAction({ changed: true })
    expect(await screen.findByText(/Role change saved/)).toBeInTheDocument()
  })

  it('submits the default training review decision shown in the form', async () => {
    openOperations()
    await screen.findByRole('heading', { name: 'Redacted operational records' })
    fireEvent.click(screen.getByRole('button', { name: 'data' }))
    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'data.task.review' } })
    fireEvent.change(screen.getByLabelText('Training response ID'), { target: { value: 'response-42' } })
    fireEvent.change(screen.getByLabelText('Quality score (approval requires 80 or higher)'), {
      target: { value: '90' },
    })
    fireEvent.change(screen.getByLabelText('Reason code / justification'), { target: { value: 'Quality review' } })
    fireEvent.click(screen.getByRole('button', { name: 'Execute audited action' }))
    await waitFor(() =>
      expect(browserAccountClient.operationsAction).toHaveBeenCalledWith({
        action: 'data.task.review',
        responseId: 'response-42',
        qualityScore: 90,
        reason: 'Quality review',
        status: 'approved',
      }),
    )
  })
})
