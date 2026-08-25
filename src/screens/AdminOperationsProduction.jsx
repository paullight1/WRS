import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import StateView from '../components/states/StateView.jsx'
import { hasRecentMfa } from '../domain/auth/policy.ts'
import { Badge, Button, Card, Field, SectionTitle } from '../components/ui.jsx'
import { browserAccountClient } from '../infrastructure/account/browserAccountClient.ts'

const roleScopes = {
  support_operator: ['overview', 'users', 'support'],
  kyc_operator: ['overview', 'users'],
  finance_operator: ['overview', 'finance'],
  data_operator: ['overview', 'data'],
  deployment_operator: ['overview', 'deployments'],
  risk_operator: ['overview', 'risk'],
}

const scopeActions = {
  users: ['user.suspend', 'user.restore', 'kyc.set'],
  support: ['support.update'],
  finance: ['deployment.settle'],
  deployments: ['deployment.match'],
  data: ['data.review'],
  risk: ['referral.qualify', 'community.moderate'],
}

function scopesForRoles(roles = []) {
  if (roles.includes('admin')) return ['overview', 'users', 'support', 'finance', 'deployments', 'data', 'risk']
  return [...new Set(roles.flatMap((role) => roleScopes[role] || []))]
}

function rowsFrom(snapshot) {
  if (!snapshot) return []
  return Object.entries(snapshot)
    .filter(([key, value]) => key !== 'scope' && Array.isArray(value))
    .flatMap(([group, value]) => value.map((row) => ({ group, row })))
}

function primaryLabel(row) {
  return row.subject || row.action || row.status || row.id || row.user_id || row.target_id || 'Record'
}

function secondaryLabel(row) {
  const values = [row.category, row.priority, row.kyc_status, row.currency, row.amount_minor, row.target_type]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(String)
  return values.join(' · ')
}

