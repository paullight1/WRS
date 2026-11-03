import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import WelcomeModal, { consumeWelcome, hasSeenOnboarding, markOnboardingSeen } from '../components/WelcomeModal.jsx'
import { ACCENTS, IconTile } from '../components/ui.jsx'
import { browserAccountClient } from '../infrastructure/account/browserAccountClient.ts'
import { browserMiningClient } from '../infrastructure/mining/browserMiningClient.ts'
import { browserRobotClient } from '../infrastructure/robot/browserRobotClient.ts'
import { atomicUnitsToDecimal } from '../domain/mining/metrics.ts'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'
import WalletDashboard, { useDashboardLedger } from '../components/dashboard/WalletDashboard.jsx'

const CATALOGUE = [
  { id: 'events', to: '/community', icon: 'event', label: 'Events', c: ACCENTS.indigo },
  { id: 'referrals', to: '/referrals', icon: 'group_add', label: 'Referrals', c: ACCENTS.violet },
  { id: 'market', to: '/marketplace', icon: 'storefront', label: 'Market', c: ACCENTS.blue },
  { id: 'rewards', to: '/rewards', icon: 'workspace_premium', label: 'Rewards', c: ACCENTS.amber },
  { id: 'academy', to: '/academy', icon: 'school', label: 'Academy', c: ACCENTS.pink },
  { id: 'community', to: '/community', icon: 'groups', label: 'Community', c: ACCENTS.orange },
  { id: 'packages', to: '/packages', icon: 'inventory_2', label: 'Packages', c: ACCENTS.blue },
  { id: 'support', to: '/support', icon: 'help_outline', label: 'Support', c: ACCENTS.slate },
]

const DEFAULT_IDS = ['events', 'referrals', 'market', 'rewards']
const STORE_KEY = 'wrs.shortcuts'

function greeting(displayName, date = new Date()) {
  const hour = date.getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  return `Good ${timeOfDay}, ${displayName || 'there'}`
}

function formatXp(value) {
  return `${value.toLocaleString()} XP`
}

function formatRbc(balance, pendingAtomic = 0n) {
  if (balance?.availableAtomic === null || balance?.atomicScale === null) return null
  try {
    const amount = atomicUnitsToDecimal(
      (BigInt(balance.availableAtomic) + pendingAtomic).toString(),
      balance.atomicScale,
    )
    const [whole, fraction = ''] = amount.split('.')
    const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const minimumFraction = fraction.replace(/0+$/, '').padEnd(2, '0')
    return `${groupedWhole}${minimumFraction ? `.${minimumFraction}` : ''} RBC`
  } catch {
    return null
  }
}

function accruedMiningAtomic(session, now) {
  if (!session || !['active', 'ended'].includes(session.status)) return 0n
  const startedAt = Date.parse(session.startedAt)
  const endsAt = Date.parse(session.endsAt)
  const rate = session.rule?.rateAtomicPerHour
  if (!Number.isFinite(startedAt) || !Number.isFinite(endsAt) || !/^\d+$/.test(String(rate ?? ''))) return 0n

  const elapsedMilliseconds = Math.max(0, Math.min(now, endsAt) - startedAt)
  let accrued = (BigInt(rate) * BigInt(Math.floor(elapsedMilliseconds))) / 3_600_000n
  const sessionCap = session.rule?.perSessionCapAtomic
  if (typeof sessionCap === 'string' && /^\d+$/.test(sessionCap)) {
    accrued = accrued < BigInt(sessionCap) ? accrued : BigInt(sessionCap)
  }
  return accrued
}

