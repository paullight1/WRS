import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Button, Card, SectionTitle, Stat } from '../components/ui.jsx'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'

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
        if (active) setError(reason instanceof Error ? reason.message : 'Rewards service is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <AppShell title="Rewards" subtitle="Verified activity points">
      {loading && <StateView kind="loading" title="Loading rewards" desc="Reading the append-only point ledger." />}
      {!loading && error && <StateView kind="error" title="Rewards unavailable" desc={error} />}
      {!loading && !error && snapshot && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Available points" value={snapshot.points.toLocaleString()} icon="stars" t="tertiary" />
            <Stat label="Active boosts" value={snapshot.boosts.length} icon="bolt" t="primary" />
          </div>
          <section>
            <SectionTitle>Active boosts</SectionTitle>
            <div className="space-y-3">
              {snapshot.boosts.map((boost) => (
                <Card key={boost.id} className="p-4">
                  <p className="text-title text-on-surface">{boost.boost_slug}</p>
                  <p className="mt-1 text-label-sm text-outline">
                    Expires {new Date(boost.expires_at).toLocaleString()}
                  </p>
                </Card>
              ))}
              {!snapshot.boosts.length && (
                <StateView
                  kind="empty"
                  title="No active boosts"
                  desc="Boosts appear only after a server-confirmed point spend."
                />
              )}
            </div>
          </section>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button to="/rewards/event-code" full>
              Redeem event code
            </Button>
            <Button to="/rewards/boosts" variant="ghost" full>
              Manage boosts
            </Button>
          </div>
          <Card className="p-4">
            <p className="text-body-sm text-on-surface-variant">
              Points are promotional progression units, not cash or withdrawable wallet value. Every award and spend is
              recorded as an append-only server event.
            </p>
          </Card>
        </>
      )}
    </AppShell>
  )
}
