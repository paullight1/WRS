import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, SectionTitle } from '../components/ui.jsx'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'

function idempotency(slug) {
  return `boost:${slug}:${crypto.randomUUID()}`
}

export default function BoostsProduction() {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const refresh = async () => {
    const next = await browserEcosystemClient.rewards()
    setSnapshot(next)
  }

  useEffect(() => {
    let active = true
    browserEcosystemClient
      .rewards()
      .then((next) => {
        if (active) setSnapshot(next)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Boost service is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const activate = async (boost) => {
    setBusy(boost.slug)
    setMessage('')
    try {
      const result = await browserEcosystemClient.activateBoost(boost.slug, idempotency(boost.slug))
      setMessage(
        `Boost ${boost.name} confirmed until ${new Date(result.expiresAt || result.expires_at).toLocaleString()}.`,
      )
      await refresh()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Boost activation failed.')
    } finally {
      setBusy('')
    }
  }

  const catalog = snapshot?.catalog || []
  const activeSlugs = new Set((snapshot?.boosts || []).map((boost) => boost.boost_slug))

  return (
    <AppShell title="Boosts" subtitle="Point-funded temporary effects" back avatar={false}>
      {loading && (
        <StateView kind="loading" title="Loading boosts" desc="Reading point balance and active catalogue." />
      )}
      {!loading && error && <StateView kind="error" title="Boosts unavailable" desc={error} />}
      {!loading && !error && snapshot && (
        <>
          <Card className="p-4">
            <p className="text-label-sm text-outline">Available points</p>
            <p className="mt-1 font-headline-md text-headline-md text-on-surface">{snapshot.points.toLocaleString()}</p>
          </Card>
          <section>
            <SectionTitle action={`${catalog.length} available`}>Boost catalogue</SectionTitle>
            <div className="space-y-3">
              {catalog.map((boost) => {
                const active = activeSlugs.has(boost.slug)
                return (
                  <Card key={boost.slug} className="p-card-padding">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-title font-semibold text-on-surface">{boost.name}</h2>
                        <p className="mt-1 text-label-sm text-outline">
                          {boost.cost_points} points · {Math.round(boost.duration_seconds / 3600)}h ·{' '}
                          {boost.min_package_slug}+
                        </p>
                      </div>
                      <Badge t={active ? 'success' : 'outline'}>{active ? 'Active' : 'Available'}</Badge>
                    </div>
                    <Button
                      full
                      className="mt-4"
                      loading={busy === boost.slug}
                      disabled={active || snapshot.points < boost.cost_points}
                      onClick={() => activate(boost)}
                    >
                      {active ? 'Already active' : `Spend ${boost.cost_points} points`}
                    </Button>
                  </Card>
                )
              })}
              {!catalog.length && (
                <StateView
                  kind="empty"
                  title="No active boost catalogue"
                  desc="Only server-configured active boosts can be purchased."
                />
              )}
            </div>
          </section>
        </>
      )}
      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}
    </AppShell>
  )
}
