import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import MiningCyclePanel from '../components/mining/MiningCyclePanel.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, CoinMark, Icon, SectionTitle, Tabs } from '../components/ui.jsx'
import WorksitePoster from '../components/robot3d/WorksitePoster.jsx'
import { worksites } from '../data/worksites.js'
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
    'mining-not-configured':
      'Mining rewards are not configured yet. The cycle will be available when reward settings are activated.',
    'verified-contribution-required': 'Complete a verified activity to meet the current mining requirements.',
  }
  return reasons[code] || 'The server has not confirmed that mining can start yet.'
}

function currencyAmount(amount, scale) {
  if (typeof amount !== 'string' || !Number.isInteger(scale)) return null
  return atomicUnitsToDecimal(amount, scale)
}

function robotSlotProgress(value) {
  const earned = Number(value?.lifetimeMinedRbc)
  const threshold = Number(value?.thresholdRbc)
  if (!Number.isFinite(earned) || !Number.isFinite(threshold) || threshold <= 0) return null
  return {
    earned: Math.max(0, earned),
    threshold,
    unlocked: value.unlocked === true,
    percent: Math.max(0, Math.min(100, (earned / threshold) * 100)),
  }
}

export default function MiningProduction() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [tab, setTab] = useState(() => (pageTabs.includes(requestedTab) ? requestedTab : 'Available'))
  const [snapshot, setSnapshot] = useState(null)
  const [selectedRobotId, setSelectedRobotId] = useState('')
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

  const loadSnapshot = useCallback(
    async ({ quiet = false } = {}) => {
      if (quiet) setRefreshing(true)
      else setLoading(true)
      setError('')
      try {
        const next = await browserMiningClient.snapshot()
        setSnapshot(next)
        setSelectedRobotId((current) => {
          if (next.session && next.robots.some((robot) => robot.robotId === next.session.robotId))
            return next.session.robotId
          if (next.robots.some((robot) => robot.robotId === current && robot.unlocked)) return current
          return next.robots.find((robot) => robot.unlocked)?.robotId || ''
        })
        if (next.session && requestedTab !== 'Leaderboard') setTab('Active')
      } catch (reason) {
        setError(errorMessage(reason, 'Mining data could not be loaded.'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [requestedTab],
  )

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => active && loadSnapshot())
    return () => {
      active = false
    }
  }, [loadSnapshot])

  useEffect(() => {
    if (tab !== 'Leaderboard') return undefined
    let current = true
    queueMicrotask(() => {
      if (!current) return
      setLeaderboardLoading(true)
      setLeaderboardError('')
    })
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
  const currentSession = snapshot?.session || null
  const currentRobot = snapshot?.robots.find((robot) => robot.robotId === selectedRobotId)
  const slotProgress = robotSlotProgress(snapshot?.robotSlotProgress)
  const configuredRate = snapshot?.rateBreakdown?.estimatedAtomicPerHour
  const configuredScale = snapshot?.rateBreakdown?.atomicUnitScale
  const hasConfiguredRate =
    snapshot?.issuanceEnabled === true &&
    typeof configuredRate === 'string' &&
    /^\d+(?:\.\d+)?$/.test(configuredRate) &&
    Number.isInteger(configuredScale) &&
    configuredScale >= 0 &&
    configuredScale <= 12
  const canStart = Boolean(
    snapshot?.eligibility?.eligible &&
    snapshot.issuanceEnabled &&
    selectedRobotId &&
    currentRobot?.unlocked &&
    !currentSession &&
    !starting,
  )

  const start = async () => {
    setStarting(true)
    setActionError('')
    try {
      const next = await browserMiningClient.start({
        robotId: selectedRobotId,
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
      return <StateView kind="loading" title="Loading mining" desc="Checking your robot and mining status." />
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
          <section>
            <SectionTitle action={`${snapshot.robots.filter((robot) => robot.unlocked).length} unlocked · 1 per cycle`}>
              Choose your robot
            </SectionTitle>
            {slotProgress && !slotProgress.unlocked && (
              <div className="mb-4 rounded-xl border border-white/10 px-3 py-3">
                <div className="flex items-center justify-between gap-3 text-label-sm text-on-surface-variant">
                  <span>More robots at {slotProgress.threshold.toLocaleString()} mined RBC</span>
                  <span className="tnum shrink-0">
                    {slotProgress.earned.toLocaleString(undefined, { maximumFractionDigits: 2 })} /{' '}
                    {slotProgress.threshold.toLocaleString()}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Robot unlock progress"
                  aria-valuemin={0}
                  aria-valuemax={slotProgress.threshold}
                  aria-valuenow={Math.min(slotProgress.earned, slotProgress.threshold)}
                  className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"
                >
                  <div className="h-full bg-tertiary" style={{ width: `${slotProgress.percent}%` }} />
                </div>
              </div>
            )}
            {snapshot.robots.length ? (
              <div className="space-y-2">
                {snapshot.robots.map((robot) => {
                  const locked = !robot.unlocked
                  const assigned = currentSession?.robotId === robot.robotId
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
                      className={choiceButtonClass(
                        selectedRobotId === robot.robotId,
                        locked || (Boolean(currentSession) && !assigned),
                      )}
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-container/20 text-primary">
                        <Icon name="smart_toy" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-title font-semibold text-on-surface">{robot.name}</span>
                        <span className="mt-0.5 block text-body-sm text-on-surface-variant">
                          {locked
                            ? robot.unlockRequirement
                            : assigned
                              ? 'Assigned to your current mining cycle'
                              : 'Ready to mine for 24 hours'}
                        </span>
                      </span>
                      <Badge t={locked ? 'outline' : selectedRobotId === robot.robotId ? 'tertiary' : 'outline'}>
                        {locked
                          ? 'Locked'
                          : assigned
                            ? 'Mining'
                            : selectedRobotId === robot.robotId
                              ? 'Selected'
                              : 'Available'}
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

          <section aria-labelledby="mining-worksite-previews">
            <SectionTitle action="9 industries">
              <span id="mining-worksite-previews">Robots at work</span>
            </SectionTitle>
            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3">
              {Object.entries(worksites).map(([key, site]) => (
                <Card key={key} className="w-[min(72vw,15rem)] shrink-0 snap-start overflow-hidden p-0">
                  <div className="relative h-28 overflow-hidden">
                    <WorksitePoster site={site} />
                    <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white/80 backdrop-blur">
                      Preview
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="truncate text-title font-semibold text-on-surface">{site.name}</h3>
                    <p className="mt-1 min-h-10 text-label-sm text-on-surface-variant">{site.task}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {hasConfiguredRate && (
            <Card className="flex items-center gap-3 p-4">
              <CoinMark size={38} />
              <div>
                <p className="text-label-sm text-on-surface-variant">Configured mining rate</p>
                <p className="tnum text-title font-semibold text-on-surface">
                  {atomicRateToDecimal(configuredRate, configuredScale)
                    .replace(/(\.\d*?)0+$/, '$1')
                    .replace(/\.$/, '')}{' '}
                  RBC per hour
                </p>
              </div>
            </Card>
          )}

          {(!snapshot.eligibility.eligible || !snapshot.issuanceEnabled) && (
            <p
              role="status"
              className="rounded-xl border border-white/10 bg-surface-container px-4 py-3 text-body-sm text-on-surface-variant"
            >
              {!snapshot.issuanceEnabled
                ? 'Mining is disabled until an authorized operator activates a reward rule with a rate and issuance limits.'
                : summaryReason(snapshot.eligibility.reasonCodes?.[0])}
            </p>
          )}
          {actionError && (
            <p role="alert" className="text-body-sm text-error">
              {actionError}
            </p>
          )}
          {currentSession ? (
            <Button full size="lg" icon="arrow_forward" onClick={() => setTab('Active')}>
              View active cycle
            </Button>
          ) : snapshot.issuanceEnabled ? (
            <Button full size="lg" loading={starting} disabled={!canStart} icon="play_arrow" onClick={start}>
              Start mining
            </Button>
          ) : null}
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
              serverNow={snapshot.serverNow}
              onRefresh={() => loadSnapshot({ quiet: true })}
              refreshing={refreshing}
            />
          ) : (
            <StateView
              kind="empty"
              title="No active mining cycle"
              desc="Choose an available robot to start your next 24-hour cycle."
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
              <StateView
                kind="empty"
                size={92}
                title="No completed cycles yet"
                desc={
                  currentSession
                    ? 'Your first RoboCoin award is recorded after this 24-hour cycle settles.'
                    : 'Completed mining cycles will appear here after settlement.'
                }
                className="px-4 py-6"
              />
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
            desc="Settled mining awards from members who opted into public rankings will appear here. Choose a public alias in Community to join the leaderboard."
            action={
              <Button to="/community" variant="tonal">
                Choose public alias
              </Button>
            }
          />
        )}
      </div>
    )
  }

  return (
    <AppShell title="Mining" subtitle="Earn RoboCoin with your robot" wide>
      <Tabs items={pageTabs} value={tab} onChange={setTab} />
      {content()}
    </AppShell>
  )
}
