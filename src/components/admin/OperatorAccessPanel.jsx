import { useCallback, useEffect, useRef, useState } from 'react'
import { browserAccountClient } from '../../infrastructure/account/browserAccountClient.ts'
import { Icon } from '../ui.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.jsx'
import { Input } from '../ui/input.jsx'

const roles = [
  ['support_operator', 'support staff'],
  ['kyc_operator', 'identity check staff'],
  ['finance_operator', 'finance staff'],
  ['data_operator', 'data staff'],
  ['deployment_operator', 'job staff'],
  ['risk_operator', 'risk staff'],
  ['reward_operator', 'rewards staff'],
]
const roleLabelFor = (role) => roles.find(([name]) => name === role)?.[1] || role.replace('_', ' ')
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const email = /^[^\s@*%]+@[^\s@*%]+\.[^\s@*%]+$/
const exactIdentifier = (value) => value.length <= 320 && (uuid.test(value) || email.test(value))
const countLabel = (value) => (typeof value === 'number' && Number.isSafeInteger(value) ? value.toLocaleString() : '—')

function validTeamDirectory(result) {
  const stats = result?.stats
  return (
    Array.isArray(result?.members) &&
    result.members.every(
      (member) =>
        member &&
        typeof member.userId === 'string' &&
        member.userId.trim() !== '' &&
        typeof member.fullName === 'string' &&
        typeof member.email === 'string' &&
        Array.isArray(member.roles) &&
        member.roles.every((role) => typeof role === 'string'),
    ) &&
    stats &&
    ['total', 'active', 'pending', 'suspended'].every((key) => Number.isSafeInteger(stats[key]) && stats[key] >= 0) &&
    (stats.scope === 'all' || stats.scope === 'shown') &&
    typeof result.hasMore === 'boolean'
  )
}

