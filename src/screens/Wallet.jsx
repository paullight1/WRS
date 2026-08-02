import AppShell from '../components/AppShell.jsx'
import {
  Badge, Button, Card, DataRow, Disclosure, Icon, List, Progress, Row, SectionTitle, tone, IconTile,
}  from '../components/ui.jsx'
import { earningSources } from '../data/mock.js'

const stateTone = { Pending: 'outline', Promotional: 'secondary', Confirmed: 'tertiary' }

export default function Wallet() {
  const total = earningSources.reduce((s, e) => s + parseFloat(e.amount.replace('$', '')), 0)

  return (
    <AppShell title="Wallet" back avatar={false}>
      {/* ---------------------------------------------------------- balance
          One figure, stated plainly. The split underneath is what a user
          actually acts on, so it sits with the number rather than in a card. */}
      <section>
        <p className="text-label-md text-on-surface-variant">Available balance</p>
        <p className="tnum mt-1 font-headline-lg text-headline-lg font-bold leading-none text-on-surface">$154.40</p>
        <p className="mt-2 text-body-sm text-on-surface-variant">
          <span className="text-tertiary">$32.00 pending</span> · $186.40 total
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button size="lg" icon="add" full>
            Deposit
          </Button>
          <Button variant="tonal" size="lg" icon="arrow_outward" full>
            Withdraw
          </Button>
        </div>
      </section>

      {/* -------------------------------------------------------- earnings
          A breakdown is a table of figures, not four identical cards. */}
      <section>
        <SectionTitle action="Last 30 days">Where it came from</SectionTitle>
        <List>
          {earningSources.map((s) => {
            const c = tone(s.tone)
            const pct = Math.round((parseFloat(s.amount.replace('$', '')) / total) * 100)
            return (
              <Row
                key={s.label}
                iconNode={
                  <IconTile icon={s.icon} accent={c.accent} size={36} radius={12} iconSize={18} />
                }
                title={s.label}
                value={s.amount}
                meta={s.state}
              >
                <span className="mt-1.5 flex items-center gap-2">
                  <Progress value={pct} height="h-1" className="max-w-[120px]" label={`${s.label} share`} />
                  <span className="text-label-sm text-on-surface-variant">{pct}%</span>
                </span>
              </Row>
            )
          })}
        </List>
      </section>

      {/* ------------------------------------------------------- statement */}
      <section>
        <SectionTitle>Account</SectionTitle>
        <Card className="divide-hairline">
          <DataRow label="Total earned" value="$642.80" />
          <DataRow label="Total withdrawn" value="$456.40" />
          <DataRow label="Payment method" value="Bank ****4821" />
          <DataRow label="Currency" value="USD" />
        </Card>
      </section>

      <section>
        <List>
          <Row icon="history" t="outline" title="Transaction history" subtitle="Every movement in and out" to="/wallet/transactions" />
          <Row icon="database" t="tertiary" title="AI data revenue" subtitle="Dataset participation and payouts" to="/wallet/data-revenue" />
        </List>
      </section>

      <Disclosure icon="gavel">
        Every figure is labelled confirmed, pending, estimated or promotional. Earnings are never guaranteed — they
        depend on verified activity, approved data or real service revenue.
      </Disclosure>
    </AppShell>
  )
}
