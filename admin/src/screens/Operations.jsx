import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminShell from '../components/AdminShell.jsx'
import SupplyProgress from '../components/SupplyProgress.jsx'
import AdminHint from '../components/AdminHint.jsx'
import OperatorAccessPanel from '../../../src/components/admin/OperatorAccessPanel.jsx'
import { useAuth } from '../../../src/components/auth/AuthProvider.jsx'
import RewardRulesEditor from '../../../src/components/mining/RewardRulesEditor.jsx'
import StateView from '../../../src/components/states/StateView.jsx'
import { hasRecentMfa } from '../../../src/domain/auth/policy.ts'
import { Icon, SectionTitle } from '../../../src/components/ui.jsx'
import { Badge } from '../../../src/components/ui/badge.jsx'
import { Button } from '../../../src/components/ui/button.jsx'
import { Card, CardContent } from '../../../src/components/ui/card.jsx'
import { Input } from '../../../src/components/ui/input.jsx'
import { browserAccountClient } from '../../../src/infrastructure/account/browserAccountClient.ts'
import { securitySettingsUrl } from '../lib/externalRoutes.js'

const roleScopes = {
  support_operator: ['overview', 'support'],
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

function actionsForScope(scope, roles) {
  if (roles.includes('admin')) return scopeActions[scope] || []
  if (scope === 'users') return roles.includes('kyc_operator') ? ['kyc.set'] : []
  if (scope === 'support') return roles.includes('support_operator') ? ['support.update'] : []
  if (scope === 'finance') return roles.includes('finance_operator') ? ['deployment.settle'] : []
  if (scope === 'deployments') return roles.includes('deployment_operator') ? ['deployment.match'] : []
  if (scope === 'data') return roles.includes('data_operator') ? ['data.review', 'data.task.review'] : []
  if (scope === 'risk') return roles.includes('risk_operator') ? ['referral.qualify', 'community.moderate'] : []
  return []
}

function actionTargetFields(action, record) {
  const row = record?.row
  if (!row) return {}
  const reference = row.id || ''
  switch (action) {
    case 'user.suspend':
    case 'user.restore':
    case 'kyc.set': return record.group === 'users' ? { userId: row.user_id || reference } : {}
    case 'support.update': return record.group === 'support' ? { ticketId: row.ticket_id || reference } : {}
    case 'deployment.match': return record.group === 'deploymentRequests' ? { requestId: reference } : {}
    case 'deployment.settle': return record.group === 'settlements' ? { deploymentId: reference } : {}
    case 'data.review': return record.group === 'submissions' ? { submissionId: row.submission_id || reference } : {}
    case 'data.task.review': return record.group === 'taskResponses' ? { responseId: row.response_id || reference } : {}
    case 'referral.qualify': return record.group === 'referrals' ? { relationshipId: row.relationship_id || reference } : {}
    case 'community.moderate': return record.group === 'moderation' ? { targetType: row.target_type || '', targetId: row.target_id || reference } : {}
    default: return {}
  }
}

const ACTION_TARGETS = {
  'user.suspend': ['userId'], 'user.restore': ['userId'], 'kyc.set': ['userId'],
  'support.update': ['ticketId'], 'deployment.match': ['requestId'], 'deployment.settle': ['deploymentId'],
  'data.review': ['submissionId'], 'data.task.review': ['responseId'], 'referral.qualify': ['relationshipId'],
  'community.moderate': ['targetType', 'targetId'],
}
const ACTION_RECORD_GROUPS = {
  'user.suspend': 'users', 'user.restore': 'users', 'kyc.set': 'users',
  'support.update': 'support', 'deployment.match': 'deploymentRequests', 'deployment.settle': 'settlements',
  'data.review': 'submissions', 'data.task.review': 'taskResponses', 'referral.qualify': 'referrals',
  'community.moderate': 'moderation',
}

const actionInputDefaults = {
  'kyc.set': { kycStatus: 'pending' },
  'support.update': { status: 'in_progress', priority: 'normal' },
  'data.task.review': { status: 'approved' },
}

const scopeDetails = {
  overview: ['dashboard', 'Operations overview', 'A live view of the work your role can access.'],
  users: ['group', 'Users & KYC', 'Review account status and identity records.'],
  support: ['support_agent', 'Support queue', 'Work member requests and service tickets.'],
  finance: ['account_balance', 'Finance operations', 'Review settlement records and payment operations.'],
  deployments: ['rocket_launch', 'Deployments', 'Inspect deployment requests and active deployments.'],
  data: ['dataset', 'Data review', 'Review submissions, training tasks, and quality signals.'],
  risk: ['shield', 'Trust and safety', 'Review referrals and community moderation activity.'],
  rewards: ['workspace_premium', 'Reward policy', 'Manage XP progression and mining issuance rules.'],
  access: ['admin_panel_settings', 'Operator access', 'Grant scoped access to verified operator accounts.'],
}

const overviewMetricLabels = {
  kyc_pending: ['KYC awaiting review', 'Pending identity checks'],
  support_open: ['Open support cases', 'Open, active, and waiting on members'],
  withdrawals_in_progress: ['Withdrawals in progress', 'Reserved or awaiting provider'],
  deployment_requests: ['Deployment requests', 'Awaiting a match'],
  data_submissions_review: ['Data review queue', 'Submissions and training responses'],
  data_deletions_due: ['Data deletions due', 'Eligible requests waiting for processing'],
  referrals_pending: ['Referrals pending', 'Awaiting trust and safety review'],
  reward_policy: ['Reward policy', 'Current issuance state'],
}

const rewardPolicyLabels = {
  active_enabled: 'Issuance on',
  active_disabled: 'Issuance off',
  disabled: 'No active rule',
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
  return row.task_slug || row.subject || row.action || row.package_slug || row.id || row.user_id || row.target_id || row.status || 'Record'
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

export default function Operations() {
  const auth = useAuth()
  const scopes = useMemo(() => scopesForRoles(auth.session?.roles || []), [auth.session?.roles])
  const [searchParams, setSearchParams] = useSearchParams()
  const [scope, setScope] = useState(() => searchParams.get('scope') || 'overview')
  const activeScope = scopes.includes(scope) ? scope : scopes[0] || 'overview'
  const actions = actionsForScope(activeScope, auth.session?.roles || [])
  useEffect(() => {
    const requested = searchParams.get('scope')
    if (requested && scopes.includes(requested) && requested !== scope) setScope(requested)
    else if (scopes.length && (!scopes.includes(scope) || requested !== scope)) {
      setScope(scopes[0])
      setSearchParams({ scope: scopes[0] }, { replace: true })
    }
  }, [searchParams, scopes, scope, setSearchParams])
  const [snapshot, setSnapshot] = useState(null)
  const [refreshedAt, setRefreshedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [recordFilter, setRecordFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [mfaCode, setMfaCode] = useState('')
  const [form, setForm] = useState({ scope: '', action: '', reason: '', input: {} })
  useEffect(() => { setSelectedRecord(null); setPage(1) }, [activeScope])
  const formIsCurrent = form.scope === activeScope
  const action = formIsCurrent && actions.includes(form.action) ? form.action : actions[0] || ''
  const reason = formIsCurrent ? form.reason : ''
  const input = { ...(formIsCurrent ? form.input : {}), ...actionTargetFields(action, selectedRecord) }
  const actionTargetReady = selectedRecord?.group === ACTION_RECORD_GROUPS[action] && (ACTION_TARGETS[action] || []).every((key) => Boolean(input[key]))
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
      if (nextScope === 'overview') setRefreshedAt(result.summary?.generatedAt || '')
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
    if (!action || selectedRecord?.group !== ACTION_RECORD_GROUPS[action] || !actionTargetReady) return
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
      <AdminShell title="Operations">
        <StateView kind="locked" title="Operator role required" desc="This account has no WRS operations role." />
      </AdminShell>
    )
  }

  const records = rowsFrom(snapshot)
  const overviewMetrics = (snapshot?.summary?.metrics || []).filter((metric) => scopes.includes(metric.scope))
  const visibleRecords = records.filter(({ group, row }) => `${group} ${primaryLabel(row)} ${secondaryLabel(row)} ${row.status || ''}`.toLowerCase().includes(recordFilter.toLowerCase()))
  const pageCount = Math.max(1, Math.ceil(visibleRecords.length / 10))
  const pageRecords = visibleRecords.slice((page - 1) * 10, page * 10)
  const recentMfa = auth.session ? hasRecentMfa(auth.session) : false
  const currentDetails = scopeDetails[activeScope] || scopeDetails.overview

  return (
    <AdminShell title={currentDetails[1]} subtitle="Secure WRS control room">
      <div className="space-y-6">
        {activeScope === 'overview' && (
          <section className="admin-overview" aria-label="Operations summary">
            <div className="admin-overview-heading">
              <div>
                <h2>At a glance</h2>
              </div>
              <div className="admin-overview-tools">
                <Badge variant={recentMfa ? 'success' : 'warning'}>
                  <span className={`h-1.5 w-1.5 rounded-full ${recentMfa ? 'bg-success' : 'bg-[#f7c948]'}`} />
                  {recentMfa ? 'MFA verified' : 'MFA needed for changes'}
                </Badge>
                <span className="admin-overview-updated">
                  {refreshedAt ? `Updated ${new Date(refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not yet refreshed'}
                </span>
                <Button variant="outline" disabled={loading} onClick={() => load('overview')}>
                  {loading ? 'Refreshing…' : 'Refresh'}
                </Button>
              </div>
            </div>

            {scopes.includes('rewards') && <SupplyProgress issuance={snapshot?.summary?.issuance} loading={loading} onOpen={() => setSearchParams({ scope: 'rewards' })} />}
            <div className="admin-queue-heading"><div className="admin-section-title"><h3>Review queues</h3><AdminHint label="How to use these queues">Select a card to open its records. Counts show work waiting for review, not all historical records. Zero means no pending work; unavailable means the count could not be loaded. Sensitive changes may require authenticator verification.</AdminHint></div><span>{overviewMetrics.filter((metric) => typeof metric.value === 'number' && metric.value > 0).length} queues need attention</span></div>
            {message && !snapshot ? (
              <div className="admin-overview-error" role="alert">
                <span>{message}</span>
                <Button variant="outline" onClick={() => load('overview')}>Retry</Button>
              </div>
            ) : loading && !snapshot ? (
              <div className="admin-metric-grid" aria-label="Loading operations metrics">
                {Array.from({ length: 6 }, (_, index) => <div className="admin-metric-skeleton" key={index} />)}
              </div>
            ) : overviewMetrics.length ? (
              <div className="admin-metric-grid">
                {overviewMetrics.map((metric) => {
                  const [label, hint] = overviewMetricLabels[metric.key] || ['Operations metric', 'Open its queue for details']
                  const value = metric.status === 'unavailable'
                    ? 'Unavailable'
                    : typeof metric.value === 'number'
                      ? metric.value.toLocaleString()
                      : rewardPolicyLabels[metric.value] || 'Unavailable'
                  return (
                    <button
                      type="button"
                      className={`admin-metric-card ${metric.severity === 'attention' && metric.value > 0 ? 'is-attention' : ''}`}
                      key={metric.key}
                      onClick={() => {
                        if (scopes.includes(metric.scope)) setSearchParams({ scope: metric.scope })
                      }}
                      aria-label={`${label}: ${value}. Open ${scopeDetails[metric.scope]?.[1] || metric.scope}.`}
                    >
                      <span className="admin-metric-label">{label}</span>
                      <strong className={metric.status === 'unavailable' ? 'is-unavailable' : ''}>{value}</strong>
                      <span className="admin-metric-hint">{metric.status === 'unavailable' ? 'Could not load this count' : hint}</span>
                      <span className="admin-metric-link" aria-hidden="true"><Icon name="arrow_forward" className="text-[15px]" /></span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="admin-metric-empty">
                {loading ? 'Refreshing available queues…' : 'No overview queues are assigned to this operator.'}
              </div>
            )}
          </section>
        )}

        {activeScope !== 'overview' && <div className="min-w-0 space-y-5">
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
                      <a href={securitySettingsUrl}>Set up MFA</a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {activeScope === 'rewards' && (
              <RewardRulesEditor snapshot={snapshot} onReload={() => load(activeScope)} recentMfa={recentMfa} securitySettingsHref={securitySettingsUrl} />
            )}

            {activeScope === 'access' && auth.session?.roles?.includes('admin') && (
              <OperatorAccessPanel recentMfa={recentMfa} actorUserId={auth.session.userId} />
            )}

            {activeScope !== 'access' && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-on-surface">Operational records</h3>
                  <div className="admin-record-toolbar"><Input aria-label="Filter records" placeholder="Search current records" value={recordFilter} onChange={(event) => { setRecordFilter(event.target.value); setPage(1) }} /><Button variant="outline" disabled={loading} onClick={() => load(activeScope)}>Refresh</Button><span className="text-xs text-outline">{loading ? 'Refreshing…' : `${visibleRecords.length} of ${records.length} records`}</span></div>
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
                      {visibleRecords.length ? (
                        <div className="admin-table-wrap"><table className="admin-record-table"><thead><tr><th>Record</th><th>Category</th><th>Status</th><th>Updated</th><th><span className="sr-only">Record actions</span></th></tr></thead><tbody>
                          {pageRecords.map(({ group, row }, index) => {
                            const recordId = `${group}-${row.id || row.user_id || row.ticket_id || index}`
                            const expanded = selectedRecord?.recordId === recordId
                            const updated = row.updated_at || row.created_at
                            const state = row.status || row.kyc_status
                            return <tr key={recordId} className={expanded ? 'is-selected' : ''}>
                              <td><strong>{String(primaryLabel(row))}</strong><small>{group}</small></td>
                              <td>{String(row.category || row.data_category || row.priority || row.target_type || '—')}</td>
                              <td>{state ? <Badge variant={['completed', 'resolved', 'active', 'verified'].includes(String(state).toLowerCase()) ? 'success' : 'secondary'}>{String(state)}</Badge> : '—'}</td>
                              <td>{updated ? new Date(updated).toLocaleDateString() : '—'}</td>
                              <td><Button variant="outline" onClick={() => setSelectedRecord(expanded ? null : { recordId, group, row })}>{expanded ? 'Close' : 'Details'}</Button></td>
                            </tr>
                          })}
                        </tbody></table>
                        {selectedRecord && <section className="admin-selected-record" aria-label="Selected record details"><div><span>Selected record</span><strong>{String(primaryLabel(selectedRecord.row))}</strong></div><div className="admin-selected-fields">{[
                          ['Reference', selectedRecord.row.id || selectedRecord.row.ticket_id || selectedRecord.row.request_id || selectedRecord.row.deployment_id],
                          ['Status', selectedRecord.row.status || selectedRecord.row.kyc_status],
                          ['Category', selectedRecord.row.category || selectedRecord.row.data_category || selectedRecord.row.target_type],
                          ['Priority', selectedRecord.row.priority],
                          ['Updated', selectedRecord.row.updated_at || selectedRecord.row.created_at],
                        ].filter(([, value]) => value !== undefined && value !== null && value !== '').map(([name, value]) => <div key={name}><small>{name}</small><strong title={String(value)}>{String(value)}</strong></div>)}</div></section>}
                        <div className="admin-pagination"><span>Showing {visibleRecords.length ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, visibleRecords.length)} of {visibleRecords.length} records</span><div><Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button><span>Page {page} of {pageCount}</span><Button variant="outline" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</Button></div></div>
                        </div>
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
          </div>}
      </div>

      {actions.length > 0 && (
        <section>
          <SectionTitle>Operator action</SectionTitle>
          {!selectedRecord && <p className="mb-3 rounded-lg border border-outline/15 p-3 text-body-sm text-on-surface-variant">Select a record above to use it as the audited action target.</p>}
          {selectedRecord && !actionTargetReady && <p className="mb-3 rounded-lg border border-outline/15 p-3 text-body-sm text-on-surface-variant">This record does not include the target fields required for this action. Choose a compatible record.</p>}
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
                readOnly
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
                readOnly
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
                readOnly
                onChange={(event) => updateInput('requestId', event.target.value)}
              />
            )}
            {action === 'deployment.settle' && (
              <Field
                label="Deployment ID"
                value={input.deploymentId || ''}
                readOnly
                onChange={(event) => updateInput('deploymentId', event.target.value)}
              />
            )}
            {action === 'data.review' && (
              <>
                <Field
                label="Submission ID"
                value={input.submissionId || ''}
                readOnly
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
                readOnly
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
                readOnly
                onChange={(event) => updateInput('relationshipId', event.target.value)}
              />
            )}
            {action === 'community.moderate' && (
              <>
                <Field
                  label="Target type"
                  value={input.targetType || ''}
                  readOnly
                  onChange={(event) => updateInput('targetType', event.target.value)}
                />
                <Field
                  label="Target ID"
                  value={input.targetId || ''}
                  readOnly
                  onChange={(event) => updateInput('targetId', event.target.value)}
                />
                <Field
                  label="Moderation action"
                  value={input.moderationAction || ''}
                  onChange={(event) => updateInput('moderationAction', event.target.value)}
                />
              </>
            )}

            {!auth.session?.mfaEnabled && ['user.suspend', 'user.restore', 'kyc.set', 'deployment.settle'].includes(action) && (
              <div className="space-y-2 rounded-xl border border-tertiary/25 p-3">
                <p className="text-body-sm text-on-surface-variant">Enable an authenticator before running this sensitive action.</p>
                <Button asChild variant="outline"><a href={securitySettingsUrl}>Set up MFA</a></Button>
              </div>
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
              disabled={!action || !actionTargetReady || reason.trim().length < 3}
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
    </AdminShell>
  )
}