export default function OperatorAccessPanel({ recentMfa, actorUserId, compact = false }) {
  const [identifier, setIdentifier] = useState('')
  const [subject, setSubject] = useState(null)
  const [team, setTeam] = useState(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamFilter, setTeamFilter] = useState('')
  const [teamMessage, setTeamMessage] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const requestId = useRef(0)
  const teamRequestId = useRef(0)
  const query = identifier.trim()
  const validTarget = Boolean(
    subject &&
    typeof subject.userId === 'string' &&
    uuid.test(subject.userId) &&
    typeof actorUserId === 'string' &&
    uuid.test(actorUserId) &&
    subject.userId.toLowerCase() !== actorUserId?.toLowerCase(),
  )
  const validReason = reason.trim().length >= 3 && reason.trim().length <= 1000

  const loadTeam = useCallback(async () => {
    if (!compact || typeof browserAccountClient.team !== 'function') return false
    const currentRequest = ++teamRequestId.current
    setTeamLoading(true)
    setTeamMessage('')
    try {
      const result = await browserAccountClient.team()
      if (teamRequestId.current !== currentRequest) return false
      if (!validTeamDirectory(result)) throw new Error('Staff list returned an invalid result.')
      setTeam(result)
      return true
    } catch (error) {
      if (teamRequestId.current !== currentRequest) return false
      setTeamMessage(error instanceof Error ? error.message : 'Staff list could not be loaded.')
      return false
    } finally {
      if (teamRequestId.current === currentRequest) setTeamLoading(false)
    }
  }, [compact])

  useEffect(() => {
    let active = true
    if (compact) {
      queueMicrotask(() => {
        if (active) void loadTeam()
      })
    }
    return () => {
      active = false
      teamRequestId.current += 1
    }
  }, [compact, loadTeam])

  const updateIdentifier = (event) => {
    requestId.current += 1
    setIdentifier(event.target.value)
    setSubject(null)
    setMessage('')
    setBusy('')
  }

  const field = (label, value, onChange, props = {}) => {
    const id = `operator-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-on-surface-variant">
          {label}
        </label>
        <Input id={id} value={value} onChange={onChange} {...props} />
      </div>
    )
  }

  const lookup = async (value) => {
    const exact = String(value || '').trim()
    if (!exactIdentifier(exact)) return
    const currentRequest = ++requestId.current
    setIdentifier(exact)
    setSubject(null)
    setBusy('search')
    setMessage('Searching for the exact account…')
    try {
      const result = await browserAccountClient.roleSubject(exact)
      if (requestId.current !== currentRequest) return
      if (!result?.userId || !Array.isArray(result.roles)) throw new Error('Could not find a valid user account.')
      setSubject(result)
      setMessage('')
    } catch (error) {
      if (requestId.current === currentRequest)
        setMessage(error instanceof Error ? error.message : 'Could not find that account.')
    } finally {
      if (requestId.current === currentRequest) setBusy('')
    }
  }

  const search = async (event) => {
    event.preventDefault()
    await lookup(query)
  }

  const selectMember = (member) => {
    // Selecting a row still performs the exact role-subject lookup. The
    // directory is discovery-only; grant/revoke controls use the guarded path.
    void lookup(member.email || member.userId)
  }

  const listedMembers = (team?.members || []).filter((member) => {
    const needle = teamFilter.trim().toLowerCase()
    if (!needle) return true
    return [member.fullName, member.email, ...(member.roles || [])].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(needle),
    )
  })
  const teamLimited = Boolean(team && (team.hasMore || team.stats.scope === 'shown'))
  const changeRole = async (role, present) => {
    if (!recentMfa || !validTarget || !validReason || busy) return
    setBusy(role)
    setMessage('')
    try {
      await browserAccountClient.operationsAction({
        action: present ? 'role.revoke' : 'role.grant',
        userId: subject.userId,
        role,
        reason: reason.trim(),
      })
      setMessage('Access change saved. Updating current access…')
      let subjectRefreshError = ''
      try {
        const refreshed = await browserAccountClient.roleSubject(query)
        if (
          !refreshed?.userId ||
          refreshed.userId.toLowerCase() !== subject.userId.toLowerCase() ||
          !Array.isArray(refreshed.roles)
        ) {
          throw new Error('Could not update this account. Search again.')
        }
        setSubject(refreshed)
      } catch (error) {
        subjectRefreshError = error instanceof Error ? error.message : 'Search again.'
      }
      const directoryRefreshed = compact ? await loadTeam() : true
      if (subjectRefreshError) {
        setMessage(
          directoryRefreshed
            ? `Access change saved, but current access could not refresh: ${subjectRefreshError}`
            : `Access change saved, but current access and the staff directory could not refresh: ${subjectRefreshError}`,
        )
      } else {
        setMessage(
          directoryRefreshed
            ? 'Access change saved. Current access and the staff directory were updated.'
            : 'Access change saved. Current access was updated, but the staff directory could not refresh. Try again.',
        )
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Access change failed.')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className={`space-y-4 ${compact ? 'admin-access-panel' : ''}`}>
      {compact && (
        <Card className="admin-team-directory">
          <CardHeader className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Staff directory</CardTitle>
                <CardDescription>Choose a staff account to review its current access.</CardDescription>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                <Icon name="groups" />
              </span>
            </div>
            {team?.stats && (
              <div className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4" aria-label="Staff statistics">
                {[
                  [teamLimited ? 'Staff shown' : 'Staff members', team.stats.total],
                  ['Active', team.stats.active],
                  ['Pending', team.stats.pending],
                  ['Suspended', team.stats.suspended],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/[.08] bg-background/50 px-3 py-2">
                    <span className="block text-[11px] text-outline">{label}</span>
                    <strong className="mt-0.5 block text-base text-on-surface">{countLabel(value)}</strong>
                  </div>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label
                htmlFor="operator-team-filter"
                className="mb-1.5 block text-sm font-medium text-on-surface-variant"
              >
                Filter staff list
              </label>
              <Input
                id="operator-team-filter"
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
                placeholder="Name, email, or role"
                autoComplete="off"
              />
            </div>
            {teamLoading && (
              <p className="text-sm text-on-surface-variant" role="status" aria-live="polite">
                {team ? 'Refreshing staff list…' : 'Loading staff list…'}
              </p>
            )}
            {!teamLoading && teamMessage && (
              <div className="admin-notice" role="alert">
                <span>{teamMessage}</span>
                <button className="admin-btn" type="button" onClick={() => void loadTeam()}>
                  Try again
                </button>
              </div>
            )}
            {!teamLoading && !teamMessage && team && listedMembers.length === 0 && (
              <p className="text-sm text-on-surface-variant">No staff accounts match this filter.</p>
            )}
            {!teamLoading && !teamMessage && listedMembers.length > 0 && (
              <div className="space-y-2" aria-label="Staff accounts">
                {listedMembers.map((member) => (
                  <button
                    type="button"
                    key={member.userId}
                    className="admin-team-member flex w-full items-center justify-between gap-3 rounded-lg border border-white/[.08] bg-background/50 px-3 py-3 text-left hover:border-primary/30"
                    onClick={() => selectMember(member)}
                    disabled={busy !== ''}
                  >
                    <span className="min-w-0">
                      <strong className="block truncate text-sm text-on-surface">
                        {member.fullName || 'Unnamed staff member'}
                      </strong>
                      <span className="block truncate text-xs text-outline">{member.email}</span>
                    </span>
                    <span className="flex shrink-0 flex-wrap justify-end gap-1">
                      {member.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {roleLabelFor(role)}
                        </Badge>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {teamLimited && (
              <p className="text-xs leading-5 text-outline">
                Showing the first {countLabel(team.stats.total)} staff accounts. Use an exact email or account ID to
                find anyone outside this list.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>{compact ? 'Find an account' : 'Team access'}</CardTitle>
            <CardDescription>
              Find one account by exact email or account ID, then manage the access it needs.
            </CardDescription>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
            <Icon name="admin_panel_settings" />
          </span>
        </CardHeader>
        <CardContent>
          <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="operator-exact-identifier"
                className="mb-1.5 block text-sm font-medium text-on-surface-variant"
              >
                Exact account email or account ID
              </label>
              <Input
                id="operator-exact-identifier"
                value={identifier}
                onChange={updateIdentifier}
                maxLength={320}
                autoComplete="off"
                disabled={busy !== ''}
                placeholder="name@example.com or account ID"
              />
            </div>
            <Button
              type="submit"
              className="sm:min-w-36"
              disabled={!exactIdentifier(query) || busy !== ''}
              loading={busy === 'search'}
            >
              Find account
            </Button>
          </form>
        </CardContent>
      </Card>

      {subject ? (
        <div className={compact ? 'space-y-4' : 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.9fr)]'}>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Account permissions</CardTitle>
                  <CardDescription className="mt-1">
                    Changes take effect now and are added to the activity log.
                  </CardDescription>
                </div>
                <Badge variant={validTarget ? 'success' : 'destructive'}>
                  {validTarget ? 'Account checked' : 'Invalid account'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-white/[.08] bg-background/70 p-4">
                <p className="break-all text-sm font-semibold text-on-surface">{subject.identifier}</p>
                <p className="mt-1 break-all font-data text-[11px] text-outline">{subject.userId}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs text-outline">Current access</span>
                  {subject.isAdmin && <Badge variant="secondary">Administrator (read-only)</Badge>}
                  {subject.roles.length ? (
                    subject.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {roleLabelFor(role)}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">{subject.isAdmin ? 'No additional team roles' : 'No team roles'}</Badge>
                  )}
                </div>
              </div>

              {field('Reason for access change', reason, (event) => setReason(event.target.value), {
                maxLength: 1000,
                disabled: busy !== '',
                placeholder: 'Why does this user need this access?',
              })}
              <div className="flex items-center justify-between gap-3 text-xs text-outline">
                <span>3–1000 characters. Required for every change.</span>
                <span className="font-data">{reason.trim().length}/1000</span>
              </div>
              {!validTarget && (
                <p role="alert" className="text-sm text-error">
                  Choose a valid account other than your own.
                </p>
              )}
              {!recentMfa && (
                <p role="alert" className="text-sm text-error">
                  Recent MFA is required to change team access.
                </p>
              )}
              <div className="overflow-hidden rounded-lg border border-white/[.08]">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-white/[.025] px-3 py-2 text-[11px] font-semibold uppercase tracking-[.1em] text-outline">
                  <span>Team role</span>
                  <span>Access</span>
                </div>
                {roles.map(([role, roleLabel]) => {
                  const present = subject.roles.includes(role)
                  return (
                    <div
                      key={role}
                      className="flex items-center justify-between gap-3 border-t border-white/[.06] px-3 py-3"
                    >
                      <span className="min-w-0 text-sm font-medium capitalize text-on-surface">{roleLabel}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={present ? 'success' : 'outline'}>{present ? 'Granted' : 'Not assigned'}</Badge>
                        <Button
                          size="sm"
                          aria-label={`${present ? 'Revoke' : 'Grant'} ${roleLabel}`}
                          variant={present ? 'destructive' : 'secondary'}
                          disabled={!recentMfa || !validTarget || !validReason || busy !== ''}
                          loading={busy === role}
                          onClick={() => changeRole(role, present)}
                        >
                          {compact ? (present ? 'Revoke' : 'Grant') : `${present ? 'Revoke' : 'Grant'} ${roleLabel}`}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          {!compact && (
            <Card className="h-fit border-primary/10 bg-primary/[.025]">
              <CardHeader>
                <CardTitle className="text-base">Access change check</CardTitle>
                <CardDescription>The server checks every change again.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ['Exact account found', Boolean(subject?.userId)],
                  ['Not your own account', validTarget],
                  ['Recent MFA check', recentMfa],
                  ['Reason provided', validReason],
                ].map(([text, complete]) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm">
                    <Icon
                      name={complete ? 'check_circle' : 'radio_button_unchecked'}
                      className={complete ? 'text-success' : 'text-outline'}
                    />
                    <span className={complete ? 'text-on-surface-variant' : 'text-outline'}>{text}</span>
                  </div>
                ))}
                <div className="mt-4 rounded-lg border border-white/[.07] bg-background/60 p-3 text-xs leading-5 text-on-surface-variant">
                  Full administrator access cannot be granted here. Give only the team access needed for the job.
                </div>
                {message && (
                  <p
                    role="status"
                    className="rounded-lg border border-white/[.08] bg-background/70 p-3 text-sm text-on-surface-variant"
                  >
                    {message}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {compact && message && (
            <p role="status" className="admin-notice">
              {message}
            </p>
          )}
        </div>
      ) : !compact ? (
        <Card className="border-dashed border-white/[.12] bg-transparent">
          <CardContent className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[.08] bg-surface-container-low text-outline">
              <Icon name="person_search" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-on-surface">Find a staff account</h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-on-surface-variant">
              Search by a complete email address or account ID. You will see current access before you make a change.
            </p>
          </CardContent>
        </Card>
      ) : null}
      {message && !subject && (
        <p
          role="status"
          className="rounded-lg border border-white/[.08] bg-surface-container-low p-3 text-sm text-on-surface-variant"
        >
          {message}
        </p>
      )}
    </section>
  )
}
