import { useSearchParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { Button, Card, DataRow, Disclosure, List, Progress, Row, SectionTitle, tone, IconTile } from '../components/ui.jsx'
import StateView, { LoadingView } from '../components/states/StateView.jsx'
import { useNotify } from '../components/notifications/Notify.jsx'
import { useMockRequest, useOnline } from '../lib/appState.js'
import { earningSources } from '../data/mock.js'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

export default function Wallet() {
  const total = earningSources.reduce((s, e) => s + parseFloat(e.amount.replace('$', '')), 0)
  const online = useOnline()
  const notify = useNotify()
  const depositPolicy = getSensitiveActionPolicy('wallet.deposit')
  const withdrawPolicy = getSensitiveActionPolicy('wallet.withdraw')
  const [params] = useSearchParams()
  const { data, loading, error, retry } = useMockRequest(earningSources, { shouldFail: params.get('state') === 'error' })

  if (!runtimeConfig.isDemo) {
    return (
      <AppShell title="Wallet unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live wallet ledger is not connected"
          desc="WRS hides all mock balances, payout history and payment details outside demo mode. Deposits and withdrawals remain closed until an authoritative ledger and payout service pass their production gates."
          action={<Button to="/home">Back to dashboard</Button>}
        />
      </AppShell>
    )
  }

  const previewDeposit = () => notify({ kind: 'info', title: 'Demo only', body: 'No funds were added and no ledger entry was created.' })
  const previewWithdraw = () => {
    if (!online) {
      notify({ kind: 'error', title: "Can't preview withdrawal offline", body: 'Reconnect and try again. No balance is affected.' })
      return
    }
    notify({ kind: 'info', title: 'Demo withdrawal preview', body: 'No withdrawal was created and no balance was changed.' })
  }

  if (!online) {
    return (
      <AppShell title="Wallet demo" back avatar={false}>
        <StateView live kind="offline" title="You're offline" desc="Demo balances are hidden while offline." action={<Button variant="ghost" icon="refresh" onClick={retry}>Try again</Button>} />
      </AppShell>
    )
  }
  if (loading) return <AppShell title="Wallet demo" back avatar={false}><LoadingView title="Loading demo wallet" desc="Loading illustrative values." /></AppShell>
  if (error) return <AppShell title="Wallet demo" back avatar={false}><StateView live kind="error" title="We couldn't load the demo wallet" desc="No live account data is involved." action={<Button icon="refresh" onClick={retry}>Try again</Button>} /></AppShell>

  return (
    <AppShell title="Wallet demo" back avatar={false}>
      <section>
        <p className="text-label-md text-on-surface-variant">Illustrative available balance</p>
        <p className="tnum mt-1 font-headline-lg text-headline-lg font-bold leading-none text-on-surface">$154.40</p>
        <p className="mt-2 text-body-sm text-on-surface-variant"><span className="text-tertiary">$32.00 demo pending</span> · $186.40 illustrative total</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button size="lg" icon="add" full disabled={!depositPolicy.enabled} onClick={previewDeposit}>Preview deposit</Button>
          <Button variant="tonal" size="lg" icon="arrow_outward" full disabled={!withdrawPolicy.enabled && !runtimeConfig.isDemo} onClick={previewWithdraw}>Preview withdrawal</Button>
        </div>
      </section>

      <section>
        <SectionTitle action="Demo period">Illustrative sources</SectionTitle>
        <List>
          {data.map((s) => {
            const c = tone(s.tone)
            const pct = Math.round((parseFloat(s.amount.replace('$', '')) / total) * 100)
            return <Row key={s.label} iconNode={<IconTile icon={s.icon} accent={c.accent} size={36} radius={12} iconSize={18} />} title={s.label} value={s.amount} meta={`Demo · ${s.state}`}><span className="mt-1.5 flex items-center gap-2"><Progress value={pct} height="h-1" className="max-w-[120px]" label={`${s.label} demo share`} /><span className="text-label-sm text-on-surface-variant">{pct}%</span></span></Row>
          })}
        </List>
      </section>

      <section>
        <SectionTitle>Illustrative account</SectionTitle>
        <Card className="divide-hairline">
          <DataRow label="Demo total earned" value="$642.80" />
          <DataRow label="Demo total withdrawn" value="$456.40" />
          <DataRow label="Payment method" value="Not connected" />
          <DataRow label="Display currency" value="USD" />
        </Card>
      </section>

      <section><List><Row icon="history" t="outline" title="Demo transaction history" to="/wallet/transactions" /><Row icon="database" t="tertiary" title="Demo AI data revenue" to="/wallet/data-revenue" /></List></section>
      <Disclosure icon="gavel">All figures on this screen are illustrative. No live balance, payout, deposit or withdrawal exists in demo mode.</Disclosure>
    </AppShell>
  )
}
