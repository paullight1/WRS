import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Badge, Card, Chip, Icon, SectionTitle } from '../components/ui.jsx'
import { transactions } from '../data/mock.js'

const filters = ['All', 'Confirmed', 'Pending', 'Completed', 'Promotional']

export default function Transactions() {
  const [f, setF] = useState('All')
  const list = transactions.filter((t) => f === 'All' || t.state === f)

  return (
    <AppShell title="Transaction History" back avatar={false}>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filters.map((x) => (
          <Chip key={x} active={f === x} onClick={() => setF(x)}>
            {x}
          </Chip>
        ))}
      </div>

      <section>
        <SectionTitle action={`${list.length} entries`}>July 2025</SectionTitle>
        <Card className="divide-y divide-white/5">
          {list.map((t, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                  t.positive ? 'border-tertiary/20 bg-tertiary/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <Icon name={t.icon} className={t.positive ? 'text-tertiary text-[20px]' : 'text-outline text-[20px]'} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-md text-on-surface">{t.label}</p>
                <p className="text-label-sm font-label-sm text-outline">{t.date}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-label-md text-label-md ${t.positive ? 'text-tertiary' : 'text-on-surface'}`}>
                  {t.amount}
                </p>
                <Badge t={t.state === 'Pending' ? 'outline' : t.state === 'Promotional' ? 'secondary' : 'tertiary'}>
                  {t.state}
                </Badge>
              </div>
            </div>
          ))}
          {!list.length && <p className="px-5 py-10 text-center text-body-md text-outline">No {f.toLowerCase()} transactions.</p>}
        </Card>
      </section>
    </AppShell>
  )
}
