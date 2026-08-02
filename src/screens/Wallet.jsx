import { useSearchParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import {
  Badge, Button, Card, DataRow, Disclosure, Icon, List, Progress, Row, SectionTitle, tone, IconTile,
}  from '../components/ui.jsx'
import StateView, { LoadingView } from '../components/states/StateView.jsx'
import { useNotify } from '../components/notifications/Notify.jsx'
import { useMockRequest, useOnline } from '../lib/appState.js'
import { earningSources } from '../data/mock.js'

const stateTone = { Pending: 'outline', Promotional: 'secondary', Confirmed: 'tertiary' }

export default function Wallet() {
  const total = earningSources.reduce((s, e) => s + parseFloat(e.amount.replace('$', '')), 0)
  const online = useOnline()
  const notify = useNotify()

  /* Money is the one screen where a stale figure is worse than no figure, so
     it loads rather than appearing instantly, and it says so when it cannot.
     The failure is caller-controlled: `/wallet?state=error` reproduces the
     outage path on demand instead of failing at random. */
  const [params] = useSearchParams()
  const { data, loading, error, retry } = useMockRequest(earningSources, {
    shouldFail: params.get('state') === 'error',
  })

  /* A withdrawal with no connection fails before it starts — better to say so
     than to spin. */
  const withdraw = () => {
    if (!online) {
      notify({
        kind: 'error',
        title: "Can't withdraw offline",
        body: 'Reconnect and try again — nothing has been taken from your balance.',
      })
      return
    }
    notify({ kind: 'success', title: 'Withdrawal requested', body: 'You will be notified once it is reviewed.' })
  }

  if (!online) {
    return (
      <AppShell title="Wallet" back avatar={false}>
        <StateView
          live
          kind="offline"
          title="You're offline"
          desc="Balances are hidden until we can confirm them — a figure we can't verify is worse than none."
          action={
            <Button variant="ghost" icon="refresh" onClick={retry}>
              Try again
            </Button>
          }
        />
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell title="Wallet" back avatar={false}>
        <LoadingView title="Loading your wallet" desc="Confirming balances and pending payouts." />
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell title="Wallet" back avatar={false}>
        <StateView
          live
          kind="error"
          title="We couldn't load your wallet"
          desc="Your balance and payouts are safe — this is a problem reaching the server, not with your account."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon="refresh" onClick={retry}>
                Try again
              </Button>
              <Button variant="ghost" to="/support">
                Contact support
              </Button>
            </div>
          }
        />
      </AppShell>
    )
  }

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
          <Button variant="tonal" size="lg" icon="arrow_outward" full onClick={withdraw}>
            Withdraw
          </Button>
        </div>
      </section>

      {/* -------------------------------------------------------- earnings
          A breakdown is a table of figures, not four identical cards. */}
      <section>
        <SectionTitle action="Last 30 days">Where it came from</SectionTitle>
        <List>
          {data.map((s) => {
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
