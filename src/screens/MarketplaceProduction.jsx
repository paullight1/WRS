import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Button, Card } from '../components/ui.jsx'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'

export default function MarketplaceProduction() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true)
    try {
      const next = await browserEcosystemClient.marketplace()
      setItems(next)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Marketplace service is unavailable.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    browserEcosystemClient
      .marketplace()
      .then((next) => {
        if (!active) return
        setItems(next)
        setError('')
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Marketplace service is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <AppShell title="Marketplace">
      {loading && <StateView kind="loading" title="Loading marketplace" desc="Reading approved catalogue versions." />}
      {!loading && error && (
        <StateView
          kind="error"
          title="Marketplace unavailable"
          desc={error}
          action={<Button onClick={() => refresh()}>Retry</Button>}
        />
      )}
      {!loading && !error && (
        <section>
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.versionId} className="p-card-padding">
                <h2 className="text-title font-semibold text-on-surface">{item.name || 'Marketplace item'}</h2>
                {item.description && <p className="mt-1 text-body-sm text-on-surface-variant">{item.description}</p>}
                <Button full className="mt-4" disabled>
                  Available soon
                </Button>
              </Card>
            ))}
            {!items.length && (
              <StateView
                kind="empty"
                title="No items are available yet"
                desc="Marketplace items will appear here when they are available."
              />
            )}
          </div>
        </section>
      )}
    </AppShell>
  )
}
