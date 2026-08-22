import { useEffect, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import StateView, { LoadingView } from '../components/states/StateView.jsx'
import { Badge, Button, Card, Disclosure, Icon, SectionTitle } from '../components/ui.jsx'
import { packages } from '../data/mock.js'
import { browserFinanceClient } from '../infrastructure/finance/browserFinanceClient.ts'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'
import { evaluatePaymentSuccessAccess } from '../lib/successAccess.js'

function DemoSuccess({ packageInfo, search }) {
  const access = evaluatePaymentSuccessAccess({ mode: runtimeConfig.mode, search, authority: null })
  if (!access.allowed) {
    return (
      <AppShell title="Purchase status" back={false} avatar={false}>
        <StateView
          kind="locked"
          title="No verified payment found"
          desc="A URL cannot activate a WRS package. This demo page requires its explicit preview token."
          action={<Button to={`/packages/${packageInfo.slug}`}>Back to package</Button>}
        />
      </AppShell>
    )
  }
  return (
    <AppShell title="Demo purchase preview" back={false} avatar={false}>
      <Disclosure icon="science">
        No payment was processed. No package entitlement, receipt, wallet entry or robot provisioning record was created.
      </Disclosure>
      <Card className="p-card-padding text-center">
        <Icon name="visibility" className="text-[42px] text-tertiary" />
        <Badge t="outline" className="mt-4">
          Demo only
        </Badge>
        <h2 className="mt-4 font-headline-md text-headline-md text-on-surface">Preview: {packageInfo.name} package</h2>
        <RobotFace tier={packageInfo.slug} size={92} animate className="mx-auto mt-5" />
      </Card>
      <Button to={`/packages/${packageInfo.slug}`} full>
        Return to package
      </Button>
    </AppShell>
  )
}

export default function PaymentSuccess() {
  const { slug } = useParams()
  const location = useLocation()
  const packageInfo = packages.find((item) => item.slug === slug)
  const policy = getSensitiveActionPolicy('payment.success')
  const params = new URLSearchParams(location.search)
  const reference = String(params.get('reference') || params.get('trxref') || '').trim()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(() => !runtimeConfig.isDemo)
  const [error, setError] = useState('')

  useEffect(() => {
    if (runtimeConfig.isDemo || !packageInfo || !policy.authoritative || !reference) return undefined
    let active = true
    browserFinanceClient
      .verifyPayment(reference)
      .then((value) => {
        if (active) setResult(value)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Payment verification failed.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [packageInfo, policy.authoritative, reference])

  if (!packageInfo) return <Navigate to="/packages" replace />
  if (runtimeConfig.isDemo) return <DemoSuccess packageInfo={packageInfo} search={location.search} />
  if (!policy.authoritative) {
    return (
      <AppShell title="Purchase status" avatar={false}>
        <StateView kind="locked" title="Payment verification unavailable" desc={policy.reason} />
      </AppShell>
    )
  }
  if (!reference) {
    return (
      <AppShell title="Purchase status" avatar={false}>
        <StateView
          kind="locked"
          title="Payment reference missing"
          desc="WRS cannot activate a package from this URL without a provider reference to verify."
          action={<Button to={`/packages/${packageInfo.slug}`}>Back to package</Button>}
        />
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell title="Verifying payment" avatar={false}>
        <LoadingView title="Checking payment with the provider" desc="No entitlement is activated until verification succeeds." />
      </AppShell>
    )
  }
  if (error || result?.status !== 'succeeded') {
    return (
      <AppShell title="Purchase status" avatar={false}>
        <StateView
          kind={error ? 'error' : 'loading'}
          title={error ? 'Payment could not be verified' : 'Payment is not settled yet'}
          desc={error || 'The provider has not confirmed settlement. Your package remains unchanged until it does.'}
          action={<Button to={`/packages/${packageInfo.slug}`}>Back to package</Button>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell title="Payment verified" back={false} avatar={false}>
      <Disclosure icon="verified_user">
        This state is shown only after WRS re-verifies the provider transaction, matches amount and currency, posts the
        balanced ledger journal and activates the package entitlement atomically.
      </Disclosure>
      <Card className="p-card-padding text-center">
        <Icon name="check_circle" className="text-[46px] text-success" fill />
        <Badge t="tertiary" className="mt-4">
          Authoritative
        </Badge>
        <h2 className="mt-4 font-headline-md text-headline-md text-on-surface">{packageInfo.name} package activated</h2>
        <p className="mt-2 font-data text-data-sm text-outline">Reference {result.reference}</p>
        <RobotFace tier={packageInfo.slug} size={92} animate className="mx-auto mt-5" />
      </Card>
      <section>
        <SectionTitle>Verification</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Provider status', 'Verified success'],
            ['Ledger', 'Posted and balanced'],
            ['Entitlement', 'Active'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{label}</span>
              <span className="text-label-md text-on-surface">{value}</span>
            </div>
          ))}
        </Card>
      </section>
      <Button to="/home" full size="lg">
        Continue to WRS
      </Button>
    </AppShell>
  )
}
