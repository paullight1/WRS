import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Button, ChipBar, Icon, List, SectionTitle } from '../components/ui.jsx'
import StateView from '../components/states/StateView.jsx'
import { transactions } from '../data/mock.js'

const filters = ['All', 'Confirmed', 'Pending', 'Completed', 'Promotional']

export default function Transactions() {
  const [f, setF] = useState('All')
  const list = transactions.filter((t) => f === 'All' || t.state === f)

  return (
    <AppShell title="Transactions demo" back avatar={false}>
      <ChipBar items={filters} value={f} onChange={setF} visible={3} />
      {list.length ? (
        <section>
          <SectionTitle action={`${list.length} illustrative entries`}>Sample statement</SectionTitle>
          <List>{list.map((t, i) => <div key={i} className="flex items-center gap-3.5 px-4 py-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${t.positive ? 'bg-tertiary/10' : 'bg-white/[.06]'}`}><Icon name={t.positive ? 'south_west' : 'north_east'} className={`text-[18px] ${t.positive ? 'text-tertiary' : 'text-on-surface-variant'}`} /></span><div className="min-w-0 flex-1"><p className="truncate text-title text-on-surface">{t.label}</p><p className="text-label-sm text-on-surface-variant">Sample record · {t.state}</p></div><p className={`tnum shrink-0 text-title ${t.positive ? 'text-tertiary' : 'text-on-surface'}`}>{t.amount}</p></div>)}</List>
        </section>
      ) : <StateView live kind="noResults" title={`No ${f.toLowerCase()} demo transactions`} desc="These filters operate on illustrative data only." action={<Button variant="ghost" onClick={() => setF('All')}>Show all</Button>} />}
    </AppShell>
  )
}
