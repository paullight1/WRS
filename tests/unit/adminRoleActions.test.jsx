import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminOperationsProduction from '../../src/screens/AdminOperationsProduction.jsx'
import { areasForRoles } from '../../admin/src/lib/operations.js'
import { browserAccountClient } from '../../src/infrastructure/account/browserAccountClient.ts'

const authState = vi.hoisted(() => ({ current: null }))
vi.mock('../../src/components/auth/AuthProvider.jsx', () => ({ useAuth: () => authState.current }))
vi.mock('../../admin/src/theme/AdminThemeProvider.jsx', () => ({ AdminThemeProvider: ({ children }) => children }))
vi.mock('../../admin/src/components/AdminShell.jsx', () => ({
  default: ({ title, children }) => (
    <main>
      <h1>{title}</h1>
      <nav>
        {areasForRoles(authState.current.session.roles).flatMap((area) =>
          area.groups?.length
            ? area.groups.map(([page, label]) => (
                <Link key={`${area.key}-${page}`} to={`?scope=${area.key}&page=${page}`}>
                  {label}
                </Link>
              ))
            : [
                <Link key={area.key} to={`?scope=${area.key}`}>
                  {area.label}
                </Link>,
              ],
        )}
      </nav>
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
  fireEvent.click(screen.getByRole('link', { name: 'Team access' }))
  return screen.findByLabelText('Exact account email or account ID', {}, { timeout: 10000 })
}

async function findSubject(identifier = 'operator@example.com') {
  fireEvent.change(screen.getByLabelText('Exact account email or account ID'), { target: { value: identifier } })
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
    expect(screen.getByRole('link', { name: 'Team access' })).toBeInTheDocument()
    cleanup()
    authState.current = { session: currentSession(['reward_operator']), stepUpMfa: vi.fn() }
    openOperations()
    expect(screen.queryByRole('link', { name: 'Team access' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rewards' })).toBeInTheDocument()
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
    const identifier = screen.getByLabelText('Exact account email or account ID')
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
    const grant = screen.getByRole('button', { name: 'Grant finance staff' })
    expect(grant).toBeDisabled()
    expect(screen.getByText(/recent MFA/i)).toBeInTheDocument()
    cleanup()
    authState.current = { session: currentSession(), stepUpMfa: vi.fn() }
    browserAccountClient.roleSubject.mockResolvedValueOnce({ ...subject, userId: 'invalid' })
    await openAccess()
    await findSubject()
    expect(screen.getByRole('button', { name: 'Grant finance staff' })).toBeDisabled()
    cleanup()
    browserAccountClient.roleSubject.mockResolvedValueOnce(subject)
    await openAccess()
    await findSubject()
    const reason = screen.getByLabelText('Reason for access change')
    expect(screen.getByRole('button', { name: 'Grant finance staff' })).toBeDisabled()
    fireEvent.change(reason, { target: { value: 'ab' } })
    expect(screen.getByRole('button', { name: 'Grant finance staff' })).toBeDisabled()
    fireEvent.change(reason, { target: { value: 'Approved support coverage' } })
    expect(screen.getByRole('button', { name: 'Grant finance staff' })).toBeEnabled()
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
    fireEvent.click(screen.getByRole('button', { name: 'Grant finance staff' }))
    await waitFor(() =>
      expect(browserAccountClient.operationsAction).toHaveBeenCalledWith({
        action: 'role.grant',
        userId: subjectId,
        role: 'finance_operator',
        reason: 'Approved shift coverage',
      }),
    )
    expect(await screen.findByRole('button', { name: 'Revoke finance staff' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Revoke finance staff' }))
    await waitFor(() =>
      expect(browserAccountClient.operationsAction).toHaveBeenCalledWith({
        action: 'role.revoke',
        userId: subjectId,
        role: 'finance_operator',
        reason: 'Approved shift coverage',
      }),
    )
    expect(await screen.findByRole('button', { name: 'Grant finance staff' })).toBeEnabled()
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
    fireEvent.click(screen.getByRole('button', { name: 'Grant finance staff' }))
    const identifier = screen.getByLabelText('Exact account email or account ID')
    expect(identifier).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Find account' })).toBeDisabled()
    finishAction({ changed: true })
    expect(await screen.findByText(/Access change saved/)).toBeInTheDocument()
  })

  it('submits the default training decision for the selected response', async () => {
    browserAccountClient.operations.mockImplementation(async (scope) =>
      scope === 'data'
        ? {
            taskResponses: [
              { id: 'response-42', status: 'submitted', response: { answer: 'Robot training response' } },
            ],
            submissions: [],
          }
        : {},
    )
    openOperations()
    fireEvent.click(screen.getByRole('link', { name: 'Training reviews' }))
    fireEvent.click(await screen.findByRole('button', { name: /^Details for / }))
    expect(screen.getByText(/Robot training response/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Quality score'), { target: { value: '90' } })
    fireEvent.change(screen.getByLabelText('Reason for change'), { target: { value: 'Quality review' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save review' }))
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
