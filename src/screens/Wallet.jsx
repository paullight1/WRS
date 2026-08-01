import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Disclosure, Icon, ListRow, SectionTitle, StatusDot, tone } from '../components/ui.jsx'
import { earningSources } from '../data/mock.js'

export default function Wallet() {
  return (
    <AppShell title="Wallet & Earnings" back avatar={false}>
      <section className="text-center">
        <p className="text-label-md font-label-md uppercase tracking-widest text-on-surface-variant">Total Balance</p>
        <h2 className="mt-1 font-headline-lg text-[44px] font-bold text-tertiary text-glow-cyan">$186.40</h2>
        <div className="mt-2 flex justify-center">
          <StatusDot label="Live updates active" />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <Button size="lg" icon="add_circle" full>
          Deposit
        </Button>
        <Button variant="tonal" size="lg" icon="account_balance_wallet" full>
          Withdraw
        </Button>
      </div>

      <section>
        <SectionTitle action="Last 30 Days">Earnings Sources</SectionTitle>
        <div className="space-y-3">
          {earningSources.map((s) => {
            const c = tone(s.tone)
            return (
              <Card key={s.label} className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${c.bg} ${c.border}`}>
                    <Icon name={s.icon} className={`${c.text} text-[22px]`} fill />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-body-md font-semibold text-on-surface">{s.label}</p>
                    <p className="text-label-sm font-label-sm text-on-surface-variant">{s.share}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-body-lg font-bold text-on-surface">{s.amount}</p>
                  <Badge t={s.state === 'Pending' ? 'outline' : s.state === 'Promotional' ? 'secondary' : 'tertiary'}>
                    {s.state}
                  </Badge>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <section>
        <SectionTitle>Wallet information</SectionTitle>
        <Card className="divide-y divide-white/5">
          {[
            ['Available balance', '$154.40', 'text-tertiary'],
            ['Pending balance', '$32.00', 'text-outline'],
            ['Total earned', '$642.80', 'text-on-surface'],
            ['Total withdrawn', '$456.40', 'text-on-surface'],
            ['Payment method', 'Bank transfer — ****4821', 'text-on-surface'],
            ['Currency preference', 'USD', 'text-on-surface'],
          ].map(([k, v, cls]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className={`font-label-md text-label-md ${cls}`}>{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <div className="space-y-2">
        <ListRow icon="history" t="outline" title="Transaction History" subtitle="All movements in and out" to="/wallet/transactions" />
        <ListRow icon="database" t="tertiary" title="AI Data Revenue" subtitle="Dataset participation & payouts" to="/wallet/data-revenue" />
      </div>

      <Disclosure icon="gavel">
        Every figure is labelled confirmed, pending, estimated or promotional. Earnings are never guaranteed and depend
        on verified activity, approved data or real service revenue.
      </Disclosure>
    </AppShell>
  )
}
