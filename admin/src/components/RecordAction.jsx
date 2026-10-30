import { useState } from 'react'
import { useAuth } from '../../../src/components/auth/AuthProvider.jsx'
import { browserAccountClient } from '../../../src/infrastructure/account/browserAccountClient.ts'
import { hasRecentMfa } from '../../../src/domain/auth/policy.ts'
import { QUALITY_FIELDS, humanize, recordActions } from '../lib/operations.js'
import MfaPrompt from './MfaPrompt.jsx'

function Field({ label, name, children, ...props }) {
  const id = `action-${name}`
  return (
    <label className="admin-field" htmlFor={id}>
      <span>{label}</span>
      {children ? (
        <select id={id} {...props}>
          {children}
        </select>
      ) : (
        <input id={id} {...props} />
      )}
    </label>
  )
}
export default function RecordAction({ group, row, onSaved, onBusyChange }) {
  const auth = useAuth()
  const actions = recordActions(group, auth.session?.roles || [], row)
  const [chosen, setChosen] = useState('')
  const [values, setValues] = useState({})
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [key, action] = actions.find(([name]) => name === chosen) || actions[0] || []
  if (!action) return <p className="admin-readonly">This record is view-only</p>
  const target = action.fields.map((field) => row[field]).find(Boolean)
  const recentMfa = hasRecentMfa(auth.session)
  const value = (name, fallback = '') => values[name] ?? fallback
  const update = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))
  const scoreValid = (name) =>
    String(value(name)).trim() !== '' &&
    Number.isFinite(Number(value(name))) &&
    Number(value(name)) >= 0 &&
    Number(value(name)) <= 100
  const valid =
    target &&
    reason.trim().length >= 3 &&
    reason.trim().length <= 1000 &&
    (!action.mfa || recentMfa) &&
    (key !== 'data.review' ||
      ((!row.asset_id || row.scan_status === 'clean') && Object.keys(QUALITY_FIELDS).every(scoreValid))) &&
    (key !== 'data.task.review' ||
      (scoreValid('qualityScore') &&
        (value('status', 'approved') !== 'approved' || Number(value('qualityScore')) >= 80))) &&
    (key !== 'referral.qualify' || !row.eligibility_status || row.eligibility_status === 'ready') &&
    (key !== 'community.moderate' || (row.target_type && value('moderationAction').trim()))
  async function submit(event) {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    onBusyChange(true)
    setError('')
    const payload = { action: key, [action.target]: target, reason: reason.trim() }
    if (key === 'kyc.set') payload.kycStatus = value('kycStatus', row.kyc_status || 'pending')
    if (key === 'support.update')
      Object.assign(payload, {
        status: value('status', row.status || 'in_progress'),
        priority: value('priority', row.priority || 'normal'),
        message: value('message'),
      })
    if (key === 'data.review')
      Object.assign(
        payload,
        Object.fromEntries(Object.keys(QUALITY_FIELDS).map((name) => [name, Number(value(name))])),
        { notes: value('notes') },
      )
    if (key === 'data.task.review')
      Object.assign(payload, { status: value('status', 'approved'), qualityScore: Number(value('qualityScore')) })
    if (key === 'community.moderate')
      Object.assign(payload, { targetType: row.target_type, moderationAction: value('moderationAction').trim() })
    try {
      await browserAccountClient.operationsAction(payload)
      await onSaved(action.success)
    } catch (failure) {
      setError(failure.message || 'The change could not be saved.')
    } finally {
      setBusy(false)
      onBusyChange(false)
    }
  }
  const select = (label, name, items, fallback) => (
    <Field label={label} name={name} value={value(name, fallback)} onChange={update(name)}>
      {items.map((item) => (
        <option key={item} value={item}>
          {humanize(item)}
        </option>
      ))}
    </Field>
  )
  return (
    <section className="admin-action-form">
      <div className="admin-detail-heading">
        <h3>{actions.length > 1 ? 'Make a change' : action.label}</h3>
        <span>Changes are saved to the activity log</span>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {actions.length > 1 && (
            <Field
              label="Action"
              name="type"
              value={key}
              onChange={(event) => {
                setChosen(event.target.value)
                setValues({})
                setError('')
              }}
            >
              {actions.map(([name, item]) => (
                <option key={name} value={name}>
                  {item.label}
                </option>
              ))}
            </Field>
          )}
          {key === 'kyc.set' &&
            select(
              'Identity check status',
              'kycStatus',
              ['unverified', 'pending', 'verified', 'rejected'],
              row.kyc_status || 'pending',
            )}
          {key === 'support.update' && (
            <>
              {select(
                'Ticket status',
                'status',
                ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'],
                row.status || 'in_progress',
              )}
              {select('Priority', 'priority', ['low', 'normal', 'high', 'urgent'], row.priority || 'normal')}
              <Field
                label="Reply to user (optional)"
                name="message"
                value={value('message')}
                onChange={update('message')}
                maxLength={10000}
              />
            </>
          )}
          {key === 'data.review' && (
            <>
              <p className="admin-muted">Score each check from 0 to 100. The rules score must be 100 for approval.</p>
              <div className="admin-score-grid">
                {Object.entries(QUALITY_FIELDS).map(([name, label]) => (
                  <Field
                    key={name}
                    label={label}
                    name={name}
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    required
                    value={value(name)}
                    onChange={update(name)}
                  />
                ))}
              </div>
              <Field
                label="Review notes (optional)"
                name="notes"
                value={value('notes')}
                onChange={update('notes')}
                maxLength={2000}
              />
            </>
          )}
          {key === 'data.task.review' && (
            <>
              {select('Decision', 'status', ['approved', 'rejected'], 'approved')}
              <Field
                label="Quality score"
                name="qualityScore"
                type="number"
                min="0"
                max="100"
                step="any"
                required
                value={value('qualityScore')}
                onChange={update('qualityScore')}
              />
              <p className="admin-muted">Approval requires a score of at least 80.</p>
            </>
          )}
          {key === 'community.moderate' && (
            <>
              <p className="admin-muted">Add an outcome to the review history.</p>
              <Field
                label="Review outcome"
                name="moderationAction"
                value={value('moderationAction')}
                onChange={update('moderationAction')}
                required
                maxLength={100}
              />
            </>
          )}
          {key === 'referral.qualify' && (
            <p className="admin-muted">
              {row.eligibility_reason || 'The invited user needs an active account and a verified email.'}
            </p>
          )}
          {key === 'deployment.settle' && (
            <p className="admin-muted">Create a payout from the approved work records.</p>
          )}
          {key === 'deployment.match' && <p className="admin-muted">Assign this robot to the requested job.</p>}
          <Field
            label="Reason for change"
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={3}
            maxLength={1000}
            placeholder="Why is this change needed?"
            required
          />
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          <button
            className={`admin-btn admin-btn-primary ${action.destructive ? 'admin-btn-danger' : ''}`}
            disabled={!valid || busy}
          >
            {busy ? 'Saving…' : action.submit}
          </button>
        </fieldset>
      </form>
      {action.mfa && !recentMfa && <MfaPrompt />}
    </section>
  )
}
