import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import RobotSetupPanel from '../components/robot/RobotSetupPanel.jsx'
import WelcomeModal, { consumeWelcome } from '../components/WelcomeModal.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import StateView from '../components/states/StateView.jsx'
import { ACCENTS, Badge, Button, Card, Icon, IconTile, SectionTitle } from '../components/ui.jsx'
import { browserAccountClient } from '../infrastructure/account/browserAccountClient.ts'
import { browserMiningClient } from '../infrastructure/mining/browserMiningClient.ts'
import { browserRobotClient } from '../infrastructure/robot/browserRobotClient.ts'
import { atomicUnitsToDecimal } from '../domain/mining/metrics.ts'
import MiningCyclePanel from '../components/mining/MiningCyclePanel.jsx'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { packageDefinition } from '../domain/robot/packages.ts'

const CATALOGUE = [
  { id: 'events', to: '/community', icon: 'event', label: 'Events', c: ACCENTS.indigo },
  { id: 'data', to: '/data', icon: 'dataset', label: 'Add data', c: ACCENTS.teal },
  { id: 'referrals', to: '/referrals', icon: 'group_add', label: 'Referrals', c: ACCENTS.violet },
  { id: 'market', to: '/marketplace', icon: 'storefront', label: 'Market', c: ACCENTS.blue },
  { id: 'wallet', to: '/wallet', icon: 'account_balance_wallet', label: 'Wallet', c: ACCENTS.green },
  { id: 'rewards', to: '/rewards', icon: 'workspace_premium', label: 'Rewards', c: ACCENTS.amber },
  { id: 'academy', to: '/academy', icon: 'school', label: 'Academy', c: ACCENTS.pink },
  { id: 'community', to: '/community', icon: 'groups', label: 'Community', c: ACCENTS.orange },
  { id: 'passport', to: '/robot/passport', icon: 'badge', label: 'Passport', c: ACCENTS.slate },
  { id: 'customize', to: '/robot/customize', icon: 'tune', label: 'Customise', c: ACCENTS.violet },
  { id: 'packages', to: '/packages', icon: 'inventory_2', label: 'Packages', c: ACCENTS.blue },
  { id: 'support', to: '/support', icon: 'help_outline', label: 'Support', c: ACCENTS.slate },
]

const DEFAULT_IDS = ['events', 'data', 'referrals', 'market', 'wallet', 'rewards', 'passport', 'customize']
const MAX_SHORTCUTS = 12
const STORE_KEY = 'wrs.shortcuts'

function greeting(displayName, date = new Date()) {
  const hour = date.getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  return `Good ${timeOfDay}, ${displayName || 'there'}`
}

function formatXp(value) {
  return `${value.toLocaleString()} XP`
}

function formatRbc(balance) {
  if (balance?.availableAtomic === null || balance?.atomicScale === null) return null
  try {
    const amount = atomicUnitsToDecimal(balance.availableAtomic, balance.atomicScale)
    const [whole, fraction = ''] = amount.split('.')
    const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const minimumFraction = fraction.padEnd(2, '0')
    return `${groupedWhole}${minimumFraction ? `.${minimumFraction}` : ''} RBC`
  } catch {
    return null
  }
}

function formatDailyMiningRate(snapshot) {
  const session = snapshot?.session
  const rate = snapshot?.rateBreakdown?.estimatedAtomicPerHour ?? session?.rule?.rateAtomicPerHour
  const scale = snapshot?.rateBreakdown?.atomicUnitScale ?? session?.rule?.atomicUnitScale
  if (rate === null || rate === undefined || scale === null || !Number.isInteger(scale) || scale < 0 || scale > 12) {
    return null
  }

  const [whole = '', fraction = ''] = String(rate).split('.')
  if (!/^\d+$/.test(whole) || (fraction && !/^\d+$/.test(fraction)) || scale + fraction.length > 18) {
    return null
  }

  try {
    const atomicAmount = BigInt(`${whole}${fraction}`) * 24n
    const formatted = atomicUnitsToDecimal(atomicAmount.toString(), scale + fraction.length)
    const [integer, decimal = ''] = formatted.split('.')
    const trimmedDecimal = decimal.replace(/0+$/, '')
    return `${integer}${trimmedDecimal ? `.${trimmedDecimal}` : ''} RBC / 24h`
  } catch {
    return null
  }
}

