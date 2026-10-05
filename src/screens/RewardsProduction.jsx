import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Button, Card, SectionTitle, Stat } from '../components/ui.jsx'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'
import { atomicUnitsToDecimal } from '../domain/mining/metrics.ts'
import { activityPresets } from '../domain/mining/rewardPolicy.ts'

export default function RewardsProduction() {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    browserEcosystemClient
      .rewards()
      .then((next) => {
        if (active) setSnapshot(next)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Rewards are unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  const scale = snapshot?.rbc?.atomicScale
  const amount = (value) => {
    if (value === '0' && scale === null) return '0'
    return typeof value === 'string' && Number.isInteger(scale) ? atomicUnitsToDecimal(value, scale) : null
  }
  const names = Object.fromEntries(activityPresets.map((activity) => [activity.source, activity.name]))
  return (
    <AppShell title="Rewards" subtitle="Grow your XP. Earn RoboCoin.">
      {loading && <StateView kind="loading" title="Loading rewards" />}
      {!loading && error && <StateView kind="error" title="Rewards unavailable" desc={error} />}
      {!loading && !error && snapshot && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="XP" value={snapshot.xp.toLocaleString()} icon="stars" t="tertiary" />
            <Stat
              label="RoboCoin"
              value={amount(snapshot.rbc.availableAtomic) ?? 'Not available yet'}
              icon="paid"
              t="primary"
            />
          </div>
          {snapshot.issuanceEnabled !== true && (
            <p
              role="status"
              className="rounded-xl border border-white/10 bg-surface-container p-4 text-body-sm text-on-surface-variant"
            >
              RoboCoin rewards are paused until approved reward settings are activated.
            </p>
          )}
          {snapshot.level && (
            <Card className="space-y-2 p-4">
              <p className="text-title font-semibold">{snapshot.level.name}</p>
              {snapshot.level.level > 1 && (
                <p className="text-body-sm text-tertiary">
                  Congratulations! Your verified progress has unlocked a higher mining level.
                </p>
              )}
              {Number.isInteger(snapshot.level.multiplierBps) && (
                <p className="text-body-md">Mining power · {snapshot.level.multiplierBps / 10000}×</p>
              )}
              <p className="text-body-sm text-outline">
                XP and verified achievements unlock higher levels. Mining power affects your earning rate when mining is
                enabled.
              </p>
              <Button to="/deploy">Open mining</Button>
            </Card>
          )}
          <section>
            <SectionTitle>Ways to earn</SectionTitle>
            <div className="space-y-2">
              {snapshot.activities.map((activity) => (
                <Card key={activity.source} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-title">{names[activity.source] || activity.source}</p>
                    <p className="text-label-sm text-outline">
                      Up to {activity.dailyLimit} per day · Verified activity required
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-body-sm">
                    +{activity.xp} XP
                    {snapshot.issuanceEnabled && amount(activity.rbcAtomic) && BigInt(activity.rbcAtomic) > 0n && (
                      <span className="block text-tertiary">+{amount(activity.rbcAtomic)} RBC</span>
                    )}
                  </p>
                </Card>
              ))}
            </div>
            {!snapshot.activities.length && (
              <p className="text-body-sm text-outline">
                Reward activities will appear when WRS activates the settings.
              </p>
            )}
          </section>
          <section>
            <SectionTitle>Recent rewards</SectionTitle>
            <div className="space-y-2">
              {snapshot.recentAwards.map((award, index) => (
                <Card key={`${award.createdAt}-${index}`} className="p-3">
                  <p className="text-body-md">
                    {names[award.source] || award.source} · +{award.xp} XP
                    {amount(award.rbcAtomic) && BigInt(award.rbcAtomic) > 0n
                      ? ` · +${amount(award.rbcAtomic)} RBC`
                      : ''}
                  </p>
                  <p className="text-label-sm text-outline">{new Date(award.createdAt).toLocaleDateString()}</p>
                </Card>
              ))}
            </div>
          </section>
          <Button to="/rewards/event-code" full>
            Claim a verified event
          </Button>
          <p className="text-body-sm text-outline">
            XP measures your progress. RoboCoin is your reward balance. Verified business earnings stay in your
            financial account.
          </p>
        </>
      )}
    </AppShell>
  )
}