export default function AdminOperationsProduction() {
  const auth = useAuth()
  const scopes = useMemo(() => scopesForRoles(auth.session?.roles || []), [auth.session?.roles])
  const [scope, setScope] = useState(() => scopes[0] || 'overview')
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [action, setAction] = useState('')
  const [reason, setReason] = useState('')
  const [input, setInput] = useState({})

  const load = async (nextScope = scope) => {
    setLoading(true)
    setMessage('')
    try {
      const result = await browserAccountClient.operations(nextScope)
      setSnapshot(result)
    } catch (error) {
      setSnapshot(null)
      setMessage(error instanceof Error ? error.message : 'Operations data is unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!scopes.includes(scope)) setScope(scopes[0] || 'overview')
  }, [scope, scopes])

  useEffect(() => {
    if (!scopes.length) {
      setLoading(false)
      return
    }
    void load(scope)
  }, [scope])

  useEffect(() => {
    const first = scopeActions[scope]?.[0] || ''
    setAction(first)
    setInput({})
    setReason('')
  }, [scope])

  const stepUp = async () => {
    setBusy('mfa')
    setMessage('')
    try {
      await auth.stepUpMfa(mfaCode)
      setMfaCode('')
      setMessage('Recent MFA proof confirmed for high-risk operator actions.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'MFA step-up failed.')
    } finally {
      setBusy('')
    }
  }

  const submitAction = async () => {
    if (!action) return
    setBusy('action')
    setMessage('')
    try {
      await browserAccountClient.operationsAction({ action, reason, ...input })
      setMessage(`Operator action ${action} completed and was appended to the operations audit trail.`)
      await load(scope)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Operator action failed.')
    } finally {
      setBusy('')
    }
  }

  if (!scopes.length) {
    return (
      <AppShell title="Operations" avatar={false}>
        <StateView kind="locked" title="Operator role required" desc="This account has no WRS operations role." />
      </AppShell>
    )
  }

  const records = rowsFrom(snapshot)
  const recentMfa = auth.session ? hasRecentMfa(auth.session) : false
  const actions = scopeActions[scope] || []

  return (
    <AppShell title="Operations" subtitle="Least-privilege production controls" avatar={false}>
      <section>
        <SectionTitle>Scope</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {scopes.map((item) => (
            <Button key={item} size="sm" variant={scope === item ? 'primary' : 'ghost'} onClick={() => setScope(item)}>
              {item}
            </Button>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Redacted operational records</SectionTitle>
        {loading ? (
          <StateView kind="loading" title="Loading operations" desc={`Reading the ${scope} operational scope.`} />
        ) : (
          <Card className="space-y-2 p-card-padding">
            {records.length ? (
              records.map(({ group, row }, index) => (
                <details
                  key={`${group}-${row.id || row.user_id || index}`}
                  className="rounded-xl border border-white/8 p-3"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-body-md font-medium text-on-surface">{String(primaryLabel(row))}</p>
                        <p className="truncate text-label-sm text-outline">
                          {group}
                          {secondaryLabel(row) ? ` · ${secondaryLabel(row)}` : ''}
                        </p>
                      </div>
                      {row.status && (
                        <Badge
                          t={
                            ['completed', 'resolved', 'active', 'verified'].includes(row.status) ? 'success' : 'outline'
                          }
                        >
                          {row.status}
                        </Badge>
                      )}
                    </div>
                  </summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/25 p-3 text-data-sm text-on-surface-variant">
                    {JSON.stringify(row, null, 2)}
                  </pre>
                </details>
              ))
            ) : (
              <p className="text-body-sm text-on-surface-variant">No records are available in this permitted scope.</p>
            )}
          </Card>
        )}
      </section>

      {actions.length > 0 && (
        <section>
          <SectionTitle>Operator action</SectionTitle>
          <Card className="space-y-4 p-card-padding">
            <label className="block text-label-md text-on-surface-variant">
              Action
              <select
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/12 bg-surface-container px-3 text-body-md text-on-surface outline-none focus:border-primary"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value)
                  setInput({})
                }}
              >
                {actions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            {(action === 'user.suspend' || action === 'user.restore' || action === 'kyc.set') && (
              <Field
                label="User ID"
                value={input.userId || ''}
                onChange={(event) => setInput((current) => ({ ...current, userId: event.target.value }))}
              />
            )}
            {action === 'kyc.set' && (
              <label className="block text-label-md text-on-surface-variant">
                KYC status
                <select
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-white/12 bg-surface-container px-3 text-body-md text-on-surface outline-none focus:border-primary"
                  value={input.kycStatus || 'pending'}
                  onChange={(event) => setInput((current) => ({ ...current, kycStatus: event.target.value }))}
                >
                  {['unverified', 'pending', 'verified', 'rejected'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {action === 'support.update' && (
              <>
                <Field
                  label="Ticket ID"
                  value={input.ticketId || ''}
                  onChange={(event) => setInput((current) => ({ ...current, ticketId: event.target.value }))}
                />
                <label className="block text-label-md text-on-surface-variant">
                  Status
                  <select
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-white/12 bg-surface-container px-3 text-body-md text-on-surface"
                    value={input.status || 'in_progress'}
                    onChange={(event) => setInput((current) => ({ ...current, status: event.target.value }))}
                  >
                    {['open', 'in_progress', 'waiting_user', 'resolved', 'closed'].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-label-md text-on-surface-variant">
                  Priority
                  <select
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-white/12 bg-surface-container px-3 text-body-md text-on-surface"
                    value={input.priority || 'normal'}
                    onChange={(event) => setInput((current) => ({ ...current, priority: event.target.value }))}
                  >
                    {['low', 'normal', 'high', 'urgent'].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Operator message (optional)"
                  value={input.message || ''}
                  onChange={(event) => setInput((current) => ({ ...current, message: event.target.value }))}
                />
              </>
            )}
            {action === 'deployment.match' && (
              <Field
                label="Deployment request ID"
                value={input.requestId || ''}
                onChange={(event) => setInput((current) => ({ ...current, requestId: event.target.value }))}
              />
            )}
            {action === 'deployment.settle' && (
              <Field
                label="Deployment ID"
                value={input.deploymentId || ''}
                onChange={(event) => setInput((current) => ({ ...current, deploymentId: event.target.value }))}
              />
            )}
            {action === 'data.review' && (
              <>
                <Field
                  label="Submission ID"
                  value={input.submissionId || ''}
                  onChange={(event) => setInput((current) => ({ ...current, submissionId: event.target.value }))}
                />
                {[
                  'completeness',
                  'accuracy',
                  'consistency',
                  'signalQuality',
                  'reviewerAgreement',
                  'policyCompliance',
                ].map((key) => (
                  <Field
                    key={key}
                    label={key}
                    type="number"
                    value={input[key] ?? ''}
                    onChange={(event) => setInput((current) => ({ ...current, [key]: Number(event.target.value) }))}
                  />
                ))}
                <Field
                  label="Review notes (optional)"
                  value={input.notes || ''}
                  onChange={(event) => setInput((current) => ({ ...current, notes: event.target.value }))}
                />
              </>
            )}
            {action === 'referral.qualify' && (
              <Field
                label="Referral relationship ID"
                value={input.relationshipId || ''}
                onChange={(event) => setInput((current) => ({ ...current, relationshipId: event.target.value }))}
              />
            )}
            {action === 'community.moderate' && (
              <>
                <Field
                  label="Target type"
                  value={input.targetType || ''}
                  onChange={(event) => setInput((current) => ({ ...current, targetType: event.target.value }))}
                />
                <Field
                  label="Target ID"
                  value={input.targetId || ''}
                  onChange={(event) => setInput((current) => ({ ...current, targetId: event.target.value }))}
                />
                <Field
                  label="Moderation action"
                  value={input.moderationAction || ''}
                  onChange={(event) => setInput((current) => ({ ...current, moderationAction: event.target.value }))}
                />
              </>
            )}

            <Field
              label="Reason code / justification"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />

            {auth.session?.mfaEnabled &&
              !recentMfa &&
              ['user.suspend', 'user.restore', 'kyc.set', 'deployment.settle'].includes(action) && (
                <div className="space-y-2 rounded-xl border border-tertiary/25 p-3">
                  <p className="text-body-sm text-on-surface-variant">This action requires fresh MFA.</p>
                  <Field
                    label="Authenticator code"
                    value={mfaCode}
                    onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                  />
                  <Button loading={busy === 'mfa'} disabled={mfaCode.length !== 6} onClick={stepUp}>
                    Verify factor
                  </Button>
                </div>
              )}

            <Button
              full
              loading={busy === 'action'}
              disabled={!action || reason.trim().length < 3}
              onClick={submitAction}
            >
              Execute audited action
            </Button>
            <p className="text-label-sm text-outline">
              The API re-checks exact role permission, target validation, MFA where required, and appends immutable
              operations evidence.
            </p>
          </Card>
        </section>
      )}

      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}
    </AppShell>
  )
}
