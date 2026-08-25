import { useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, ChipBar, Field, Icon, IconTile, List, SectionTitle } from '../components/ui.jsx'
import { marketplaceCategories, marketplaceItems, packageTiers } from '../data/mock.js'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

const OWNER_TIER = 'Professional'
const ownerRank = packageTiers.indexOf(OWNER_TIER)
const compatible = (item) => packageTiers.indexOf(item.requires) <= ownerRank
const price = (n) => (n === 0 ? 'Free' : `$${n}`)

export default function Marketplace() {
  const purchasePolicy = getSensitiveActionPolicy('marketplace.purchase')
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const list = useMemo(
    () =>
      marketplaceItems.filter(
        (i) =>
          (cat === 'All' || i.cat === cat) &&
          (i.name.toLowerCase().includes(query) || i.dev.toLowerCase().includes(query)),
      ),
    [cat, query],
  )

  if (!runtimeConfig.isDemo && !purchasePolicy.authoritative) {
    return (
      <AppShell title="Marketplace unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live marketplace is not connected"
          desc="WRS hides mock prices, ratings and installation state outside demo mode until catalogue, payment, entitlement and version services are authoritative."
          action={<Button to="/home">Back to dashboard</Button>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell title="Marketplace demo" subtitle="Illustrative catalogue — no purchases or installs">
      <Card className="flex items-start gap-3.5 p-4">
        <IconTile icon="storefront" accent="#b07d00" size={42} radius={12} />
        <div className="min-w-0 flex-1">
          <p className="text-title text-on-surface">Read-only commerce preview</p>
          <p className="text-body-sm text-on-surface-variant">
            Prices, ratings, compatibility and installed state are demo data. No wallet charge or robot entitlement can
            be created here.
          </p>
        </div>
        <Badge t="outline">Demo</Badge>
      </Card>

      <Field
        placeholder="Search demo skills, packs and modules"
        icon="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search demo marketplace"
      />
      <ChipBar items={marketplaceCategories} value={cat} onChange={setCat} visible={3} />

      <section>
        <SectionTitle action={`${list.length} demo items`}>Catalogue preview</SectionTitle>
        {list.length ? (
          <List>
            {list.map((item) => {
              const ok = compatible(item)
              return (
                <div key={item.id} className="flex items-start gap-3.5 px-4 py-3.5">
                  <IconTile icon={item.icon} accent="#4a5570" size={44} radius={13} iconSize={23} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-title text-on-surface">{item.name}</p>
                    <p className="mt-0.5 text-label-sm text-on-surface-variant">
                      {item.dev} · demo rating {item.rating}
                    </p>
                    {!ok && (
                      <p className="mt-1 inline-flex items-center gap-1 text-label-sm text-[#f7c948]">
                        <Icon name="lock" className="text-[13px]" />
                        Needs {item.requires}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-label-md text-on-surface">{price(item.price)} demo</p>
                    <Button size="sm" variant="ghost" disabled={!purchasePolicy.authoritative}>
                      Unavailable
                    </Button>
                  </div>
                </div>
              )
            })}
          </List>
        ) : (
          <StateView
            kind="noResults"
            title="No demo items match"
            desc="Try another search or category."
            action={
              <Button
                variant="ghost"
                onClick={() => {
                  setQ('')
                  setCat('All')
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
      </section>

      <Card className="p-card-padding">
        <p className="text-body-md text-on-surface-variant">
          Plan 8 will activate commerce only after server-side catalogue ownership, wallet/payment settlement, immutable
          entitlements, install state and upgrade/version verification are implemented.
        </p>
      </Card>
    </AppShell>
  )
}
