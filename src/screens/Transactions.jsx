import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView, { LoadingView } from '../components/states/StateView.jsx'
import { Icon, List, SectionTitle } from '../components/ui.jsx'
import { browserFinanceClient } from '../infrastructure/finance/browserFinanceClient.ts'

function LiveTransactions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    browserFinanceClient
      .transactions('USD')
      .then((result) => {
        if (active) setItems(result.transactions)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Ledger statement could not be loaded.')
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
      <AppShell title="Transactions" back avatar={false}>
        <LoadingView title="Loading ledger statement" desc="Reading immutable wallet entries." />
      </AppShell>
    )
  }
  if (error) {
    return (
      <AppShell title="Transactions" back avatar={false}>
        <StateView kind="error" title="Statement unavailable" desc={error} />
      </AppShell>
    )
  }

  return (
    <AppShell title="Transactions" subtitle="Authoritative wallet ledger" back avatar={false}>
      {items.length ? (
        <section>
          <SectionTitle action={`${items.length} entries`}>Ledger statement</SectionTitle>
          <List>
            {items.map((item) => {
              const incoming = item.direction === 'credit'
              const amount = new Intl.NumberFormat(undefined, { style: 'currency', currency: item.currency }).format(
                item.amountMinor / 100,
              )
              return (
                <div key={`${item.id}:${item.createdAt}`} className="flex items-center gap-3.5 px-4 py-3">
                  <Icon
                    name={incoming ? 'south_west' : 'north_east'}
                    className={incoming ? 'text-tertiary' : 'text-on-surface-variant'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-title text-on-surface">{item.kind.replaceAll('-', ' ')}</p>
                    <p className="truncate font-data text-data-sm text-outline">
                      {item.reference} · {item.status}
                    </p>
                  </div>
                  <span className={`tnum text-title ${incoming ? 'text-tertiary' : 'text-on-surface'}`}>
                    {incoming ? '+' : '-'}
                    {amount}
                  </span>
                </div>
              )
            })}
          </List>
        </section>
      ) : (
        <StateView
          kind="empty"
          title="No wallet entries yet"
          desc="Verified earnings and withdrawals will appear here after they post to the ledger."
        />
      )}
    </AppShell>
  )
}

export default function Transactions() {
  return <LiveTransactions />
}