const BALANCE_STATE_COPY = {
  preview: 'Live account required',
  signedOut: 'Sign in to view',
  robot: 'Connect a robot to earn XP',
  unavailable: 'Service unavailable',
  empty: 'No verified balance',
}

function SummaryCard({ title, value, loading, state, icon }) {
  const message = BALANCE_STATE_COPY[state] || BALANCE_STATE_COPY.unavailable
  return (
    <Card className="min-w-0 p-4">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icon name={icon} className="text-tertiary" />
        <h2 className="min-w-0 whitespace-normal break-words text-label-sm leading-tight sm:text-label-md">{title}</h2>
      </div>
      <p
        className={`mt-3 text-on-surface ${value !== null && !loading ? 'font-data text-headline-md' : 'text-body-sm'}`}
        aria-live="polite"
      >
        {loading ? 'Loading…' : (value ?? message)}
      </p>
    </Card>
  )
}

function SettledMiningReport({ session, robotName, worksiteName }) {
  if (!session) return null
  let award = null
  if (session.estimatedAwardAtomic !== null && session.rule?.atomicUnitScale !== undefined) {
    try {
      award = atomicUnitsToDecimal(session.estimatedAwardAtomic, session.rule.atomicUnitScale)
    } catch {
      award = null
    }
  }

  return (
    <Card className="p-4 sm:p-5" aria-label="Latest mining cycle report">
      <div className="flex items-start gap-3">
        <Icon name="task_alt" className="mt-0.5 text-tertiary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-title font-semibold text-on-surface">Last mining cycle</h2>
            <Badge t="tertiary">Settled</Badge>
          </div>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {robotName || 'Your robot'} · {worksiteName || 'Worksite'}
          </p>
          <p className="mt-1 text-label-sm text-outline">
            Completed {new Date(session.settledAt || session.endsAt).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface-container px-3 py-3">
          <p className="text-label-sm text-on-surface-variant">Cycle duration</p>
          <p className="tnum mt-1 text-title font-semibold text-on-surface">24 hours</p>
        </div>
        <div className="rounded-xl bg-surface-container px-3 py-3">
          <p className="text-label-sm text-on-surface-variant">RoboCoin awarded</p>
          <p className="tnum mt-1 text-title font-semibold text-tertiary">{award === null ? '—' : `+${award} RBC`}</p>
        </div>
      </div>
      <p className="mt-4 text-body-sm text-on-surface-variant">
        Come back after each 24-hour cycle and start mining again when your robot and worksite are ready.
      </p>
      <Button to="/deploy" full className="mt-4" icon="paid">
        Return to Mining
      </Button>
    </Card>
  )
}

const loadShortcuts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY))
    if (Array.isArray(saved) && saved.length) {
      const migrated = saved.map((id) => (id === 'training' ? 'events' : id === 'deploy' ? 'referrals' : id))
      return [...new Set(migrated)].filter((id) => CATALOGUE.some((item) => item.id === id))
    }
  } catch {
    // Use deterministic defaults when local preferences are unavailable.
  }
  return DEFAULT_IDS
}