const loadShortcuts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY))
    if (Array.isArray(saved) && saved.length) {
      const migrated = saved.map((id) => (id === 'training' ? 'events' : id === 'deploy' ? 'referrals' : id))
      const available = [...new Set(migrated)].filter((id) => CATALOGUE.some((item) => item.id === id))
      return available.length ? available : DEFAULT_IDS
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
  const [ids] = useState(loadShortcuts)
  const [refreshCount, setRefreshCount] = useState(0)
  const ledger = useDashboardLedger(!runtimeConfig.isDemo && Boolean(auth.session?.userId), refreshCount)
  const [rewards, setRewards] = useState(null)
  const [progress, setProgress] = useState(null)
  const [rewardsError, setRewardsError] = useState('')
  const [progressError, setProgressError] = useState('')
  const [miningStarting, setMiningStarting] = useState(false)
  const [miningActionError, setMiningActionError] = useState('')
  const miningStartLock = useRef(false)
  const miningStartAttempt = useRef(null)
  const dailyClaim = useRef(null)
  const summaryOwner = useRef(null)
  const [miningSnapshot, setMiningSnapshot] = useState(null)
  const [miningNow, setMiningNow] = useState(() => Date.now())
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
  const pendingMiningAtomic = accruedMiningAtomic(miningSnapshot?.session, miningNow)
  const displayedRbc = miningSnapshot ? formatRbc(miningSnapshot.balance, pendingMiningAtomic) : summary.rbc
  const hasPendingMining = ['active', 'ended'].includes(miningSnapshot?.session?.status)

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
        setRewards(null)
        setProgress(null)
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
        setRewards(null)
        setProgress(null)
        setDailyActivityMessage('')
        setSummary({ ...initial, xpState: state, rbcState: state })
      })
      return () => {
        active = false
      }
    }

    const ownerChanged = summaryOwner.current !== auth.session.userId
    summaryOwner.current = auth.session.userId
    queueMicrotask(() => {
      if (!active || !ownerChanged) return
      setSummary({ ...initial, loading: true })
      setRewards(null)
      setProgress(null)
      setDailyActivityMessage('')
    })
    const accountRequest = runtimeConfig.services.identity
      ? browserAccountClient.snapshot()
      : Promise.reject(new Error('Account service is unavailable.'))
    const claimKey = `${auth.session.userId}:${new Date().toISOString().slice(0, 10)}`
    if (dailyClaim.current?.key !== claimKey) {
      const claim = { key: claimKey, refreshed: false }
      claim.promise = browserMiningClient.claimDailyActivity().catch(() => {
        if (dailyClaim.current === claim) dailyClaim.current = null
        return { status: 'unavailable' }
      })
      dailyClaim.current = claim
    }
    const claim = dailyClaim.current
    claim.promise.then((activity) => {
      if (!active) return
      if (activity?.status === 'unavailable' && dailyClaim.current === claim) dailyClaim.current = null
      if (activity?.status !== 'awarded' || !Number.isSafeInteger(activity.xp) || activity.xp <= 0) return
      setDailyActivityMessage(`Daily login reward: +${activity.xp} XP added.`)
      if (!claim.refreshed) {
        claim.refreshed = true
        setRefreshCount((count) => count + 1)
      }
    })
    // Daily rewards are optional: a stalled claim must not block balances or mining.
    const miningRequest = browserMiningClient.snapshot()
    const passportRequest =
      robotState.robot?.id && runtimeConfig.services.robots
        ? browserRobotClient.passport(robotState.robot.id)
        : Promise.resolve(null)

    const rewardsRequest = runtimeConfig.services.rewards
      ? browserEcosystemClient.rewards()
      : Promise.reject(new Error('Rewards unavailable'))
    const progressRequest = browserMiningClient.progress()
    Promise.allSettled([accountRequest, miningRequest, passportRequest, rewardsRequest, progressRequest]).then(
      ([accountResult, miningResult, passportResult, rewardsResult, progressResult]) => {
        if (!active) return
        const profile = accountResult.status === 'fulfilled' ? accountResult.value?.profile : null
        const name = typeof profile?.fullName === 'string' && profile.fullName.trim() ? profile.fullName.trim() : null
        const mining =
          miningResult.status === 'fulfilled' && miningResult.value?.authoritative === true ? miningResult.value : null
        setMiningSnapshot(mining)
        const passport = passportResult.status === 'fulfilled' ? passportResult.value?.passport : null
        const recordedRewards =
          rewardsResult.status === 'fulfilled' && rewardsResult.value?.authoritative === true
            ? rewardsResult.value
            : null
        setRewards(recordedRewards)
        setRewardsError(recordedRewards ? '' : 'XP and RoboCoin activity is temporarily unavailable.')
        setProgress(
          progressResult.status === 'fulfilled' && progressResult.value?.authoritative === true
            ? progressResult.value
            : null,
        )
        setProgressError(
          progressResult.status === 'fulfilled' ? '' : 'Daily mining progress is temporarily unavailable.',
        )
        const verifiedXp =
          Number.isSafeInteger(recordedRewards?.dashboard?.totalXp) && recordedRewards.dashboard.totalXp >= 0
            ? recordedRewards.dashboard.totalXp
            : passport?.authoritative === true && Number.isSafeInteger(passport.totalXp) && passport.totalXp >= 0
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
    setMiningActionError('')
    try {
      const next = await browserMiningClient.snapshot()
      if (next?.authoritative === true) {
        setMiningSnapshot(next)
        const rbc = formatRbc(next.balance)
        setSummary((current) => ({ ...current, rbc, rbcState: rbc === null ? 'empty' : null }))
        setRefreshCount((count) => count + 1)
      }
    } catch {
      setMiningActionError('Mining could not be refreshed. Please try again.')
    } finally {
      miningRefreshLock.current = false
      setMiningRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const session = miningSnapshot?.session
    if (!session || !['active', 'ended'].includes(session.status)) return undefined
    const serverOffset = (Date.parse(miningSnapshot.serverNow) || Date.now()) - Date.now()
    const tick = () => setMiningNow(Date.now() + serverOffset)
    tick()
    const clock = window.setInterval(tick, 1000)
    return () => window.clearInterval(clock)
  }, [miningSnapshot, refreshMining])

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
    const userId = auth.session?.userId
    if (auth.loading || !userId) return undefined
    queueMicrotask(() => {
      if (consumeWelcome() || !hasSeenOnboarding(userId)) setWelcome(true)
    })
  }, [auth.loading, auth.session?.userId])

  const dismissWelcome = useCallback(() => {
    markOnboardingSeen(auth.session?.userId)
    setWelcome(false)
  }, [auth.session?.userId])

  const startMining = async () => {
    if (
      miningStartLock.current ||
      !miningSnapshot?.eligibility?.eligible ||
      !miningSnapshot.issuanceEnabled ||
      miningSnapshot.session
    )
      return
    const robot =
      miningSnapshot.robots.find((item) => item.robotId === robotState.robot?.id && item.unlocked) ||
      miningSnapshot.robots.find((item) => item.unlocked)
    const site = miningSnapshot.worksites.find(
      (item) => item.available && item.name.trim().toLowerCase() === 'manufacturing',
    )
    if (!robot || !site) {
      setMiningActionError('Choose an available robot and worksite from the Mine tab.')
      return
    }
    const context = `${auth.session?.userId}:${robot.robotId}:${site.worksiteId}`
    if (miningStartAttempt.current?.context !== context)
      miningStartAttempt.current = {
        context,
        key: `home-mining:${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      }
    miningStartLock.current = true
    setMiningStarting(true)
    setMiningActionError('')
    try {
      const next = await browserMiningClient.start({
        robotId: robot.robotId,
        worksiteId: site.worksiteId,
        idempotencyKey: miningStartAttempt.current.key,
      })
      if (next?.authoritative !== true) throw new Error('Mining could not be confirmed. Please try again.')
      setMiningSnapshot(next)
      if (next.session) {
        miningStartAttempt.current = null
        setRefreshCount((count) => count + 1)
      } else setMiningActionError('Mining is not currently available. Check the Mine tab for details.')
    } catch (reason) {
      setMiningActionError(reason instanceof Error ? reason.message : 'Mining could not be started. Please try again.')
    } finally {
      miningStartLock.current = false
      setMiningStarting(false)
    }
  }

  useEffect(() => {
    if (runtimeConfig.isDemo || !auth.session?.userId) return undefined
    const refresh = () => {
      if (document.visibilityState === 'visible') setRefreshCount((count) => count + 1)
    }
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [auth.session?.userId])

  const chosen = ids.map((id) => CATALOGUE.find((item) => item.id === id)).filter(Boolean)

  const shortcuts = (
    <section className="dw-shortcuts" aria-label="More">
      <h2 className="mb-3 font-headline-md text-headline-md text-on-surface">More</h2>
      <ul className="grid grid-cols-4 gap-y-4">
        {chosen.map((action) => (
          <li key={action.id}>
            <Link
              to={action.to}
              className="flex flex-col items-center gap-2 rounded-xl py-1 text-center active:scale-[.94]"
            >
              <IconTile icon={action.icon} accent={action.c} size={52} radius={16} iconSize={28} />
              <span className="text-label-md leading-tight text-on-surface">{action.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )

  return (
    <AppShell title={greeting(summary.name)} brand variant="wallet">
      <WalletDashboard
        rbc={displayedRbc}
        xp={summary.xp === null ? null : formatXp(summary.xp)}
        mining={miningSnapshot}
        robot={robotState.robot}
        ledger={ledger}
        loading={summary.loading}
        balanceState={summary.rbcState}
        pendingMining={hasPendingMining}
        now={miningNow}
        shortcuts={shortcuts}
        rewards={rewards}
        rewardsError={rewardsError}
        progress={progress}
        progressError={progressError}
        onRefreshData={() => setRefreshCount((count) => count + 1)}
        onStartMining={startMining}
        miningStarting={miningStarting}
        onRefreshMining={refreshMining}
        miningRefreshing={miningRefreshing}
        miningError={miningActionError}
        robotLoading={robotState.loading}
      />
      {location.state?.dailyXpAward > 0 && (
        <p
          role="status"
          className="rounded-xl border border-tertiary/25 bg-tertiary/10 px-4 py-3 text-body-sm font-semibold text-on-surface"
        >
          Daily login reward: +{location.state.dailyXpAward} XP
        </p>
      )}
      <WelcomeModal open={welcome} onClose={dismissWelcome} robotName={robotState.robot?.name} />

      {dailyActivityMessage && (
        <p role="status" aria-live="polite" className="rounded-xl bg-tertiary/10 px-4 py-3 text-body-sm text-tertiary">
          {dailyActivityMessage}
        </p>
      )}

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
    </AppShell>
  )
}
