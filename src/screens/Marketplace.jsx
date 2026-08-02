import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import {
  ACCENTS, Badge, Button, Card, ChipBar, Field, Icon, IconTile, List, SectionTitle, Tabs,
} from '../components/ui.jsx'
import StateView from '../components/states/StateView.jsx'
import { useNotify } from '../components/notifications/Notify.jsx'
import { marketplaceCategories, marketplaceItems, installedItems, packageTiers, robot } from '../data/mock.js'

const OWNER_TIER = 'Professional'
const ownerRank = packageTiers.indexOf(OWNER_TIER)
const compatible = (item) => packageTiers.indexOf(item.requires) <= ownerRank

const price = (n) => (n === 0 ? 'Free' : `$${n}`)

/* Rating and install count sit together — a number without a sample size is
   not evidence, and this is a screen where people spend money. */
function Rating({ value, reviews }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon name="star" className="text-[14px] text-[#f7c948]" fill />
      <span className="tnum">{value}</span>
      <span className="text-outline">({reviews.toLocaleString()})</span>
    </span>
  )
}

/* ------------------------------------------------------------- browse row */
function ItemRow({ item, onAct }) {
  const ok = compatible(item)
  return (
    <div className="flex items-start gap-3.5 px-4 py-3.5">
      <IconTile icon={item.icon} accent={ACCENTS[item.accent]} size={44} radius={13} iconSize={23} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-title text-on-surface">{item.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-label-sm text-on-surface-variant">
          <span className="truncate">{item.dev}</span>
          <span aria-hidden="true">·</span>
          <Rating value={item.rating} reviews={item.reviews} />
        </p>
        {!ok && (
          <p className="mt-1 inline-flex items-center gap-1 text-label-sm text-[#f7c948]">
            <Icon name="lock" className="text-[13px]" />
            Needs {item.requires}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={`tnum text-label-md ${item.price === 0 ? 'text-success' : 'text-on-surface'}`}>
          {price(item.price)}
        </span>
        {ok ? (
          <Button size="sm" variant={item.price === 0 ? 'tertiary' : 'primary'} onClick={() => onAct(item)}>
            {item.price === 0 ? 'Install' : 'Get'}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" to="/packages">
            Upgrade
          </Button>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- installed row */
function InstalledRow({ item, onAct }) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      <IconTile icon={item.icon} accent={ACCENTS[item.accent]} size={44} radius={13} iconSize={23} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-title text-on-surface">{item.name}</p>
        <p className="truncate font-data text-data-sm text-on-surface-variant">
          v{item.version}
          {item.update && ` → v${item.next}`} · {item.size} · {item.updated}
        </p>
      </div>

      {item.update ? (
        <Button size="sm" onClick={() => onAct(item)}>
          Update
        </Button>
      ) : (
        <span className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
          <Icon name="check" className="text-[16px] text-success" />
          Current
        </span>
      )}
    </div>
  )
}

export default function Marketplace() {
  const [tab, setTab] = useState('Browse')
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const notify = useNotify()

  const updates = installedItems.filter((i) => i.update)

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

  // The hero only earns its space on an unfiltered first view.
  const showHero = tab === 'Browse' && cat === 'All' && !query
  const hero = marketplaceItems.find((i) => i.featured)
  const rows = showHero ? list.filter((i) => i.id !== hero.id) : list

  // Installs now go through the app-wide notification layer, so the
  // confirmation survives navigating away from this screen.
  const fire = (msg) => notify({ kind: 'success', title: msg })

  return (
    <AppShell
      title="Marketplace"
      subtitle={`For ${robot.name}`}
      right={
        <Link
          to="/wallet"
          className="tap mr-1 inline-flex items-center rounded-full border border-white/12 px-3 text-label-md text-on-surface transition-colors duration-fast hover:bg-white/[.06]"
        >
          <span className="tnum">$154.40</span>
        </Link>
      }
    >
      {/* ---------------------------------------------------------- updates
          Keeping something working beats buying something new, so pending
          updates lead the screen and are actionable in one tap. */}
      {updates.length > 0 && (
        <section>
          <Card accent={ACCENTS.amber} className="flex items-center gap-3.5 p-4">
            <IconTile icon="system_update_alt" accent={ACCENTS.amber} size={40} radius={12} />
            <div className="min-w-0 flex-1">
              <p className="text-title text-on-surface">
                {updates.length} update{updates.length > 1 ? 's' : ''} available
              </p>
              <p className="truncate text-body-sm text-on-surface-variant">
                {updates.map((u) => u.name).join(', ')}
              </p>
            </div>
            <Button size="sm" onClick={() => fire('Updating 2 items')}>
              Update all
            </Button>
          </Card>
        </section>
      )}

      <Tabs items={['Browse', 'Installed']} value={tab} onChange={setTab} />

      {tab === 'Browse' ? (
        <>
          <Field
            placeholder="Search skills, packs and modules"
            icon="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search the marketplace"
          />

          <ChipBar items={marketplaceCategories} value={cat} onChange={setCat} visible={3} />

          {/* ------------------------------------------------------- feature
              One item given real space, with the blurb a row can't carry.
              A different shape from the list below, so the screen isn't one
              repeated card six times. */}
          {showHero && (
            <section>
              <Card accent={ACCENTS[hero.accent]} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <IconTile icon={hero.icon} accent={ACCENTS[hero.accent]} size={56} radius={16} iconSize={30} />
                  <Badge t="tertiary">Editor's pick</Badge>
                </div>
                <h3 className="mt-3.5 font-headline-md text-headline-md text-on-surface">{hero.name}</h3>
                <p className="mt-1 text-body-md text-on-surface-variant">{hero.blurb}</p>
                <p className="mt-2.5 flex flex-wrap items-center gap-x-2 text-label-sm text-on-surface-variant">
                  <span>{hero.dev}</span>
                  <span aria-hidden="true">·</span>
                  <Rating value={hero.rating} reviews={hero.reviews} />
                  <span aria-hidden="true">·</span>
                  <span>{hero.size}</span>
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Button className="flex-1" onClick={() => fire(`Installing ${hero.name}`)}>
                    Get for {price(hero.price)}
                  </Button>
                  <Button variant="ghost" onClick={() => fire('Added to your list')} icon="bookmark_border">
                    Save
                  </Button>
                </div>
              </Card>
            </section>
          )}

          <section>
            <SectionTitle action={`${rows.length} item${rows.length === 1 ? '' : 's'}`}>
              {cat === 'All' ? (query ? 'Results' : 'All items') : cat}
            </SectionTitle>

            {rows.length ? (
              <List>
                {rows.map((it) => (
                  <ItemRow key={it.id} item={it} onAct={(i) => fire(`Installing ${i.name}`)} />
                ))}
              </List>
            ) : (
              <StateView
                live
                kind="noResults"
                title={query ? `Nothing matches "${q}"` : `No items in ${cat} yet`}
                desc="Try a different category, or search by developer name — new packs are published weekly."
                action={
                  <Button
                    variant="ghost"
                    size="sm"
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
        </>
      ) : (
        /* --------------------------------------------------------- installed */
        <section>
          <SectionTitle action={`${installedItems.length} installed`}>On {robot.name}</SectionTitle>
          <List>
            {installedItems.map((it) => (
              <InstalledRow key={it.id} item={it} onAct={(i) => fire(`Updating ${i.name}`)} />
            ))}
          </List>
          <p className="mt-3 text-label-sm text-on-surface-variant">
            Storage used by installed packs: 206 MB of 8 GB.
          </p>
        </section>
      )}

    </AppShell>
  )
}
