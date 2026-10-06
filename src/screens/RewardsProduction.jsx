import { useCallback, useEffect, useRef, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import RewardArt from '../components/rewards/RewardArt.jsx'
import { Badge, Button, Card, CoinMark, Icon, SectionTitle, Tabs } from '../components/ui.jsx'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'
import { atomicUnitsToDecimal } from '../domain/mining/metrics.ts'
import { activityPresets } from '../domain/mining/rewardPolicy.ts'

const names = Object.fromEntries(activityPresets.map((activity) => [activity.source, activity.name]))
const destinations = {
  daily: '/home',
  profile: '/profile',
  verification: '/settings/security',
  training: '/training',
  'data-task': '/data',
  data: '/data',
  validation: '/data',
  academy: '/academy',
  community: '/rewards/event-code',
  mission: '/community',
}
const descriptions = {
  daily: 'Earn XP through your daily activity.',
  profile: 'Complete your account profile.',
  verification: 'Complete your account verification.',
  training: 'Train your robot and complete approved tasks.',
  'data-task': 'Contribute an approved data task.',
  validation: 'Complete an approved validation task.',
  academy: 'Complete an Academy certification.',
  community: 'Redeem an active WRS event code.',
  mission: 'Complete an eligible WRS mission.',
}
function decimal(value, scale) {
  if (value === '0' && scale === null) return '0'
  if (typeof value !== 'string' || !Number.isInteger(scale)) return '—'
  return atomicUnitsToDecimal(value, scale)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

export default function RewardsProduction() {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('All')
  const requestId = useRef(0)
  const load = useCallback(async () => {
    const id = ++requestId.current
    setRefreshing(true)
    setError('')
    try {
      const next = await browserEcosystemClient.rewards()
      if (requestId.current === id) setSnapshot(next)
    } catch (reason) {
      if (requestId.current === id) setError(reason instanceof Error ? reason.message : 'Rewards are unavailable.')
    } finally {
      if (requestId.current === id) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void load()
    })
    return () => {
      active = false
      requestId.current += 1
    }
  }, [load])
  const referral = snapshot?.activities.find((activity) => activity.source === 'referral' && activity.xp > 0)
  const event = snapshot?.activities.find((activity) => activity.source === 'community' && activity.xp > 0)
  const nextLevel = snapshot?.levels
    .filter((level) => Number(level.level) > snapshot.level?.level)
    .sort((a, b) => Number(a.level) - Number(b.level))[0]
  const goal = Number(nextLevel?.requiredXp)
  const progress = goal > 0 ? Math.min(100, (snapshot?.xp / goal) * 100) : 0
  const history = (snapshot?.dashboard.history || []).filter(
    (award) => filter === 'All' || award.currency === (filter === 'XP' ? 'XP' : 'RBC'),
  )

  return (
    <AppShell title="Rewards" subtitle="Build your XP. Mine RoboCoin.">
      {loading ? (
        <StateView
          kind="loading"
          title="Loading your rewards"
          desc="Reading XP, referrals and settled mining rewards."
        />
      ) : error ? (
        <StateView
          kind="error"
          title="Rewards unavailable"
          desc={error}
          action={<Button onClick={load}>Try again</Button>}
        />
      ) : (
        snapshot && (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-label-sm text-on-surface-variant">Your reward balances</p>
              <Button variant="quiet" size="sm" icon="refresh" loading={refreshing} onClick={load}>
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-tertiary/20 bg-tertiary/[.04] p-4">
                <Icon name="stars" className="text-tertiary text-[24px]" />
                <p className="tnum mt-3 font-data text-3xl font-bold text-tertiary">{snapshot.xp.toLocaleString()}</p>
                <p className="mt-1 text-label-md text-on-surface">Total XP</p>
                <p className="mt-1 text-label-sm text-on-surface-variant">Your progression</p>
              </Card>
              <Card className="p-4">
                <CoinMark size={26} />
                <p className="tnum mt-3 break-all font-data text-3xl font-bold text-[#f7c948]">
                  {decimal(snapshot.rbc.availableAtomic, snapshot.rbc.atomicScale)}
                </p>
                <p className="mt-1 text-label-md text-on-surface">RoboCoin</p>
                <p className="mt-1 text-label-sm text-on-surface-variant">From mining · RBC</p>
              </Card>
            </div>
            <div className="grid grid-cols-2 gap-3 px-1">
              <div>
                <p className="text-label-sm text-on-surface-variant">Activity XP</p>
                <p className="tnum mt-1 text-title font-semibold">
                  {snapshot.dashboard.activityXp.toLocaleString()} XP
                </p>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant">Referral XP</p>
                <p className="tnum mt-1 text-title font-semibold">
                  {snapshot.dashboard.referralXp.toLocaleString()} XP
                </p>
              </div>
            </div>
            {snapshot.level && (
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <RewardArt className="h-16 w-16 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-label-sm text-on-surface-variant">Your mining level</p>
                    <h2 className="mt-1 text-title font-semibold">{snapshot.level.name}</h2>
                  </div>
                  <Badge t="tertiary">{snapshot.level.multiplierBps / 10000}× power</Badge>
                </div>
                {goal > 0 && (
                  <div className="mt-4 border-t border-white/8 pt-3">
                    <div className="flex items-center justify-between gap-2 text-label-sm text-on-surface-variant">
                      <span>Next XP target · {String(nextLevel.name)}</span>
                      <span className="tnum">
                        {snapshot.xp.toLocaleString()} / {goal.toLocaleString()}
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="XP toward next level"
                      aria-valuemin={0}
                      aria-valuemax={goal}
                      aria-valuenow={Math.min(snapshot.xp, goal)}
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
                    >
                      <div className="h-full rounded-full bg-tertiary" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-label-sm text-on-surface-variant">Some levels also require achievements.</p>
                  </div>
                )}
              </Card>
            )}
            <section>
              <SectionTitle>Refer &amp; earn XP</SectionTitle>
              <Card className="overflow-hidden border-primary/25 bg-primary-container/10 p-4">
                <div className="flex items-center gap-3">
                  <RewardArt kind="referral" className="h-20 w-24 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-title font-semibold">Grow the WRS community</h3>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {referral
                        ? `+${referral.xp.toLocaleString()} XP per eligible referral award`
                        : 'Referral XP rewards are currently paused.'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 border-y border-white/10 py-3">
                  {[
                    [snapshot.dashboard.referralXp, 'XP earned'],
                    [snapshot.dashboard.referrals.qualified, 'Qualified'],
                    [snapshot.dashboard.referrals.pending, 'Pending'],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <p className="tnum text-title font-bold">{value.toLocaleString()}</p>
                      <p className="text-label-sm text-on-surface-variant">{label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-label-sm text-on-surface-variant">
                  Referral qualification requires a verified account, paid activation and a 7-day review.
                  {referral
                    ? ` XP rewards are limited to ${referral.dailyLimit} qualified referral${referral.dailyLimit === 1 ? '' : 's'} per day.`
                    : ''}
                </p>
                <Button to="/referrals" full className="mt-4" icon="person_add">
                  {referral ? 'Invite friends' : 'Manage referrals'}
                </Button>
              </Card>
            </section>
            <section>
              <SectionTitle>Ways to earn</SectionTitle>
              <div className="space-y-3">
                <Card className="flex items-center gap-3 p-4">
                  <CoinMark size={40} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-title font-semibold">Mine RoboCoin</h3>
                    <p className="mt-1 text-label-sm text-on-surface-variant">
                      {snapshot.issuanceEnabled
                        ? 'Run a 24-hour robot cycle. RBC is credited after settlement.'
                        : 'Mining rewards are currently paused.'}
                    </p>
                  </div>
                  <Button to="/deploy" size="sm" variant="tonal">
                    {snapshot.miningActive ? 'View cycle' : 'Mining'}
                  </Button>
                </Card>
                {snapshot.activities
                  .filter((activity) => activity.source !== 'referral' && activity.xp > 0)
                  .map((activity) => (
                    <Card key={activity.source} className="flex items-center gap-3 p-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tertiary/10 text-tertiary">
                        <Icon name="stars" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-title font-semibold">{names[activity.source] || activity.source}</h3>
                        <p className="mt-1 text-label-sm text-on-surface-variant">
                          {descriptions[activity.source] || 'Complete an eligible activity.'} Up to{' '}
                          {activity.dailyLimit} per day.
                        </p>
                        <p className="mt-1 text-label-sm font-semibold text-tertiary">+{activity.xp} XP</p>
                      </div>
                      {destinations[activity.source] && (
                        <Button variant="tonal" size="sm" to={destinations[activity.source]}>
                          Open
                        </Button>
                      )}
                    </Card>
                  ))}
                {!event && (
                  <Card className="flex items-center gap-3 p-4">
                    <Icon name="confirmation_number" className="text-[26px] text-outline" />
                    <div>
                      <h3 className="text-title font-semibold">Event XP</h3>
                      <p className="mt-1 text-label-sm text-on-surface-variant">
                        Event rewards are paused. Code redemption opens when an XP reward is active.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </section>
            <section>
              <SectionTitle>Reward history</SectionTitle>
              <Tabs items={['All', 'XP', 'RoboCoin']} value={filter} onChange={setFilter} />
              {history.length ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 divide-y divide-white/8">
                  {history.map((award) => (
                    <div key={`${award.currency}-${award.id}`} className="flex items-center gap-3 p-4">
                      {award.currency === 'RBC' ? (
                        <CoinMark size={34} />
                      ) : (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tertiary/10 text-tertiary">
                          <Icon name={award.source === 'referral' ? 'person_add' : 'stars'} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-semibold">
                          {award.currency === 'RBC'
                            ? 'Mining cycle settled'
                            : names[award.source] || (award.source === 'reward' ? 'XP reward' : award.source)}
                        </p>
                        <p className="mt-1 text-label-sm text-on-surface-variant">
                          {new Date(award.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <p
                        className={`tnum text-body-sm font-bold ${award.currency === 'RBC' ? 'text-[#f7c948]' : 'text-tertiary'}`}
                      >
                        {award.amount.startsWith('-') ? '' : '+'}
                        {decimal(award.amount, award.atomicScale)} {award.currency}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-white/15 px-5 py-7 text-center">
                  <RewardArt className="mx-auto h-20 w-24" />
                  <h3 className="mt-3 text-title font-semibold">
                    {filter === 'RoboCoin'
                      ? 'No settled mining rewards yet'
                      : filter === 'XP'
                        ? 'No XP rewards yet'
                        : 'Your first reward starts here'}
                  </h3>
                  <p className="mx-auto mt-2 max-w-[30ch] text-body-sm text-on-surface-variant">
                    {filter === 'RoboCoin'
                      ? 'Completed mining awards will appear here after settlement.'
                      : 'Earn XP through eligible activities and referrals. Your credited rewards will appear here.'}
                  </p>
                </div>
              )}
            </section>
            <p className="text-center text-label-sm text-on-surface-variant">
              Activities and referrals earn XP. Mining earns RoboCoin.
            </p>
          </>
        )
      )}
    </AppShell>
  )
}
