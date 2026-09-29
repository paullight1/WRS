import { useCallback, useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import MiningCyclePanel from '../components/mining/MiningCyclePanel.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, CoinMark, Icon, SectionTitle, Stat, Tabs } from '../components/ui.jsx'
import { atomicRateToDecimal, atomicUnitsToDecimal } from '../domain/mining/metrics.ts'
import { browserMiningClient } from '../infrastructure/mining/browserMiningClient.ts'

const pageTabs = ['Available', 'Active', 'Leaderboard']

function errorMessage(reason, fallback) {
  return reason instanceof Error ? reason.message : fallback
}

function choiceButtonClass(active, disabled = false) {
  return `flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
    disabled
      ? 'cursor-not-allowed border-white/8 bg-surface-container/50 opacity-60'
      : active
        ? 'border-primary/60 bg-primary-container/15'
        : 'border-white/10 bg-surface-container hover:border-white/20'
  }`
}

function summaryReason(code) {
  const reasons = {
    'robot-required': 'An active robot is required before you can start mining.',
    'robot-inactive': 'Your robot must be active to start mining.',
    'mining-not-configured': 'Mining is not configured for this account yet.',
    'verified-contribution-required': 'Complete a verified activity to meet the current mining requirements.',
  }
  return reasons[code] || 'The server has not confirmed that mining can start yet.'
}

function currencyAmount(amount, scale) {
  if (typeof amount !== 'string' || !Number.isInteger(scale)) return null
  return atomicUnitsToDecimal(amount, scale)
}

export default function MiningProduction() {
  const [tab, setTab] = useState('Available')
  const [snapshot, setSnapshot] = useState(null)
  const [selectedRobotId, setSelectedRobotId] = useState('')
  const [selectedWorksiteId, setSelectedWorksiteId] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('week')
  const [leaderboardReload, setLeaderboardReload] = useState(0)
  const [leaderboard, setLeaderboard] = useState(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState('')

  const loadSnapshot = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const next = await browserMiningClient.snapshot()
      setSnapshot(next)
      setSelectedRobotId((current) => {
        if (next.robots.some((robot) => robot.robotId === current && robot.unlocked)) return current
        return next.robots.find((robot) => robot.unlocked)?.robotId || ''
      })
      setSelectedWorksiteId((current) =>
        next.worksites.some((worksite) => worksite.worksiteId === current && worksite.available)
          ? current
          : next.worksites.find((worksite) => worksite.available)?.worksiteId || '',
      )
      if (next.session) setTab('Active')
    } catch (reason) {
      setError(errorMessage(reason, 'Mining data could not be loaded.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    if (tab !== 'Leaderboard') return undefined
    let current = true
    setLeaderboardLoading(true)
    setLeaderboardError('')
    browserMiningClient
      .leaderboard(leaderboardPeriod)
      .then((result) => {
        if (current) setLeaderboard(result)
      })
      .catch((reason) => {
        if (current) setLeaderboardError(errorMessage(reason, 'Mining leaderboard could not be loaded.'))
      })
      .finally(() => {
        if (current) setLeaderboardLoading(false)
      })
    return () => {
      current = false
    }
  }, [tab, leaderboardPeriod, leaderboardReload])

  const robotNames = useMemo(
    () => new Map((snapshot?.robots || []).map((robot) => [robot.robotId, robot.name])),
    [snapshot],
  )
  const worksiteNames = useMemo(
    () => new Map((snapshot?.worksites || []).map((worksite) => [worksite.worksiteId, worksite.name])),
    [snapshot],
  )
  const currentSession = snapshot?.session || null
  const balance = currencyAmount(snapshot?.balance?.availableAtomic, snapshot?.balance?.atomicScale)
  const averageRate = snapshot?.stats?.averageRateAtomicPerHour
  const rateScale = snapshot?.stats?.atomicScale
  const currentRobot = snapshot?.robots.find((robot) => robot.robotId === selectedRobotId)
  const currentWorksite = snapshot?.worksites.find((worksite) => worksite.worksiteId === selectedWorksiteId)
  const configuredRate = snapshot?.rateBreakdown?.estimatedAtomicPerHour
  const configuredScale = snapshot?.rateBreakdown?.atomicUnitScale
  const canStart = Boolean(
    snapshot?.eligibility?.eligible &&
    snapshot.issuanceEnabled &&
    selectedRobotId &&
    currentRobot?.unlocked &&
    selectedWorksiteId &&
    currentWorksite?.available &&
    !currentSession &&
    !starting,
  )

  const start = async () => {
    setStarting(true)
    setActionError('')
    try {
      const next = await browserMiningClient.start({
        robotId: selectedRobotId,
        worksiteId: selectedWorksiteId,
        idempotencyKey: `mining-cycle:${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      })
      setSnapshot(next)
      setTab('Active')
    } catch (reason) {
      setActionError(errorMessage(reason, 'The mining cycle could not start.'))
      await loadSnapshot({ quiet: true })
    } finally {
      setStarting(false)
    }
  }

  const content = () => {
    if (loading)
      return <StateView kind="loading" title="Loading mining" desc="Checking your robot, worksite and mining status." />
    if (error || !snapshot) {
      return (
        <StateView
          kind="error"
          title="Mining data unavailable"
          desc={error || 'Mining status could not be confirmed.'}
          action={<Button onClick={() => loadSnapshot()}>Retry</Button>}
        />
      )
    }

    if (tab === 'Available') {
      return (
        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <CoinMark size={42} />
              <div>
                <h2 className="text-title font-semibold text-on-surface">One robot, one worksite, one 24-hour cycle</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Choose an unlocked robot and an approved worksite. Your configured rate is confirmed by the server
                  before the cycle begins.
                </p>
              </div>
            </div>
          </Card>

          <section>
            <SectionTitle action={`${snapshot.robots.length} owned`}>Choose your robot</SectionTitle>
            {snapshot.robots.length ? (
              <div className="space-y-2">
                {snapshot.robots.map((robot) => {
                  const locked = !robot.unlocked
                  const disabled = locked || Boolean(currentSession)
                  return (
                    <button
                      key={robot.robotId}
                      type="button"
                      role="radio"
                      aria-checked={selectedRobotId === robot.robotId}
                      aria-label={`${robot.name}${locked ? `, locked: ${robot.unlockRequirement}` : ''}`}
                      disabled={disabled}
                      onClick={() => setSelectedRobotId(robot.robotId)}
                      className={choiceButtonClass(selectedRobotId === robot.robotId, disabled)}
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-container/20 text-primary">
                        <Icon name="smart_toy" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-title font-semibold text-on-surface">{robot.name}</span>
                        <span className="mt-0.5 block text-body-sm text-on-surface-variant">
                          {locked ? robot.unlockRequirement : 'Ready to mine'}
                        </span>
                      </span>
                      <Badge t={locked ? 'outline' : selectedRobotId === robot.robotId ? 'tertiary' : 'outline'}>
                        {locked ? 'Locked' : selectedRobotId === robot.robotId ? 'Selected' : 'Available'}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            ) : (
              <StateView
                kind="empty"
                title="No owned robot yet"
                desc="An active robot will appear here when it is available to your account."
              />
            )}
          </section>

          <section>
            <SectionTitle action={`${snapshot.worksites.length} approved`}>Choose a worksite</SectionTitle>
            {snapshot.worksites.length ? (
              <div className="space-y-2">
                {snapshot.worksites.map((worksite) => (
                  <button
                    key={worksite.worksiteId}
                    type="button"
                    role="radio"
                    aria-checked={selectedWorksiteId === worksite.worksiteId}
                    disabled={Boolean(currentSession)}
                    onClick={() => setSelectedWorksiteId(worksite.worksiteId)}
                    className={choiceButtonClass(selectedWorksiteId === worksite.worksiteId, Boolean(currentSession))}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tertiary/15 text-tertiary">
                      <Icon name="location_on" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-title font-semibold text-on-surface">{worksite.name}</span>
                      {worksite.description && (
                        <span className="mt-0.5 block text-body-sm text-on-surface-variant">
                          {worksite.description}
                        </span>
                      )}
                    </span>
                    {selectedWorksiteId === worksite.worksiteId && <Badge>Selected</Badge>}
                  </button>
                ))}
              </div>
            ) : (
              <StateView
                kind="empty"
                title="No approved worksites yet"
                desc="A worksite will appear here after it is approved for mining."
              />
            )}
          </section>

          {configuredRate !== null &&
            configuredRate !== undefined &&
            configuredScale !== null &&
            configuredScale !== undefined && (
              <Card className="flex items-center gap-3 p-4">
                <CoinMark size={38} />
                <div>
                  <p className="text-label-sm text-on-surface-variant">Configured mining rate</p>
                  <p className="tnum text-title font-semibold text-on-surface">
                    {atomicRateToDecimal(String(configuredRate), Number(configuredScale))} RBC per hour
                  </p>
                </div>
              </Card>
            )}

          {!snapshot.eligibility.eligible && (
            <p
              role="status"
              className="rounded-xl border border-white/10 bg-surface-container px-4 py-3 text-body-sm text-on-surface-variant"
            >
              {summaryReason(snapshot.eligibility.reasonCodes?.[0])}
            </p>
          )}
          {actionError && (
            <p role="alert" className="text-body-sm text-error">
              {actionError}
            </p>
          )}
          <Button full size="lg" loading={starting} disabled={!canStart} icon="play_arrow" onClick={start}>
            Start 24-hour mining cycle
          </Button>
        </div>
      )
    }

    if (tab === 'Active') {
      const settled = snapshot.recentSessions.filter((session) => session.status === 'settled')
      return (
        <div className="space-y-6">
          {currentSession ? (
            <MiningCyclePanel
              session={currentSession}
              robotName={robotNames.get(currentSession.robotId)}
              worksiteName={worksiteNames.get(currentSession.worksiteId)}
              serverNow={snapshot.serverNow}
              onRefresh={() => loadSnapshot({ quiet: true })}
              refreshing={refreshing}
            />
          ) : (
            <StateView
              kind="empty"
              title="No active mining cycle"
              desc="Choose an available robot and worksite to start your next 24-hour cycle."
            />
          )}
          <section>
            <SectionTitle action={`${settled.length} settled`}>Recent mining cycles</SectionTitle>
            {settled.length ? (
              <div className="surface divide-hairline overflow-hidden rounded-2xl">
                {settled.map((session) => (
                  <div key={session.id} className="flex items-center gap-3 px-4 py-3.5">
                    <CoinMark size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-title text-on-surface">
                        {robotNames.get(session.robotId) || 'Robot'}
                      </p>
                      <p className="truncate text-body-sm text-on-surface-variant">
                        {worksiteNames.get(session.worksiteId) || 'Worksite'} ·{' '}
                        {new Date(session.settledAt || session.endsAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="tnum text-right text-title font-semibold text-tertiary">
                      +{currencyAmount(session.estimatedAwardAtomic, session.rule?.atomicUnitScale) ?? '—'} RBC
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant">Settled cycles will appear here.</p>
            )}
          </section>
        </div>
      )
    }

    return (
      <div className="space-y-5">
        <div className="flex gap-2">
          <Button
            variant={leaderboardPeriod === 'week' ? 'primary' : 'quiet'}
            onClick={() => setLeaderboardPeriod('week')}
          >
            This week
          </Button>
          <Button
            variant={leaderboardPeriod === 'all-time' ? 'primary' : 'quiet'}
            onClick={() => setLeaderboardPeriod('all-time')}
          >
            All time
          </Button>
        </div>
        {leaderboardLoading ? (
          <StateView kind="loading" title="Loading leaderboard" desc="Reading settled RoboCoin awards." />
        ) : leaderboardError ? (
          <StateView
            kind="error"
            title="Leaderboard unavailable"
            desc={leaderboardError}
            action={<Button onClick={() => setLeaderboardReload((value) => value + 1)}>Retry</Button>}
          />
        ) : leaderboard?.rows?.length ? (
          <div className="surface divide-hairline overflow-hidden rounded-2xl">
            {leaderboard.rows.map((row) => (
              <div key={`${row.rank}-${row.memberHandle}`} className="flex items-center gap-3 px-4 py-3.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-container/20 font-data text-data-sm text-primary">
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-title text-on-surface">{row.memberHandle}</span>
                <span className="tnum text-title font-semibold text-on-surface">
                  {currencyAmount(row.earnedAtomic, row.atomicScale)} RBC
                </span>
              </div>
            ))}
          </div>
        ) : (
          <StateView
            kind="empty"
            title="No settled awards yet"
            desc="No settled mining awards are available for this period."
          />
        )}
        <p className="text-label-sm text-on-surface-variant">
          Rankings include settled awards shared by members using a public handle.
        </p>
      </div>
    )
  }

  return (
    <AppShell title="Mining" subtitle="Earn RoboCoin through verified robot work" wide>
      {snapshot && !loading && !error && (
        <section aria-label="Mining summary" className="grid grid-cols-3 gap-2.5">
          <Stat label="Active robots" value={snapshot.stats.activeRobots} t="tertiary" icon="smart_toy" />
          <Stat
            label="Mining time"
            value={`${(snapshot.stats.miningMilliseconds / 3_600_000).toFixed(1)} h`}
            icon="schedule"
          />
          <Stat
            label="Average rate"
            value={
              averageRate !== null && rateScale !== null ? `${atomicRateToDecimal(averageRate, rateScale)} RBC/h` : '—'
            }
            t="secondary"
            icon="trending_up"
          />
        </section>
      )}
      {snapshot && !loading && !error && (
        <Card className="flex items-center gap-3 p-4">
          <CoinMark size={42} />
          <div className="min-w-0 flex-1">
            <p className="text-label-sm text-on-surface-variant">Available RoboCoin</p>
            <p className="tnum text-headline-md font-semibold text-on-surface">
              {balance === null ? 'Unavailable' : `${balance} RBC`}
            </p>
          </div>
          <Button
            variant="quiet"
            onClick={() => loadSnapshot({ quiet: true })}
            loading={refreshing}
            aria-label="Refresh mining status"
          >
            <Icon name="refresh" />
          </Button>
        </Card>
      )}
      <Tabs items={pageTabs} value={tab} onChange={setTab} />
      {content()}
    </AppShell>
  )
}
