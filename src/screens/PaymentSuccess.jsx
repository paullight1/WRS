import { useLocation, useParams, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Disclosure, Icon, SectionTitle } from '../components/ui.jsx'
import { packages } from '../data/mock.js'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { evaluatePaymentSuccessAccess } from '../lib/successAccess.js'

export default function PaymentSuccess() {
  const { slug } = useParams()
  const location = useLocation()
  const p = packages.find((x) => x.slug === slug)
  if (!p) return <Navigate to="/packages" replace />

  // Plan 1 deliberately has no authoritative payment lookup yet. Production
  // therefore fails closed; Plan 5 will provide the verified transaction object.
  const access = evaluatePaymentSuccessAccess({
    mode: runtimeConfig.mode,
    search: location.search,
    authority: null,
  })

  if (!access.allowed) {
    return (
      <AppShell title="Purchase status" back={false} avatar={false}>
        <StateView
          kind="locked"
          title="No verified payment found"
          desc="A URL cannot activate a WRS package. This page only shows a completed purchase after authoritative transaction evidence is verified."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button to={`/packages/${p.slug}`}>Back to package</Button>
              <Button to="/home" variant="ghost">Home</Button>
            </div>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell title="Demo purchase preview" back={false} avatar={false}>
      <Disclosure icon="science">
        No payment was processed. No package entitlement, receipt, wallet entry, or robot provisioning record was created.
      </Disclosure>

      <section>
        <Card className="p-card-padding text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-tertiary/30 bg-tertiary/10">
            <Icon name="visibility" className="text-[38px] text-tertiary" />
          </div>
          <Badge t="outline" className="mt-4">Demo only</Badge>
          <h2 className="mt-4 font-headline-lg-mobile text-[24px] font-bold text-on-surface">
            Preview: {p.name} package
          </h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            This illustrates the product state a verified purchase may unlock later. It is not payment confirmation.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <RobotFace tier={p.slug} size={92} animate />
            <div className="text-left">
              <p className="text-title text-on-surface">{p.robotClass}</p>
              <p className="text-label-sm text-outline">Not provisioned</p>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Illustrative package capabilities</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Package', p.name],
            ['Illustrative price', `$${p.price.toLocaleString()}`],
            ['Payment status', 'Not processed — demo'],
            ['Entitlement status', 'Not created'],
            ['Receipt', 'Not issued'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="text-right text-label-md text-on-surface">{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <div className="space-y-2">
        <Button to={`/packages/${p.slug}`} full size="lg">Return to package</Button>
        <Button to="/home" variant="ghost" full size="lg">Home</Button>
      </div>
    </AppShell>
  )
}
