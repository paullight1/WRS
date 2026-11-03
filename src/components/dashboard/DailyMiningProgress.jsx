import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardIcon from './DashboardIcon.jsx'

const DAY = 86400000
const duration = (milliseconds) => {
  const minutes = Math.floor(Math.max(0, milliseconds) / 60000)
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

export function MiningControl({ mining, hasRobot, robotLoading, loading, onStart, starting, error }) {
  if (mining?.session) return null
  return (
    <div className="dw-hero-mining">
      {robotLoading || loading ? (
        <span className="dw-mining-loading">Checking mining…</span>
      ) : !hasRobot ? (
        <Link className="dw-start-mining" to="/robot">
          <DashboardIcon name="robot" size={17} />
          Set up your robot
        </Link>
      ) : mining?.issuanceEnabled && mining?.eligibility?.eligible ? (
        <button type="button" className="dw-start-mining" onClick={onStart} disabled={starting || !onStart}>
          <DashboardIcon name="mine" size={17} />
          {starting ? 'Starting…' : 'Start mining'}
        </button>
      ) : (
        <Link className="dw-start-mining" to="/deploy">
          <DashboardIcon name="mine" size={17} />
          View mining
        </Link>
      )}
      {error && (
        <p className="dw-mining-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default function DailyMiningProgress({ data, mining, now, loading, error, onRefresh }) {
  const [selected, setSelected] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()
  const session = mining?.session
  const cycleStart = Date.parse(session?.startedAt)
  const cycleEnd = Date.parse(session?.endsAt)
  const clock = now ?? Date.parse(mining?.serverNow)
  const validCycle =
    ['active', 'ended'].includes(session?.status) &&
    Number.isFinite(cycleStart) &&
    Number.isFinite(cycleEnd) &&
    cycleEnd > cycleStart &&
    Number.isFinite(clock)
  const cycleProgress = validCycle
    ? Math.max(0, Math.min(100, Math.round(((clock - cycleStart) / (cycleEnd - cycleStart)) * 100)))
    : 0
  const cycleLabel = validCycle
    ? clock >= cycleEnd
      ? 'Cycle complete'
      : 'Current cycle'
    : mining && !session
      ? 'No active cycle'
      : loading
        ? 'Checking mining…'
        : 'Mining status unavailable'

  const days = (data?.days || []).map((day) => {
    const start = Date.parse(`${day.day}T00:00:00Z`)
    const active = mining?.session?.status === 'active' ? mining.session : null
    const since = active ? Math.max(Date.parse(data.serverNow), Date.parse(active.startedAt), start) : 0
    const until = active ? Math.min(now ?? Date.parse(data.serverNow), Date.parse(active.endsAt), start + DAY) : 0
    const live = Number.isFinite(since) && Number.isFinite(until) ? Math.max(0, until - since) : 0
    return { ...day, miningMilliseconds: Math.min(DAY, day.miningMilliseconds + live) }
  })
  const day = days.find((item) => item.day === selected) || days.at(-1)
  const maxTime = Math.max(3600000, ...days.map((item) => item.miningMilliseconds))
  const dateLabel = (value, options) =>
    new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...options })
  return (
    <section className="dw-panel dw-daily-progress" aria-label="Daily mining progress">
      <h2 className="dw-progress-heading">
        <button
          type="button"
          className="dw-progress-toggle"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded(!expanded)}
        >
          <span>Mining Progress</span>
          <DashboardIcon name="chevron" size={18} />
        </button>
      </h2>
      <div className="dw-progress-preview">
        <div className="dw-progress-preview-label">
          <span>{cycleLabel}</span>
          {validCycle && <strong>{cycleProgress}%</strong>}
        </div>
        <div
          className="dw-progress-preview-track"
          role="progressbar"
          aria-label="Current mining cycle"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={validCycle || (mining && !session) ? cycleProgress : undefined}
          aria-valuetext={validCycle ? `${cycleProgress}% complete` : cycleLabel}
        >
          <span style={{ width: `${cycleProgress}%` }} />
        </div>
      </div>
      <div id={contentId} hidden={!expanded}>
        <div className="dw-progress-tools">
          <button type="button" onClick={onRefresh} aria-label="Refresh mining progress">
            Refresh
            <DashboardIcon name="swap" size={13} />
          </button>
        </div>
        {loading && !data ? (
          <div className="dw-progress-loading" role="status">
            Loading your mining history…
          </div>
        ) : !data ? (
          <div className="dw-progress-loading" role="status">
            {error || 'Daily mining progress is unavailable.'}
          </div>
        ) : (
          <>
            <div className="dw-daily-summary">
              <div>
                <span>{day ? dateLabel(day.day, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Today'}</span>
                <strong>{duration(day?.miningMilliseconds || 0)}</strong>
                <small>Mining time</small>
              </div>
              <div>
                <span>Completed cycles</span>
                <strong>{day?.completedCycles || 0}</strong>
                <small>Recorded on this day</small>
              </div>
            </div>
            <div className="dw-week-chart" aria-label="Mining time for the last seven days">
              {days.map((item) => (
                <button
                  type="button"
                  key={item.day}
                  aria-pressed={day?.day === item.day}
                  aria-label={`${dateLabel(item.day, { weekday: 'long', month: 'short', day: 'numeric' })}: ${duration(item.miningMilliseconds)}, ${item.completedCycles} completed cycles`}
                  onClick={() => setSelected(item.day)}
                >
                  <span className="dw-day-bar-track">
                    <span
                      className={item.miningMilliseconds ? 'has-mining' : ''}
                      style={{ height: `${Math.max(4, (item.miningMilliseconds / maxTime) * 100)}%` }}
                    />
                  </span>
                  <span>{dateLabel(item.day, { weekday: 'short' })}</span>
                </button>
              ))}
            </div>
            <div className="dw-daily-caption">
              <span>Last 7 days · UTC</span>
              <Link to="/deploy">
                Mining details
                <DashboardIcon name="chevron" size={12} />
              </Link>
            </div>
            {error && (
              <p className="dw-inline-warning" role="status">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
