import { useCallback, useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import OperatorAccessPanel from '../components/admin/OperatorAccessPanel.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import RewardRulesEditor from '../components/mining/RewardRulesEditor.jsx'
import StateView from '../components/states/StateView.jsx'
import { hasRecentMfa } from '../domain/auth/policy.ts'
import { Icon, SectionTitle } from '../components/ui.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card, CardContent } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { browserAccountClient } from '../infrastructure/account/browserAccountClient.ts'

const roleScopes = {
  support_operator: ['overview', 'users', 'support'],
  kyc_operator: ['overview', 'users'],
  finance_operator: ['overview', 'finance'],
  data_operator: ['overview', 'data'],
  deployment_operator: ['overview', 'deployments'],
  risk_operator: ['overview', 'risk'],
  reward_operator: ['overview', 'rewards'],
}

const scopeActions = {
  users: ['user.suspend', 'user.restore', 'kyc.set'],
  support: ['support.update'],
  finance: ['deployment.settle'],
  deployments: ['deployment.match'],
  data: ['data.review', 'data.task.review'],
  risk: ['referral.qualify', 'community.moderate'],
}

const actionInputDefaults = {
  'kyc.set': { kycStatus: 'pending' },
  'support.update': { status: 'in_progress', priority: 'normal' },
  'data.task.review': { status: 'approved' },
}

const scopeDetails = {
  overview: ['dashboard', 'Operations overview', 'A live view of the work your role can access.'],
  users: ['group', 'User accounts', 'Review account status and identity records.'],
  support: ['support_agent', 'Support queue', 'Work member requests and service tickets.'],
  finance: ['account_balance', 'Finance operations', 'Review settlement records and payment operations.'],
  deployments: ['rocket_launch', 'Deployments', 'Inspect deployment requests and active deployments.'],
  data: ['dataset', 'Data review', 'Review submissions, training tasks, and quality signals.'],
  risk: ['shield', 'Trust and safety', 'Review referrals and community moderation activity.'],
  rewards: ['workspace_premium', 'Reward policy', 'Manage XP progression and mining issuance rules.'],
  access: ['admin_panel_settings', 'Operator access', 'Grant scoped access to verified operator accounts.'],
}

function AdminField({ label, hint, className = '', id, ...props }) {
  const inputId = id || `admin-${label?.replace(/\W+/g, '-').toLowerCase() || 'field'}`
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-on-surface-variant">
          {label}
        </label>
      )}
      <Input id={inputId} {...props} />
      {hint && <p className="mt-1.5 text-xs leading-5 text-outline">{hint}</p>}
    </div>
  )
}
const Field = AdminField

function scopesForRoles(roles = []) {
  if (roles.includes('admin'))
    return ['overview', 'users', 'support', 'finance', 'deployments', 'data', 'risk', 'rewards', 'access']
  return [...new Set(roles.flatMap((role) => roleScopes[role] || []))]
}

function rowsFrom(snapshot) {
  if (!snapshot) return []
  return Object.entries(snapshot)
    .filter(([key, value]) => key !== 'scope' && Array.isArray(value))
    .flatMap(([group, value]) => value.map((row) => ({ group, row })))
}

function primaryLabel(row) {
  return row.task_slug || row.subject || row.action || row.status || row.id || row.user_id || row.target_id || 'Record'
}

function secondaryLabel(row) {
  const values = [
    row.data_category,
    row.category,
    row.priority,
    row.quality_score,
    row.kyc_status,
    row.currency,
    row.amount_minor,
    row.target_type,
  ]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(String)
  return values.join(' · ')
}

