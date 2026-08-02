import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import { Badge, Button, Card, Disclosure, Field, GradIcon, Icon, SectionTitle, Toast, tone } from '../components/ui.jsx'
import { packages, paymentMethods } from '../data/mock.js'

const FEE_RATE = 0.025

export default function Checkout() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const p = packages.find((x) => x.slug === slug)

  const [method, setMethod] = useState('card')
  const [promo, setPromo] = useState('')
  const [applied, setApplied] = useState(false)
  const [paying, setPaying] = useState(false)
  const [toast, setToast] = useState('')

  if (!p) return <Navigate to="/packages" replace />

  const c = tone(p.tone)
  const discount = applied ? Math.round(p.price * 0.05 * 100) / 100 : 0
  const fee = Math.round((p.price - discount) * FEE_RATE * 100) / 100
  const total = Math.round((p.price - discount + fee) * 100) / 100

  const applyPromo = () => {
    if (!promo.trim()) return setToast('Enter a referral or promo code')
    setApplied(true)
    setToast('Promo applied — 5% off')
    setTimeout(() => setToast(''), 2000)
  }

  const pay = () => {
    setPaying(true)
    // Simulated authorisation — no payment provider is wired into the prototype.
    setTimeout(() => navigate(`/packages/${p.slug}/success`, { replace: true }), 1600)
  }

  return (
    <AppShell title="Checkout" subtitle={`${p.name} Package`} back avatar={false}>
      {/* ------------------------------------------------------- order card */}
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className="relative flex items-center gap-4">
            <RobotFace tier={p.slug} size={72} animate className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-headline-md text-headline-md text-on-surface">{p.name} Package</h2>
                {p.badge && <Badge t={p.tone}>{p.badge}</Badge>}
              </div>
              <p className="text-label-sm text-outline">{p.robotClass}</p>
              <p className={`mt-1 text-label-md ${c.text}`}>One-time activation</p>
            </div>
            <p className="font-headline-lg text-[26px] font-bold text-on-surface">${p.price.toLocaleString()}</p>
          </div>
        </Card>
      </section>

      {/* ---------------------------------------------------- payment method */}
      <section>
        <SectionTitle>Payment method</SectionTitle>
        <div className="space-y-2">
          {paymentMethods.map((m) => {
            const active = method === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`surface flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all active:scale-[.99] ${
                  active ? 'border-tertiary/50 bg-tertiary/[.06] shadow-[0_0_20px_-6px_rgba(0,219,231,.5)]' : 'hover:border-white/25'
                }`}
              >
                <GradIcon icon={m.icon} from={m.from} to={m.to} size={44} radius={14} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-md font-medium text-on-surface">{m.label}</span>
                  <span className="block truncate text-label-sm text-outline">{m.desc}</span>
                </span>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all ${
                    active ? 'border-tertiary bg-tertiary' : 'border-outline-variant'
                  }`}
                >
                  {active && <Icon name="check" className="text-[14px] text-background" />}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ------------------------------------------------------- card fields */}
      {method === 'card' && (
        <section className="space-y-3">
          <SectionTitle className="!mb-0">Card details</SectionTitle>
          <Field label="Card number" icon="credit_card" placeholder="4242 4242 4242 4242" inputMode="numeric" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry" icon="event" placeholder="MM / YY" inputMode="numeric" />
            <Field label="CVV" icon="lock" placeholder="•••" inputMode="numeric" type="password" />
          </div>
          <Field label="Name on card" icon="person" placeholder="David Johnson" />
        </section>
      )}

      {method === 'bank' && (
        <Card className="divide-y divide-white/8">
          {[
            ['Bank', 'Providus Bank'],
            ['Account name', 'World Robotic Systems Ltd'],
            ['Account number', '9902 445 118'],
            ['Reference', `WRS-${p.slug.toUpperCase()}-785432`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="text-label-md text-on-surface">{v}</span>
            </div>
          ))}
        </Card>
      )}

      {method === 'crypto' && (
        <Card className="p-card-padding text-center">
          <div className="mx-auto grid h-32 w-32 place-items-center rounded-2xl border border-white/10 bg-white/5">
            <Icon name="qr_code_2" className="text-[86px] text-on-surface" />
          </div>
          <p className="mt-4 break-all text-label-sm text-on-surface-variant">
            TJqfF9k2v1Qh4Zm8RxA7nLd6ScW3bYuP5e
          </p>
          <p className="mt-2 text-label-sm text-outline">Send exactly ${total} USDT (TRC-20)</p>
        </Card>
      )}

      {/* -------------------------------------------------------------- promo */}
      <section>
        <SectionTitle className="!mb-0">Referral or promo code</SectionTitle>
        <div className="mt-3 flex gap-3">
          <input
            value={promo}
            onChange={(e) => setPromo(e.target.value.toUpperCase())}
            placeholder="WRS-DAVID-8842"
            className="flex-1 rounded-xl border border-outline-variant bg-black/30 px-4 py-3 text-on-surface outline-none transition-all placeholder:text-outline focus:border-tertiary focus:shadow-[0_0_15px_rgba(0,219,231,.2)]"
          />
          <Button variant="tonal" onClick={applyPromo} disabled={applied}>
            {applied ? 'Applied' : 'Apply'}
          </Button>
        </div>
      </section>

      {/* ------------------------------------------------------------ summary */}
      <section>
        <SectionTitle>Order summary</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            [`${p.name} Package`, `$${p.price.toLocaleString()}`, 'text-on-surface'],
            ['Promo discount', discount ? `-$${discount.toFixed(2)}` : '—', discount ? 'text-success' : 'text-outline'],
            ['Processing fee (2.5%)', `$${fee.toFixed(2)}`, 'text-on-surface-variant'],
          ].map(([k, v, cls]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className={`text-label-md ${cls}`}>{v}</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-white/[.03] px-5 py-4">
            <span className="text-body-lg font-semibold text-on-surface">Total</span>
            <span className="font-headline-md text-headline-md text-tertiary">${total.toFixed(2)}</span>
          </div>
        </Card>
      </section>

      <div className="space-y-3">
        <Button full size="lg" onClick={pay} disabled={paying} icon={paying ? 'progress_activity' : 'lock'}>
          {paying ? 'Authorising…' : `Pay $${total.toFixed(2)}`}
        </Button>
        <Button to={`/packages/${p.slug}`} variant="ghost" full size="lg">
          Back to Package
        </Button>
        <Disclosure icon="shield">
          Payments are processed over an encrypted channel. A package is a platform access tier — it does not guarantee
          profit, fixed returns, or universal income.
        </Disclosure>
      </div>

      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
