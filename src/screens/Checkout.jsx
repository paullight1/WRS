import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Disclosure } from '../components/ui.jsx'
import { packages } from '../data/mock.js'
import { browserFinanceClient } from '../infrastructure/finance/browserFinanceClient.ts'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

function createIdempotencyKey(packageSlug) {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `checkout:${packageSlug}:${value}`
}

function LiveCheckout({ packageInfo }) {
  const [idempotencyKey] = useState(() => createIdempotencyKey(packageInfo.slug))
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  const pay = async () => {
    setPaying(true)
    setError('')
    try {
      const initialized = await browserFinanceClient.initializePackagePayment(packageInfo.slug, 'USD', idempotencyKey)
      if (!initialized.authorizationUrl.startsWith('https://')) {
        throw new Error('Payment provider returned an invalid checkout URL.')
      }
      window.location.assign(initialized.authorizationUrl)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Payment could not be initialized.')
      setPaying(false)
    }
  }

  return (
    <AppShell title="Secure checkout" subtitle={`${packageInfo.name} Package`} back avatar={false}>
      <Disclosure icon="shield">
        WRS does not collect card details on this page. The server confirms the active package price, creates one
        idempotent payment intent, and then redirects you to the configured payment provider.
      </Disclosure>

      <Card className="p-card-padding">
        <div className="flex items-center gap-4">
          <RobotFace tier={packageInfo.slug} size={72} animate className="shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="font-headline-md text-headline-md text-on-surface">{packageInfo.name} Package</h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">{packageInfo.robotClass}</p>
            <p className="mt-2 text-label-sm text-outline">
              Final amount and currency are read from the authoritative WRS price record at initialization.
            </p>
          </div>
          <Badge t="tertiary">Live</Badge>
        </div>
      </Card>

      {error && (
        <p role="alert" className="rounded-xl border border-error/30 bg-error/10 p-3 text-label-sm text-error">
          {error}
        </p>
      )}

      <Button full size="lg" icon="lock" loading={paying} onClick={pay}>
        Continue to secure payment
      </Button>
      <Button to={`/packages/${packageInfo.slug}`} variant="ghost" full size="lg">
        Back to package
      </Button>
    </AppShell>
  )
}

function DemoCheckout({ packageInfo }) {
  return (
    <AppShell
      title="Checkout demo"
      subtitle={`${packageInfo.name} Package · no payment will be taken`}
      back
      avatar={false}
    >
      <Disclosure icon="science">
        This is a checkout preview. Do not enter payment credentials or send funds. No package entitlement, receipt or
        ledger transaction is created in demo mode.
      </Disclosure>
      <Card className="p-card-padding text-center">
        <RobotFace tier={packageInfo.slug} size={92} animate className="mx-auto" />
        <Badge t="outline" className="mt-4">
          Demo only
        </Badge>
        <h2 className="mt-4 font-headline-md text-headline-md text-on-surface">{packageInfo.name} Package</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Illustrative catalogue price: ${packageInfo.price.toLocaleString()}. Live checkout uses the server-owned
          price, not this browser value.
        </p>
      </Card>
      <Button to={`/packages/${packageInfo.slug}/success?demo=1`} full size="lg" icon="visibility">
        Preview post-payment state
      </Button>
      <Button to={`/packages/${packageInfo.slug}`} variant="ghost" full size="lg">
        Back to package
      </Button>
    </AppShell>
  )
}

export default function Checkout() {
  const { slug } = useParams()
  const packageInfo = packages.find((item) => item.slug === slug)
  const paymentPolicy = getSensitiveActionPolicy('payment.checkout')

  if (!packageInfo) return <Navigate to="/packages" replace />
  if (runtimeConfig.isDemo) return <DemoCheckout packageInfo={packageInfo} />
  if (!paymentPolicy.authoritative) {
    return (
      <AppShell title="Checkout unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live payments are not available"
          desc={paymentPolicy.reason}
          action={<Button to={`/packages/${packageInfo.slug}`}>Back to package</Button>}
        />
      </AppShell>
    )
  }
  return <LiveCheckout packageInfo={packageInfo} />
}