export default function AdminOperationsProduction() {
  const auth = useAuth()
  const scopes = useMemo(() => scopesForRoles(auth.session?.roles || []), [auth.session?.roles])
  const [scope, setScope] = useState(() => scopes[0] || 'overview')
  const activeScope = scopes.includes(scope) ? scope : scopes[0] || 'overview'
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [form, setForm] = useState({ scope: '', action: '', reason: '', input: {} })
  const formIsCurrent = form.scope === activeScope
  const action = formIsCurrent ? form.action : scopeActions[activeScope]?.[0] || ''
  const reason = formIsCurrent ? form.reason : ''
  const input = formIsCurrent ? form.input : {}
  const updateInput = (key, value) =>
    setForm((current) => {
      const currentForm = current.scope === activeScope ? current : { scope: activeScope, action, reason, input: {} }
      return { ...currentForm, input: { ...currentForm.input, [key]: value } }
    })
  const updateReason = (value) =>
    setForm((current) => {
      const currentForm = current.scope === activeScope ? current : { scope: activeScope, action, reason, input: {} }
      return { ...currentForm, reason: value }
    })

  const load = useCallback(async (nextScope) => {
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
  }, [])

  useEffect(() => {
    if (!scopes.length || activeScope === 'access') return
    void Promise.resolve().then(() => load(activeScope))
  }, [activeScope, load, scopes.length])

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
    const actionInput = { ...actionInputDefaults[action], ...input }
    setBusy('action')
    setMessage('')
    try {
      await browserAccountClient.operationsAction({ action, reason, ...actionInput })
      setMessage(
        action === 'data.task.review'
          ? `Training response ${actionInput.status} review completed. XP is recorded only if the server's active reward rule issues it.`
          : `Operator action ${action} completed and was appended to the operations audit trail.`,
      )
      await load(activeScope)
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
  const actions = scopeActions[activeScope] || []
  const currentDetails = scopeDetails[activeScope] || scopeDetails.overview
  const label = (item) => scopeDetails[item]?.[1] || item

  return (
    <AppShell title="Operations" subtitle="Secure WRS control room" avatar={false} wide>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-white/[.08] bg-surface-container-low px-5 py-6 sm:px-7">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-primary-container/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-outline">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Operator workspace
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
                Operations control
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
                Review live records and perform audited actions within your assigned access.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/[.08] bg-background/60 px-3 py-2 text-xs font-medium text-on-surface-variant">
              <Icon name="verified_user" className="text-[17px] text-tertiary" />
              {recentMfa ? 'Session verified' : 'MFA review required'}
            </div>
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-2 border-t border-white/[.08] pt-4 sm:grid-cols-3 sm:gap-5">
            <div>
              <p className="font-data text-lg font-semibold text-on-surface">{scopes.length}</p>
              <p className="text-xs text-outline">Permitted scopes</p>
            </div>
            <div>
              <p className="font-data text-lg font-semibold text-on-surface">{auth.session?.roles?.length || 0}</p>
              <p className="text-xs text-outline">Assigned roles</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="font-data text-lg font-semibold text-on-surface">{loading ? '—' : records.length}</p>
              <p className="text-xs text-outline">Records in this view</p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[224px_minmax(0,1fr)] lg:items-start">
          <nav
            aria-label="Operations scopes"
            className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-1 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:rounded-xl lg:border lg:border-white/[.08] lg:bg-surface-container-low lg:p-2"
          >
            <p className="hidden px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[.12em] text-outline lg:block">
              Workspace
            </p>
            {scopes.map((item) => {
              const detail = scopeDetails[item] || [null, item, '']
              return (
                <button
                  key={item}
                  type="button"
                  aria-current={activeScope === item ? 'page' : undefined}
                  onClick={() => setScope(item)}
                  className={`group flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium capitalize transition-colors lg:w-full ${
                    activeScope === item
                      ? 'bg-primary-container/15 text-primary'
                      : 'text-on-surface-variant hover:bg-white/[.05] hover:text-on-surface'
                  }`}
                >
                  <Icon name={detail[0]} className="text-[18px]" />
                  <span className="lg:hidden">{item}</span>
                  <span className="hidden lg:inline">{label(item)}</span>
                  {activeScope === item && (
                    <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-primary lg:block" />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-[.12em] text-outline">Current scope</p>
                <h2 className="font-display text-xl font-semibold text-on-surface">{currentDetails[1]}</h2>
                <p className="mt-1 text-sm text-on-surface-variant">{currentDetails[2]}</p>
              </div>
              <Badge variant={recentMfa ? 'success' : 'warning'}>
                <span className={`h-1.5 w-1.5 rounded-full ${recentMfa ? 'bg-success' : 'bg-[#f7c948]'}`} />
                {recentMfa ? 'MFA verified' : 'MFA required'}
              </Badge>
            </div>

            {(activeScope === 'rewards' || activeScope === 'access') && !recentMfa && (
              <Card className="border-[#f7c948]/20 bg-[#f7c948]/[.045]">
                <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f7c948]/10 text-[#f7c948]">
                      <Icon name="lock" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">Fresh MFA protects sensitive changes</p>
                      <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                        {auth.session?.mfaEnabled
                          ? 'Verify your authenticator to unlock this control.'
                          : 'Set up an authenticator before managing this control.'}
                      </p>
                    </div>
                  </div>
                  {auth.session?.mfaEnabled ? (
                    <div className="flex w-full gap-2 sm:w-auto">
                      <AdminField
                        label="Authenticator code"
                        className="min-w-0 flex-1 sm:w-44"
                        value={mfaCode}
                        inputMode="numeric"
                        placeholder="6-digit code"
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      />
                      <Button className="mt-6" disabled={mfaCode.length !== 6 || busy === 'mfa'} onClick={stepUp}>
                        {busy === 'mfa' ? 'Verifying…' : 'Verify'}
                      </Button>
                    </div>
                  ) : (
                    <Button asChild variant="outline">
                      <a href="/settings/security">Set up MFA</a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {activeScope === 'rewards' && (
              <RewardRulesEditor snapshot={snapshot} onReload={() => load(activeScope)} recentMfa={recentMfa} />
            )}

            {activeScope === 'access' && auth.session?.roles?.includes('admin') && (
              <OperatorAccessPanel recentMfa={recentMfa} actorUserId={auth.session.userId} />
            )}

            {activeScope !== 'access' && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-on-surface">Operational records</h3>
                  <span className="text-xs text-outline">{loading ? 'Refreshing…' : `${records.length} records`}</span>
                </div>
                {loading ? (
                  <StateView
                    kind="loading"
                    title="Loading operations"
                    desc={`Reading the ${activeScope} operational scope.`}
                  />
                ) : message && !snapshot ? (
                  <StateView kind="error" title="Could not load this scope" desc={message} />
                ) : (
                  <Card>
                    <CardContent className="space-y-0 pt-1 sm:pt-1">
                      {records.length ? (
                        records.map(({ group, row }, index) => (
                          <details
                            key={`${group}-${row.id || row.user_id || index}`}
                            className="group border-b border-white/[.07] last:border-0"
                          >
                            <summary className="flex cursor-pointer list-none items-center gap-3 py-4 marker:hidden">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[.045] text-on-surface-variant">
                                <Icon name={scopeDetails[activeScope]?.[0] || 'database'} className="text-[18px]" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-on-surface">
                                  {String(primaryLabel(row))}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-outline">
                                  {group}
                                  {secondaryLabel(row) ? ` · ${secondaryLabel(row)}` : ''}
                                </span>
                              </span>
                              {row.status && (
                                <Badge
                                  variant={
                                    ['completed', 'resolved', 'active', 'verified'].includes(row.status)
                                      ? 'success'
                                      : 'secondary'
                                  }
                                >
                                  {row.status}
                                </Badge>
                              )}
                              <Icon
                                name="expand_more"
                                className="text-[18px] text-outline transition-transform group-open:rotate-180"
                              />
                            </summary>
                            <pre className="mb-4 max-h-64 overflow-auto rounded-lg border border-white/[.06] bg-background p-3 text-xs leading-5 text-on-surface-variant">
                              {JSON.stringify(row, null, 2)}
                            </pre>
                          </details>
                        ))
                      ) : (
                        <div className="py-9 text-center">
                          <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white/[.04] text-outline">
                            <Icon name="inbox" />
                          </span>
                          <p className="mt-3 text-sm font-medium text-on-surface">Nothing to review here</p>
                          <p className="mt-1 text-xs text-outline">No records are available in this permitted scope.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

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
                  setForm({ scope: activeScope, action: event.target.value, reason: '', input: {} })
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
                onChange={(event) => updateInput('userId', event.target.value)}
              />
            )}
            {action === 'kyc.set' && (
              <label className="block text-label-md text-on-surface-variant">
                KYC status
                <select
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-white/12 bg-surface-container px-3 text-body-md text-on-surface outline-none focus:border-primary"
                  value={input.kycStatus || 'pending'}
                  onChange={(event) => updateInput('kycStatus', event.target.value)}
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
                  onChange={(event) => updateInput('ticketId', event.target.value)}
                />
                <label className="block text-label-md text-on-surface-variant">
                  Status
                  <select
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-white/12 bg-surface-container px-3 text-body-md text-on-surface"
                    value={input.status || 'in_progress'}
                    onChange={(event) => updateInput('status', event.target.value)}
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
                    onChange={(event) => updateInput('priority', event.target.value)}
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
                  onChange={(event) => updateInput('message', event.target.value)}
                />
              </>
            )}
            {action === 'deployment.match' && (
              <Field
                label="Deployment request ID"
                value={input.requestId || ''}
                onChange={(event) => updateInput('requestId', event.target.value)}
              />
            )}
            {action === 'deployment.settle' && (
              <Field
                label="Deployment ID"
                value={input.deploymentId || ''}
                onChange={(event) => updateInput('deploymentId', event.target.value)}
              />
            )}
            {action === 'data.review' && (
              <>
                <Field
                  label="Submission ID"
                  value={input.submissionId || ''}
                  onChange={(event) => updateInput('submissionId', event.target.value)}
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
                    onChange={(event) => updateInput(key, Number(event.target.value))}
                  />
                ))}
                <Field
                  label="Review notes (optional)"
                  value={input.notes || ''}
                  onChange={(event) => updateInput('notes', event.target.value)}
                />
              </>
            )}
            {action === 'data.task.review' && (
              <>
                <Field
                  label="Training response ID"
                  value={input.responseId || ''}
                  onChange={(event) => updateInput('responseId', event.target.value)}
                />
                <label className="block text-label-md text-on-surface-variant">
                  Review decision
                  <select
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-white/12 bg-surface-container px-3 text-body-md text-on-surface"
                    value={input.status || 'approved'}
                    onChange={(event) => updateInput('status', event.target.value)}
                  >
                    {['approved', 'rejected'].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Quality score (approval requires 80 or higher)"
                  type="number"
                  min="0"
                  max="100"
                  value={input.qualityScore ?? ''}
                  onChange={(event) => updateInput('qualityScore', Number(event.target.value))}
                />
              </>
            )}
            {action === 'referral.qualify' && (
              <Field
                label="Referral relationship ID"
                value={input.relationshipId || ''}
                onChange={(event) => updateInput('relationshipId', event.target.value)}
              />
            )}
            {action === 'community.moderate' && (
              <>
                <Field
                  label="Target type"
                  value={input.targetType || ''}
                  onChange={(event) => updateInput('targetType', event.target.value)}
                />
                <Field
                  label="Target ID"
                  value={input.targetId || ''}
                  onChange={(event) => updateInput('targetId', event.target.value)}
                />
                <Field
                  label="Moderation action"
                  value={input.moderationAction || ''}
                  onChange={(event) => updateInput('moderationAction', event.target.value)}
                />
              </>
            )}

            <Field
              label="Reason code / justification"
              value={reason}
              onChange={(event) => updateReason(event.target.value)}
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