export default function Home() {
  const location = useLocation()
  const auth = useAuth()
  const robotState = useRobot()
  const [welcome, setWelcome] = useState(false)
  const [ids, setIds] = useState(loadShortcuts)
  const [editing, setEditing] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const [miningSnapshot, setMiningSnapshot] = useState(null)
  const [miningRefreshing, setMiningRefreshing] = useState(false)
  const [dailyActivityMessage, setDailyActivityMessage] = useState('')
  const settledCycleRefresh = useRef(null)
  const miningRefreshLock = useRef(false)
  const [summary, setSummary] = useState({
    loading: true,
    name: null,
    xp: null,
    rbc: null,
    xpState: null,
    rbcState: null,
  })

  useEffect(() => {
    let active = true
    const initial = {
      loading: false,
      name: null,
      xp: null,
      rbc: null,
    }
    if (auth.loading) {
      queueMicrotask(() => {
        if (!active) return
        setMiningSnapshot(null)
        setDailyActivityMessage('')
        setSummary({ ...initial, loading: true })
      })
      return () => {
        active = false
      }
    }
    if (runtimeConfig.isDemo || !auth.session?.userId) {
      const state = runtimeConfig.isDemo ? 'preview' : 'signedOut'
      queueMicrotask(() => {
        if (!active) return
        setMiningSnapshot(null)
        setDailyActivityMessage('')
        setSummary({ ...initial, xpState: state, rbcState: state })
      })
      return () => {
        active = false
      }
    }

    queueMicrotask(() => {
      if (!active) return
      setSummary({ ...initial, loading: true })
      setDailyActivityMessage('')
    })
    const accountRequest = runtimeConfig.services.identity
      ? browserAccountClient.snapshot()
      : Promise.reject(new Error('Account service is unavailable.'))
    const dailyActivity = browserMiningClient.claimDailyActivity().catch(() => ({ status: 'unavailable' }))
    dailyActivity.then((activity) => {
      if (!active || activity?.status !== 'awarded' || !Number.isSafeInteger(activity.xp) || activity.xp <= 0) return
      setDailyActivityMessage(`Daily login reward: +${activity.xp} XP added.`)
    })
    const miningRequest = dailyActivity.then(() => browserMiningClient.snapshot())
    const passportRequest =
      robotState.robot?.id && runtimeConfig.services.robots
        ? dailyActivity.then(() => browserRobotClient.passport(robotState.robot.id))
        : Promise.resolve(null)

    Promise.allSettled([accountRequest, miningRequest, passportRequest]).then(
      ([accountResult, miningResult, passportResult]) => {
        if (!active) return
        const profile = accountResult.status === 'fulfilled' ? accountResult.value?.profile : null
        const name = typeof profile?.fullName === 'string' && profile.fullName.trim() ? profile.fullName.trim() : null
        const mining =
          miningResult.status === 'fulfilled' && miningResult.value?.authoritative === true ? miningResult.value : null
        setMiningSnapshot(mining)
        const passport = passportResult.status === 'fulfilled' ? passportResult.value?.passport : null
        const verifiedXp =
          passport?.authoritative === true && Number.isSafeInteger(passport.totalXp) && passport.totalXp >= 0
            ? passport.totalXp
            : null
        const xpState =
          verifiedXp !== null
            ? null
            : !robotState.robot?.id
              ? 'robot'
              : passport?.authoritative === true
                ? 'empty'
                : 'unavailable'
        setSummary({
          loading: false,
          name,
          xp: verifiedXp,
          rbc: mining ? formatRbc(mining.balance) : null,
          xpState,
          rbcState: mining ? (formatRbc(mining.balance) === null ? 'empty' : null) : 'unavailable',
        })
      },
    )

    return () => {
      active = false
    }
  }, [auth.loading, auth.session?.userId, refreshCount, robotState.robot?.id])

  const refreshMining = useCallback(async () => {
    if (miningRefreshLock.current) return
    miningRefreshLock.current = true
    setMiningRefreshing(true)
    try {
      const next = await browserMiningClient.snapshot()
      if (next?.authoritative === true) {
        setMiningSnapshot(next)
        const rbc = formatRbc(next.balance)
        setSummary((current) => ({ ...current, rbc, rbcState: rbc === null ? 'empty' : null }))
      }
    } catch {
      // The existing panel retains its last confirmed snapshot and lets the user retry.
    } finally {
      miningRefreshLock.current = false
      setMiningRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const session = miningSnapshot?.session
    if (!session || session.status !== 'active') return undefined
    const endsAt = Date.parse(session.endsAt)
    if (!Number.isFinite(endsAt)) return undefined
    const key = session.id
    const serverOffset = (Date.parse(miningSnapshot.serverNow) || Date.now()) - Date.now()
    const delay = Math.max(0, endsAt - (Date.now() + serverOffset))
    const timer = window.setTimeout(() => {
      if (settledCycleRefresh.current === key) return
      settledCycleRefresh.current = key
      void refreshMining()
    }, delay + 250)
    return () => window.clearTimeout(timer)
  }, [miningSnapshot, refreshMining])

  useEffect(() => {
    queueMicrotask(() => {
      if (consumeWelcome()) setWelcome(true)
    })
  }, [])

  const persist = (next) => {
    setIds(next)
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next))
    } catch {
      // Shortcut preferences are non-authoritative UX state.
    }
  }

  const chosen = ids.map((id) => CATALOGUE.find((item) => item.id === id)).filter(Boolean)
  const available = CATALOGUE.filter((item) => !ids.includes(item.id))
  const full = ids.length >= MAX_SHORTCUTS

  return (
    <AppShell title={greeting(summary.name)} brand lightTopBackdrop>
      {location.state?.dailyXpAward > 0 && (
        <p
          role="status"
          className="rounded-xl border border-tertiary/25 bg-tertiary/10 px-4 py-3 text-body-sm font-semibold text-on-surface"
        >
          Daily login reward: +{location.state.dailyXpAward} XP
        </p>
      )}
      <WelcomeModal open={welcome} onClose={() => setWelcome(false)} />

      {dailyActivityMessage && (
        <p role="status" aria-live="polite" className="rounded-xl bg-tertiary/10 px-4 py-3 text-body-sm text-tertiary">
          {dailyActivityMessage}
        </p>
      )}

      {robotState.loading ? (
        <StateView kind="loading" title="Loading your robot" desc="Reading the latest confirmed robot state." />
      ) : robotState.isDemo || !robotState.robot ? (
        <RobotSetupPanel robotState={robotState} />
      ) : (
        <section>
          <Card className="overflow-hidden border-[#433c92] bg-[#1d1c40] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.2)] sm:p-5">
            <div className="flex items-start gap-4">
              <Robot3D
                size={96}
                config={robotState.configuration || undefined}
                className="shrink-0"
                label={`${robotState.robot.name}, your robot`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="truncate font-headline-md text-headline-md text-on-surface">
                      {robotState.robot.name}
                    </h2>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {packageDefinition(robotState.robot.packageSlug).robotClass} · {robotState.robot.packageSlug}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b7e5d0] bg-[#e6f6ee] px-2.5 py-1 text-label-sm font-medium capitalize text-[#176b4c]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1d9a68]" />
                    {miningSnapshot?.session?.status === 'active' ? 'Mining' : robotState.robot.lifecycle}
                  </span>
                </div>
                {!miningSnapshot?.session &&
                miningSnapshot?.issuanceEnabled &&
                miningSnapshot?.eligibility?.eligible ? (
                  <Button to="/deploy" className="mt-4 font-bold" icon="bolt">
                    Start mining
                  </Button>
                ) : !miningSnapshot?.session ? (
                  <p className="mt-3 text-label-sm text-on-surface-variant">
                    {summary.loading ? 'Checking mining…' : 'Mining unavailable'}
                  </p>
                ) : null}
              </div>
            </div>
            {miningSnapshot?.session && miningSnapshot.session.status !== 'settled' ? (
              <MiningCyclePanel
                compact
                session={miningSnapshot.session}
                robotName={robotState.robot.name}
                serverNow={miningSnapshot.serverNow}
                onRefresh={refreshMining}
                refreshing={miningRefreshing}
              />
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#303747] bg-[#171b25] px-4 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[.07] text-[#f1c75b]">
                  <Icon name="paid" className="text-[22px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-label-sm text-[#b5bdcf]">24-hour mining rate</p>
                  <p className="tnum mt-0.5 break-words font-data text-title font-bold text-white" aria-live="polite">
                    {summary.loading ? 'Loading rate…' : formatDailyMiningRate(miningSnapshot) || 'Rate unavailable'}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {!runtimeConfig.isDemo &&
        miningSnapshot?.authoritative === true &&
        (() => {
          const session = miningSnapshot.session
          const robotName = (item) => miningSnapshot.robots.find((robot) => robot.robotId === item?.robotId)?.name
          const worksiteName = (item) =>
            miningSnapshot.worksites.find((site) => site.worksiteId === item?.worksiteId)?.name
          const latestSettled = miningSnapshot.recentSessions.find((item) => item.status === 'settled')
          return session?.status === 'settled' ? (
            <SettledMiningReport
              session={session}
              robotName={robotName(session)}
              worksiteName={worksiteName(session)}
            />
          ) : session ? null : latestSettled ? (
            <SettledMiningReport
              session={latestSettled}
              robotName={robotName(latestSettled)}
              worksiteName={worksiteName(latestSettled)}
            />
          ) : null
        })()}

      <section
        aria-label="Member balances"
        role={summary.loading ? 'status' : undefined}
        aria-busy={summary.loading || undefined}
        className="grid grid-cols-2 gap-3"
      >
        <SummaryCard
          title="XP balance"
          icon="stars"
          loading={summary.loading}
          value={summary.xp === null ? null : formatXp(summary.xp)}
          state={summary.xpState}
        />
        <SummaryCard
          title="RoboCoin balance"
          icon="paid"
          loading={summary.loading}
          value={summary.rbc}
          state={summary.rbcState}
        />
      </section>
      {!runtimeConfig.isDemo &&
        auth.session?.userId &&
        (summary.xpState === 'unavailable' || summary.rbcState === 'unavailable') && (
          <button
            type="button"
            onClick={() => setRefreshCount((count) => count + 1)}
            className="-mt-4 justify-self-start text-label-md text-primary hover:underline"
          >
            Refresh balances
          </button>
        )}

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">Shortcuts</h2>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="shrink-0 text-label-md text-primary hover:underline"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>

        <ul className="grid grid-cols-4 gap-y-4">
          {chosen.map((action) => (
            <li key={action.id}>
              {editing ? (
                <div className="flex flex-col items-center gap-2 py-1 text-center">
                  <span className="relative">
                    <IconTile icon={action.icon} accent={action.c} size={52} radius={16} iconSize={28} />
                    <button
                      type="button"
                      onClick={() => persist(ids.filter((id) => id !== action.id))}
                      aria-label={`Remove ${action.label} from shortcuts`}
                      className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-error text-on-error"
                    >
                      <Icon name="remove" className="text-[16px]" />
                    </button>
                  </span>
                  <span className="text-label-md leading-tight text-on-surface">{action.label}</span>
                </div>
              ) : (
                <Link
                  to={action.to}
                  className="flex flex-col items-center gap-2 rounded-xl py-1 text-center active:scale-[.94]"
                >
                  <IconTile icon={action.icon} accent={action.c} size={52} radius={16} iconSize={28} />
                  <span className="text-label-md leading-tight text-on-surface">{action.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>

        {editing && (
          <Card className="mt-5 p-4">
            <SectionTitle action={`${ids.length}/${MAX_SHORTCUTS}`}>Add shortcut</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {available.map((action) => (
                <button
                  type="button"
                  key={action.id}
                  disabled={full}
                  onClick={() => !full && persist([...ids, action.id])}
                  className="tap flex items-center gap-2 rounded-full border border-white/12 px-3 py-2 text-label-md text-on-surface disabled:opacity-45"
                >
                  <Icon name={action.icon} className="text-[18px]" /> {action.label}{' '}
                  <Icon name="add" className="text-[16px] text-outline" />
                </button>
              ))}
            </div>
          </Card>
        )}
      </section>
    </AppShell>
  )
}
