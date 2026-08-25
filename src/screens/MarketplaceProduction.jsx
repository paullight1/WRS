import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, SectionTitle } from '../components/ui.jsx'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'

function money(minor, currency) {
  if (Number(minor || 0) === 0) return 'Free'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(minor) / 100)
}

function key(prefix) {
  return `${prefix}:${crypto.randomUUID()}`
}

export default function MarketplaceProduction() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

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

  const acquire = async (item) => {
    setBusy(item.versionId)
    setMessage('')
    try {
      await browserEcosystemClient.acquire(item.versionId, key('marketplace-acquire'))
      setMessage(`${item.name} entitlement confirmed by the server.`)
      await refresh({ showLoading: false })
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Marketplace acquisition failed.')
    } finally {
      setBusy('')
    }
  }

  const install = async (item) => {
    if (!item.entitlementId) return
    setBusy(item.versionId)
    setMessage('')
    try {
      await browserEcosystemClient.install(item.entitlementId)
      setMessage(`${item.name} installed into the authoritative robot skill state.`)
      await refresh({ showLoading: false })
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Marketplace installation failed.')
    } finally {
      setBusy('')
    }
  }

  return (
    <AppShell title="Marketplace" subtitle="Verified robot capabilities">
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
          <SectionTitle action={`${items.length} approved`}>Catalogue</SectionTitle>
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.versionId} className="p-card-padding">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-title font-semibold text-on-surface">{item.name}</h2>
                    <p className="mt-1 text-body-sm text-on-surface-variant">{item.description}</p>
                    <p className="mt-2 text-label-sm text-outline">
                      v{item.version} · {item.itemType} · {item.minPackageSlug}+
                    </p>
                  </div>
                  <Badge t={item.installed ? 'success' : item.entitlementId ? 'tertiary' : 'outline'}>
                    {item.installed
                      ? 'Installed'
                      : item.entitlementId
                        ? 'Owned'
                        : money(item.priceMinor, item.currency)}
                  </Badge>
                </div>
                {!item.entitlementId && (
                  <Button full className="mt-4" loading={busy === item.versionId} onClick={() => acquire(item)}>
                    {item.priceMinor === 0 ? 'Get entitlement' : `Buy for ${money(item.priceMinor, item.currency)}`}
                  </Button>
                )}
                {item.entitlementId && !item.installed && (
                  <Button full className="mt-4" loading={busy === item.versionId} onClick={() => install(item)}>
                    Install verified capability
                  </Button>
                )}
              </Card>
            ))}
            {!items.length && (
              <StateView
                kind="empty"
                title="No approved marketplace items"
                desc="Only reviewed published versions appear here."
              />
            )}
          </div>
        </section>
      )}
      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}
    </AppShell>
  )
}
