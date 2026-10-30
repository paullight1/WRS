import { apiUrl } from '../../../src/infrastructure/http/apiUrl.ts'
import { displayValue, fieldLabel, humanize } from '../lib/operations.js'
import SupportConversation from './SupportConversation.jsx'
import { COLLECTIONS } from '../lib/collections.js'

export function ContentValue({ value, depth = 0 }) {
  if (value === null || value === undefined || value === '') return <span>Not provided</span>
  if (typeof value !== 'object')
    return <p className="admin-content-text">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</p>
  if (depth > 4) return <p className="admin-content-text">{JSON.stringify(value)}</p>
  return (
    <dl className="admin-answer-fields">
      {Object.entries(value).map(([key, item]) => (
        <div key={key}>
          <dt>{Array.isArray(value) ? `Answer ${Number(key) + 1}` : fieldLabel(key)}</dt>
          <dd>
            <ContentValue value={item} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function RecordCell({ group, field, row, primary }) {
  const isName = ['full_name', 'user_name', 'referred_name', 'referrer_name'].includes(field)
  const value = field === 'full_name' ? row.full_name || row.normalized_email : row[field]
  const email = {
    full_name: row.normalized_email,
    user_name: row.user_email,
    referred_name: row.referred_email,
    referrer_name: row.referrer_email,
  }[field]
  if (isName)
    return (
      <div className="admin-person">
        <span className="admin-person-avatar" aria-hidden="true">
          {String(value || '?')[0].toUpperCase()}
        </span>
        <span>
          <strong>{value || 'Name unavailable'}</strong>
          <small>{email || 'Email unavailable'}</small>
        </span>
      </div>
    )
  const missing =
    field === 'job_title'
      ? 'Job details unavailable'
      : field === 'robot_name'
        ? 'Robot details unavailable'
        : field === 'target_name'
          ? humanize(row.target_type || 'Community content')
          : '—'
  return (
    <span className={primary ? 'admin-record-primary' : ''}>
      {primary ? (
        <strong>
          {value === null || value === undefined || value === '' ? missing : displayValue(field, value, row)}
        </strong>
      ) : value === null || value === undefined || value === '' ? (
        missing
      ) : (
        displayValue(field, value, row)
      )}
      {primary && row.id && <small className="admin-short-reference">{String(row.id).slice(0, 8)}</small>}
      {field === 'job_title' && row.robot_name && group === 'settlements' && (
        <small className="admin-short-reference">{row.robot_name}</small>
      )}
    </span>
  )
}

export default function RecordContent({ group, row }) {
  const fields =
    group === 'users'
      ? [
          'full_name',
          'normalized_email',
          'kyc_status',
          'country_code',
          'status',
          'email_verified_at',
          'phone_verified_at',
          'created_at',
          'updated_at',
        ]
      : COLLECTIONS[group]?.fields || []
  return (
    <>
      <dl className="admin-detail-fields">
        {fields
          .filter((key) => row[key] !== null && row[key] !== undefined && row[key] !== '')
          .map((key) => (
            <div key={key}>
              <dt>{key === 'created_at' && group !== 'users' ? 'Created' : fieldLabel(key)}</dt>
              <dd>{displayValue(key, row[key], row)}</dd>
            </div>
          ))}
      </dl>
      {group === 'support' && <SupportConversation key={row.id} row={row} />}
      {group === 'taskResponses' && (
        <section className="admin-record-content" aria-label="Submitted answer">
          <h3>Submitted answer</h3>
          <ContentValue value={row.response} />
        </section>
      )}
      {group === 'submissions' && (
        <section className="admin-record-content">
          <h3>Submitted file</h3>
          {row.asset_id && row.scan_status === 'clean' && row.status !== 'deleted' ? (
            <a
              className="admin-btn"
              target="_blank"
              rel="noopener noreferrer"
              href={apiUrl(`/api/admin/data-file?assetId=${encodeURIComponent(row.asset_id)}`)}
            >
              Open submitted file <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <p className="admin-muted">
              {row.scan_status === 'pending'
                ? 'The file safety check is still running.'
                : row.scan_status && row.scan_status !== 'clean'
                  ? 'This file has not passed the safety check.'
                  : 'The submitted file is not available.'}
            </p>
          )}
          {row.submission_metadata && Object.keys(row.submission_metadata).length > 0 && (
            <ContentValue value={row.submission_metadata} />
          )}
        </section>
      )}
      {group === 'moderation' && row.target_content && (
        <section className="admin-record-content">
          <h3>Content being reviewed</h3>
          <ContentValue value={row.target_content} />
        </section>
      )}
      {COLLECTIONS[group]?.note && <p className="admin-record-note">{COLLECTIONS[group].note}</p>}
    </>
  )
}
