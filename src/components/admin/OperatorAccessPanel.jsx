import { useRef, useState } from 'react'
import { browserAccountClient } from '../../infrastructure/account/browserAccountClient.ts'
import { Icon } from '../ui.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.jsx'
import { Input } from '../ui/input.jsx'

const roles = [
  ['support_operator', 'support operator'],
  ['kyc_operator', 'KYC operator'],
  ['finance_operator', 'finance operator'],
  ['data_operator', 'data operator'],
  ['deployment_operator', 'deployment operator'],
  ['risk_operator', 'risk operator'],
  ['reward_operator', 'reward operator'],
]
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const email = /^[^\s@*%]+@[^\s@*%]+\.[^\s@*%]+$/
const exactIdentifier = (value) => value.length <= 320 && (uuid.test(value) || email.test(value))

export default function OperatorAccessPanel({ recentMfa, actorUserId }) {
  const [identifier, setIdentifier] = useState('')
  const [subject, setSubject] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const requestId = useRef(0)
  const query = identifier.trim()
  const validTarget = Boolean(
    subject && uuid.test(subject.userId) && subject.userId.toLowerCase() !== actorUserId?.toLowerCase(),
  )
  const validReason = reason.trim().length >= 3 && reason.trim().length <= 1000
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

  const search = async (event) => {
    event.preventDefault()
    if (!exactIdentifier(query)) return
    const currentRequest = ++requestId.current
    setSubject(null)
    setBusy('search')
    setMessage('Searching for the exact account…')
    try {
      const result = await browserAccountClient.roleSubject(query)
      if (requestId.current !== currentRequest) return
      if (!result?.userId || !Array.isArray(result.roles)) throw new Error('Account lookup returned an invalid target.')
      setSubject(result)
      setMessage('')
    } catch (error) {
      if (requestId.current === currentRequest)
        setMessage(error instanceof Error ? error.message : 'Account lookup failed.')
    } finally {
      if (requestId.current === currentRequest) setBusy('')
    }
  }

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
      setMessage('Role change saved. Refreshing current roles…')
      try {
        const refreshed = await browserAccountClient.roleSubject(query)
        if (
          !refreshed?.userId ||
          refreshed.userId.toLowerCase() !== subject.userId.toLowerCase() ||
          !Array.isArray(refreshed.roles)
        ) {
          throw new Error('The account could not be refreshed. Search again.')
        }
        setSubject(refreshed)
        setMessage('Role change saved. Current roles were refreshed.')
      } catch (error) {
        setMessage(
          error instanceof Error
            ? `Role change saved, but refresh failed: ${error.message}`
            : 'Role change saved, but refresh failed. Search again.',
        )
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Role change failed.')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Operator access</CardTitle>
            <CardDescription>
              Find one account by exact email or UUID, then manage its scoped permissions.
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
                Exact account email or UUID
              </label>
              <Input
                id="operator-exact-identifier"
                value={identifier}
                onChange={updateIdentifier}
                maxLength={320}
                autoComplete="off"
                disabled={busy !== ''}
                placeholder="name@example.com or account UUID"
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.9fr)]">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Account permissions</CardTitle>
                  <CardDescription className="mt-1">
                    Changes apply immediately and are added to the audit trail.
                  </CardDescription>
                </div>
                <Badge variant={validTarget ? 'success' : 'destructive'}>
                  {validTarget ? 'Verified target' : 'Invalid target'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-white/[.08] bg-background/70 p-4">
                <p className="break-all text-sm font-semibold text-on-surface">{subject.identifier}</p>
                <p className="mt-1 break-all font-data text-[11px] text-outline">{subject.userId}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs text-outline">Current access</span>
                  {subject.roles.length ? (
                    subject.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role.replace('_', ' ')}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">No operator roles</Badge>
                  )}
                </div>
              </div>

              {field('Reason for access change', reason, (event) => setReason(event.target.value), {
                maxLength: 1000,
                disabled: busy !== '',
                placeholder: 'Why does this account need the selected role?',
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
                  Recent MFA is required to change operator access.
                </p>
              )}
              <div className="overflow-hidden rounded-lg border border-white/[.08]">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-white/[.025] px-3 py-2 text-[11px] font-semibold uppercase tracking-[.1em] text-outline">
                  <span>Scoped role</span>
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
                          variant={present ? 'destructive' : 'secondary'}
                          disabled={!recentMfa || !validTarget || !validReason || busy !== ''}
                          loading={busy === role}
                          onClick={() => changeRole(role, present)}
                        >
                          {present ? 'Revoke' : 'Grant'} {roleLabel}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="h-fit border-primary/10 bg-primary/[.025]">
            <CardHeader>
              <CardTitle className="text-base">Access change checklist</CardTitle>
              <CardDescription>Every update is validated again by the server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ['Exact account lookup', Boolean(subject?.userId)],
                ['Self-change prevention', validTarget],
                ['Recent MFA proof', recentMfa],
                ['Audit reason provided', validReason],
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
                Full administrator access cannot be granted from this panel. Assign only the operator scope needed for
                the role.
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
        </div>
      ) : (
        <Card className="border-dashed border-white/[.12] bg-transparent">
          <CardContent className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[.08] bg-surface-container-low text-outline">
              <Icon name="person_search" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-on-surface">Find an operator account</h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-on-surface-variant">
              Search by a complete email address or account UUID. The panel will show current roles before you make a
              change.
            </p>
          </CardContent>
        </Card>
      )}
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
