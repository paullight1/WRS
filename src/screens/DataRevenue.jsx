import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView, { LoadingView } from '../components/states/StateView.jsx'
import { Badge, Card, DataRow, Disclosure, SectionTitle } from '../components/ui.jsx'
import { browserDataClient } from '../infrastructure/data/browserDataClient.ts'
import { runtimeConfig } from '../lib/runtimeConfig.js'

function money(amountMinor, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amountMinor || 0) / 100)
}

function DemoDataRevenue() {
  return (
    <AppShell title="AI Data Revenue demo" back avatar={false}>
      <Disclosure icon="science">
        Demo only. No commercial dataset license, customer payment, contributor allocation or wallet credit is represented
        by this screen.
      </Disclosure>
      <Card className="p-card-padding text-center">
        <Badge t="outline">Illustrative</Badge>
        <p className="mt-4 text-label-md text-outline">Sample contributor revenue</p>
        <p className="tnum mt-2 font-headline-lg text-headline-lg text-on-surface">$29.70</p>
      </Card>
    </AppShell>
  )
}

function LiveDataRevenue() {
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    browserDataClient
      .revenue()
      .then((result) => {
        if (active) setAllocations(result.allocations)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Contributor distributions could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <AppShell title="AI Data Revenue" back avatar={false}>
        <LoadingView
          title="Loading verified distributions"
          desc="Reading contributor allocations linked to paid dataset licenses and ledger entries."
        />
      </AppShell>
    )
  }
  if (error) {
    return (
      <AppShell title="AI Data Revenue" back avatar={false}>
        <StateView kind="error" title="Data revenue unavailable" desc={error} />
      </AppShell>
    )
  }

  const totalByCurrency = allocations.reduce((map, item) => {
    if (item.status === 'distributed') map[item.currency] = (map[item.currency] || 0) + Number(item.amountMinor || 0)
    return map
  }, {})

  return (
    <AppShell title="AI Data Revenue" subtitle="Verified license distributions" back avatar={false}>
      <Disclosure icon="verified_user">
        Revenue appears only after an explicitly paid dataset license uses approved, clean data whose contributor still has
        active research-licensing consent. Distribution posts through the same immutable wallet ledger as Plan 5.
      </Disclosure>
      <section>
        <SectionTitle>Distributed value</SectionTitle>
        <Card className="divide-y divide-white/8">
          {Object.entries(totalByCurrency).length ? (
            Object.entries(totalByCurrency).map(([currency, amountMinor]) => (
              <DataRow key={currency} label={currency} value={money(amountMinor, currency)} />
            ))
          ) : (
            <DataRow label="Verified distributions" value="None yet" />
          )}
        </Card>
      </section>
      <section>
        <SectionTitle action={`${allocations.length} records`}>License allocations</SectionTitle>
        {allocations.length ? (
          <div className="space-y-2">
            {allocations.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-body-md text-on-surface">{item.customerReference || 'Licensed dataset'}</p>
                    <p className="truncate font-data text-data-sm text-outline">{item.licenseReference || item.id}</p>
                  </div>
                  <span className="tnum text-title text-tertiary">{money(item.amountMinor, item.currency)}</span>
                </div>
                <p className="mt-2 text-label-sm text-outline">{item.status} · {item.distributedAt || item.createdAt}</p>
              </Card>
            ))}
          </div>
        ) : (
          <StateView
            kind="empty"
            title="No commercial distributions"
            desc="Contributions are not guaranteed to be licensed or generate revenue."
          />
        )}
      </section>
    </AppShell>
  )
}

export default function DataRevenue() {
  return runtimeConfig.isDemo ? <DemoDataRevenue /> : <LiveDataRevenue />
}
