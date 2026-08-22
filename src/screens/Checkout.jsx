import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Disclosure, Field, GradIcon, Icon, SectionTitle, Toast, tone } from '../components/ui.jsx'
import { packages, paymentMethods } from '../data/mock.js'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

const FEE_RATE = 0.025

export default function Checkout() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const p = packages.find((x) => x.slug === slug)
  const paymentPolicy = getSensitiveActionPolicy('payment.checkout')

  const [method, setMethod] = useState('card')
  const [promo, setPromo] = useState('')
  const [applied, setApplied] = useState(false)
  const [paying, setPaying] = useState(false)
  const [toast, setToast] = useState('')

  if (!p) return <Navigate to="/packages" replace />

  if (!runtimeConfig.isDemo && !paymentPolicy.authoritative) {
    return (
      <AppShell title="Checkout unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live payments are not connected"
          desc="WRS will not collect card details, show bank or crypto instructions, or activate a package until an authoritative payment service is configured and verified."
          action={<Button to={`/packages/${p.slug}`}>Back to package</Button>}
        />
      </AppShell>
    )
  }

  const c = tone(p.tone)
  const discount = applied ? Math.round(p.price * 0.05 * 100) / 100 : 0
  const fee = Math.round((p.price - discount) * FEE_RATE * 100) / 100
  const total = Math.round((p.price - discount + fee) * 100) / 100

  const applyPromo = () => {
    if (!promo.trim()) return setToast('Enter a demo referral or promo code')
    setApplied(true)
    setToast('Demo promo preview — illustrative 5% discount only')
    setTimeout(() => setToast(''), 2400)
  }

  const pay = () => {
    if (!paymentPolicy.enabled) {
      setToast(paymentPolicy.reason)
      return
    }
    setPaying(true)
    setTimeout(() => navigate(`/packages/${p.slug}/success?demo=1`, { replace: true }), 500)
  }

  return (
    <AppShell title="Checkout demo" subtitle={`${p.name} Package · no payment will be taken`} back avatar={false}>
      <Disclosure icon="science">
        This is a checkout preview. Do not enter real payment credentials or send funds. No package entitlement will be created.
      </Disclosure>

      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className="relative flex items-center gap-4">
            <RobotFace tier={p.slug} size={72} animate className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-headline-md text-headline-md text-on-surface">{p.name} Package</h2>
                <Badge t="outline">Demo</Badge>
              </div>
              <p className="text-label-sm text-outline">{p.robotClass}</p>
              <p className={`mt-1 text-label-md ${c.text}`}>Illustrative one-time activation</p>
            </div>
            <p className="font-headline-lg text-[26px] font-bold text-on-surface">${p.price.toLocaleString()}</p>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Payment method preview</SectionTitle>
        <div className="space-y-2">
          {paymentMethods.map((m) => {
            const active = method === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`surface flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all active:scale-[.99] ${
                  active ? 'border-tertiary/50 bg-tertiary/[.06]' : 'hover:border-white/25'
                }`}
              >
                <GradIcon icon={m.icon} from={m.from} to={m.to} size={44} radius={14} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-md font-medium text-on-surface">{m.label}</span>
                  <span className="block truncate text-label-sm text-outline">Demo method — no funds are accepted</span>
                </span>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${active ? 'border-tertiary bg-tertiary' : 'border-outline-variant'}`}>
                  {active && <Icon name="check" className="text-[14px] text-background" />}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {method === 'card' && (
        <section className="space-y-3">
          <SectionTitle className="!mb-0">Demo card form</SectionTitle>
          <Field label="Card number" icon="credit_card" placeholder="Demo values only" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry" icon="event" placeholder="MM / YY" />
            <Field label="CVV" icon="lock" placeholder="•••" type="password" />
          </div>
          <Field label="Name on card" icon="person" placeholder="Demo User" />
        </section>
      )}

      {method === 'bank' && (
        <Card className="p-card-padding text-center">
          <Icon name="account_balance" className="text-[44px] text-tertiary" />
          <p className="mt-3 text-title text-on-surface">Demo bank transfer</p>
          <p className="mt-1 text-body-md text-on-surface-variant">No bank account or transfer reference is provided in demo mode. Do not send funds.</p>
        </Card>
      )}

      {method === 'crypto' && (
        <Card className="p-card-padding text-center">
          <Icon name="currency_bitcoin" className="text-[44px] text-tertiary" />
          <p className="mt-3 text-title text-on-surface">Demo crypto payment</p>
          <p className="mt-1 text-body-md text-on-surface-variant">No wallet address is provided in demo mode. Do not send cryptocurrency.</p>
        </Card>
      )}

      <section>
        <SectionTitle className="!mb-0">Demo referral or promo code</SectionTitle>
        <div className="mt-3 flex gap-3">
          <input
            value={promo}
            onChange={(e) => setPromo(e.target.value.toUpperCase())}
            placeholder="DEMO-CODE"
            className="flex-1 rounded-xl border border-outline-variant bg-black/30 px-4 py-3 text-on-surface outline-none placeholder:text-outline focus:border-tertiary"
          />
          <Button variant="tonal" onClick={applyPromo} disabled={applied}>
            {applied ? 'Previewed' : 'Preview'}
          </Button>
        </div>
      </section>

      <section>
        <SectionTitle>Illustrative order summary</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            [`${p.name} Package`, `$${p.price.toLocaleString()}`, 'text-on-surface'],
            ['Demo discount', discount ? `-$${discount.toFixed(2)}` : '—', discount ? 'text-success' : 'text-outline'],
            ['Illustrative processing fee (2.5%)', `$${fee.toFixed(2)}`, 'text-on-surface-variant'],
          ].map(([k, v, cls]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className={`text-label-md ${cls}`}>{v}</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-white/[.03] px-5 py-4">
            <span className="text-body-lg font-semibold text-on-surface">Demo total</span>
            <span className="font-headline-md text-headline-md text-tertiary">${total.toFixed(2)}</span>
          </div>
        </Card>
      </section>

      <div className="space-y-3">
        <Button full size="lg" onClick={pay} disabled={paying || !paymentPolicy.enabled} icon="visibility">
          {paying ? 'Opening preview…' : 'Preview successful purchase'}
        </Button>
        <Button to={`/packages/${p.slug}`} variant="ghost" full size="lg">Back to Package</Button>
        <Disclosure icon="shield">Demo only — no money is charged, no receipt is issued, and no package or robot is provisioned.</Disclosure>
      </div>

      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
