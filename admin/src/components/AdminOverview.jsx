import SupplyProgress from './SupplyProgress.jsx'
import { humanize, METRICS, metricPage, POLICY_STATES } from '../lib/operations.js'

const sections = [
  [
    'finance',
    'Money',
    [
      ['payments_total', 'Payments', 'payments'],
      ['payments_paid', 'Successful payments', 'payments'],
      ['withdrawals_total', 'Withdrawals', 'withdrawals'],
      ['withdrawals_paid', 'Withdrawals paid', 'withdrawals'],
      ['payouts_paid', 'Jobs paid', 'settlements'],
    ],
  ],
  [
    'deployments',
    'Robots & jobs',
    [
      ['robots_total', 'Robots'],
      ['robots_active', 'Active robots'],
      ['requests_total', 'Job requests', 'deploymentRequests'],
      ['jobs_total', 'Assigned jobs', 'deployments'],
      ['jobs_active', 'Ongoing jobs', 'deployments'],
      ['jobs_completed', 'Completed jobs', 'deployments'],
    ],
  ],
  [
    'data',
    'Data & training',
    [
      ['submissions_total', 'Data submissions', 'submissions'],
      ['submissions_approved', 'Approved submissions', 'submissions'],
      ['training_total', 'Training answers', 'taskResponses'],
      ['training_approved', 'Approved answers', 'taskResponses'],
      ['deletions_total', 'Deletion requests', 'deletions'],
    ],
  ],
  [
    'support',
    'Support',
    [
      ['support_total', 'All tickets', 'support'],
      ['support_finished', 'Finished tickets', 'support'],
    ],
  ],
  [
    'risk',
    'Community',
    [
      ['referrals_total', 'Referrals', 'referrals'],
      ['referrals_approved', 'Approved referrals', 'referrals'],
      ['community_reviews_total', 'Community reviews', 'moderation'],
    ],
  ],
]

export default function AdminOverview({ summary, loading, areas, onOpen, onRetry }) {
  const allowed = new Set(areas.map((area) => area.key))
  const totals = new Map((summary?.totals || []).filter((row) => allowed.has(row.scope)).map((row) => [row.key, row]))
  const metrics = (summary?.metrics || []).filter((row) => allowed.has(row.scope))
  const waiting = metrics.filter(
    (row) => row.key !== 'reward_policy' && (row.status === 'unavailable' || row.value > 0),
  )
  const reward = metrics.find((row) => row.key === 'reward_policy')
  const people = summary?.recentUsers
  const count = (key) => {
    const row = totals.get(key)
    return loading && !row
      ? '—'
      : row?.status === 'ready' && Number.isSafeInteger(row.value)
        ? row.value.toLocaleString()
        : 'Unavailable'
  }
  const incomplete =
    summary &&
    ((summary.totals || []).some((row) => allowed.has(row.scope) && row.status === 'unavailable') ||
      metrics.some((row) => row.status === 'unavailable') ||
      (allowed.has('users') && people === null))
  return (
    <div className="admin-overview">
      <div className="admin-overview-intro">
        <div>
          <h1>At a glance</h1>
          <p>Users, activity and work waiting for review.</p>
        </div>
        <span className="admin-today">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>
      {incomplete && !loading && (
        <div className="admin-overview-retry" role="status">
          <span>Some information could not be loaded.</span>
          <button className="admin-btn admin-btn-small" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
      {allowed.has('users') && (
        <section className="admin-overview-people" aria-label="Users overview">
          <div className="admin-section-heading">
            <h2>Users</h2>
            <button className="admin-overview-link" onClick={() => onOpen('users', 'users')}>
              View all users <span aria-hidden="true">↗</span>
            </button>
          </div>
          <dl className="admin-overview-user-totals" aria-label="User totals">
            {[
              ['users_total', 'Total users'],
              ['users_active', 'Active'],
              ['users_pending', 'Pending'],
              ['users_suspended', 'Suspended'],
            ].map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{count(key)}</dd>
              </div>
            ))}
          </dl>
          <div className="admin-overview-recent">
            <h3>Recently joined</h3>
            {loading && !people ? (
              <p role="status">Loading users…</p>
            ) : !Array.isArray(people) ? (
              <p>Recent users are unavailable.</p>
            ) : people.length ? (
              <ul aria-label="Recently joined users">
                {people.map((user) => (
                  <li key={user.user_id}>
                    <span className="admin-overview-user-name">
                      <strong>{user.full_name || 'Name not added'}</strong>
                      <small>{user.normalized_email || 'Email unavailable'}</small>
                    </span>
                    <span className="admin-overview-user-status">{humanize(user.status)}</span>
                    <time dateTime={user.created_at}>
                      {user.created_at && !Number.isNaN(new Date(user.created_at).getTime())
                        ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : '—'}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No users yet.</p>
            )}
          </div>
        </section>
      )}
      {sections.some(([scope]) => allowed.has(scope)) && (
        <section aria-label="System totals">
          <div className="admin-section-heading">
            <h2>Across the system</h2>
          </div>
          <div className="admin-overview-summaries">
            {sections
              .filter(([scope]) => allowed.has(scope))
              .map(([scope, title, items]) => (
                <section className="admin-overview-summary" key={scope} aria-label={title}>
                  <h3>{title}</h3>
                  {items.map(([key, label, page]) =>
                    page ? (
                      <button className="admin-overview-total-row" key={key} onClick={() => onOpen(scope, page)}>
                        <span>{label}</span>
                        <strong>{count(key)}</strong>
                      </button>
                    ) : (
                      <div className="admin-overview-total-row" key={key}>
                        <span>{label}</span>
                        <strong>{count(key)}</strong>
                      </div>
                    ),
                  )}
                </section>
              ))}
            {allowed.has('access') && (
              <section className="admin-overview-summary" aria-label="Team access">
                <h3>Team access</h3>
                <button className="admin-overview-link" onClick={() => onOpen('access')}>
                  Open staff directory <span aria-hidden="true">↗</span>
                </button>
              </section>
            )}
          </div>
        </section>
      )}
      <section aria-label="Work waiting for review">
        <div className="admin-section-heading">
          <h2>Needs attention</h2>
        </div>
        {loading && !summary ? (
          <p role="status">Loading pending work…</p>
        ) : waiting.length ? (
          <div className="admin-overview-waiting">
            {waiting.map((metric) => (
              <button key={metric.key} onClick={() => onOpen(metric.scope, metricPage(metric.key))}>
                <span>{METRICS[metric.key] || 'Pending work'}</span>
                <strong>{metric.status === 'unavailable' ? 'Unavailable' : metric.value.toLocaleString()}</strong>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="admin-muted">{summary ? 'Nothing waiting for review.' : 'Pending work is unavailable.'}</p>
        )}
      </section>
      {allowed.has('rewards') && (
        <section aria-label="Rewards overview">
          <div className="admin-section-heading">
            <h2>Rewards</h2>
            <span>
              {reward?.status === 'ready'
                ? POLICY_STATES[reward.value] || 'Unavailable'
                : loading
                  ? 'Loading…'
                  : 'Unavailable'}
            </span>
          </div>
          <SupplyProgress issuance={summary?.issuance} loading={loading} onOpen={() => onOpen('rewards')} />
        </section>
      )}
    </div>
  )
}
