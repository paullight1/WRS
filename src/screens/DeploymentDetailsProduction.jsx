import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import Worksite3D from '../components/robot3d/Worksite3D.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Disclosure, SectionTitle } from '../components/ui.jsx'
import { browserDeploymentClient } from '../infrastructure/deployment/browserDeploymentClient.ts'

function money(minor, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(minor || 0) / 100)
}

function idempotency(prefix) {
  return `${prefix}:${crypto.randomUUID()}`
}

export default function DeploymentDetailsProduction() {
  const { name } = useParams()
  const navigate = useNavigate()
  const opportunityId = decodeURIComponent(name || '')
  const [item, setItem] = useState(null)
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const detail = await browserDeploymentClient.detail(opportunityId)
      setItem(detail)
      if (detail?.contractId) setContract(await browserDeploymentClient.contract(detail.contractId))
      else setContract(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Opportunity could not be verified.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    browserDeploymentClient
      .detail(opportunityId)
      .then(async (detail) => {
        const nextContract = detail?.contractId ? await browserDeploymentClient.contract(detail.contractId) : null
        if (cancelled) return
        setItem(detail)
        setContract(nextContract)
        setError('')
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Opportunity could not be verified.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [opportunityId])

  const requestDeployment = async () => {
    setBusy(true)
    setMessage('')
    try {
      const result = await browserDeploymentClient.request(opportunityId, idempotency('deployment-request'))
      setMessage(
        result.status === 'matched'
          ? 'Your request was matched. Review the immutable contract terms before acceptance.'
          : 'Deployment request recorded. WRS will expose a contract only after server-side matching and eligibility recheck.',
      )
      await load()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Deployment request failed.')
    } finally {
      setBusy(false)
    }
  }

  const acceptContract = async () => {
    if (!contract) return
    setBusy(true)
    setMessage('')
    try {
      const result = await browserDeploymentClient.acceptContract(contract.id, idempotency('contract-accept'))
      if (!result.deployment?.id) throw new Error('The deployment service did not return the scheduled deployment.')
      navigate(`/deploy/active/${result.deployment.id}`)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Contract acceptance failed.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <AppShell title="Deployment opportunity" back avatar={false}>
        <StateView
          kind="loading"
          title="Verifying opportunity"
          desc="Checking server eligibility and current contract state."
        />
      </AppShell>
    )
  }
  if (error || !item?.opportunity) {
    return (
      <AppShell title="Deployment unavailable" back avatar={false}>
        <StateView
          kind={error ? 'error' : 'noResults'}
          title="Opportunity unavailable"
          desc={error || 'This opportunity does not exist or is no longer available.'}
          action={<Button to="/deploy">Back to deployments</Button>}
        />
      </AppShell>
    )
  }

  const opportunity = item.opportunity
  const eligibility = item.eligibility

  return (
    <AppShell title="Deployment opportunity" subtitle={opportunity.clientName} back avatar={false}>
      <Card className="overflow-hidden p-0">
        <Worksite3D industry={opportunity.industryName} height={210} />
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-label-sm text-outline">{opportunity.industryName}</p>
              <h1 className="mt-1 font-headline-md text-headline-md text-on-surface">{opportunity.title}</h1>
            </div>
            <Badge t={eligibility.eligible ? 'tertiary' : 'gold'}>
              {eligibility.eligible ? 'Eligible now' : 'Not eligible'}
            </Badge>
          </div>
          <p className="mt-3 text-body-md text-on-surface-variant">{opportunity.description}</p>
        </div>
      </Card>

      <section>
        <SectionTitle>Verified requirements</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Package', `${opportunity.minPackageSlug}+`],
            ['KYC', opportunity.requireKyc ? 'Verified required' : 'Not required'],
            ['Minimum data quality', `${opportunity.minQualityScore}%`],
            ['Skills', opportunity.requiredSkills.length ? opportunity.requiredSkills.join(', ') : 'None specified'],
            [
              'Certifications',
              opportunity.requiredCertifications.length
                ? opportunity.requiredCertifications.join(', ')
                : 'None specified',
            ],
            [
              'Location',
              opportunity.allowedCountries.length ? opportunity.allowedCountries.join(', ') : 'No country restriction',
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{label}</span>
              <span className="max-w-[60%] text-right text-label-md text-on-surface">{value}</span>
            </div>
          ))}
        </Card>
        {!eligibility.eligible && (
          <p className="mt-3 text-label-sm text-outline">
            Server eligibility blockers: {eligibility.reasons?.join(', ') || 'unknown'}
          </p>
        )}
      </section>

      <section>
        <SectionTitle>Commercial terms</SectionTitle>
        <Card className="p-card-padding">
          <p className="font-headline-md text-headline-md text-on-surface">
            {money(opportunity.rateMinor, opportunity.currency)} / {opportunity.rateUnit}
          </p>
          <p className="mt-2 text-body-sm text-on-surface-variant">
            This is the opportunity's current server rate. It becomes binding only when WRS creates a contract snapshot
            and you accept that exact snapshot. It is not guaranteed earnings.
          </p>
        </Card>
      </section>

      {item.request && (
        <Card className="p-4">
          <p className="text-label-sm text-outline">Your request</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="font-data text-data-sm text-on-surface">{item.request.id}</p>
            <Badge t="primary">{item.request.status}</Badge>
          </div>
        </Card>
      )}

      {contract && (
        <section>
          <SectionTitle>Contract offer</SectionTitle>
          <Card className="space-y-3 p-card-padding">
            <div className="flex items-center justify-between gap-3">
              <span className="text-body-md text-on-surface-variant">Status</span>
              <Badge t={contract.status === 'offered' ? 'tertiary' : 'outline'}>{contract.status}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-body-md text-on-surface-variant">Rate</span>
              <span className="text-title text-on-surface">
                {money(contract.rateMinor, contract.currency)} / {contract.rateUnit}
              </span>
            </div>
            <Disclosure icon="description">
              Contract terms are snapshotted server-side and cannot be edited by the browser after offer creation.
            </Disclosure>
            {contract.status === 'offered' && (
              <Button full loading={busy} onClick={acceptContract}>
                Accept contract &amp; schedule deployment
              </Button>
            )}
          </Card>
        </section>
      )}

      {!item.request && (
        <Button full size="lg" loading={busy} disabled={!eligibility.eligible} onClick={requestDeployment}>
          Request deployment
        </Button>
      )}
      {item.request?.status === 'requested' && !contract && (
        <Button full variant="ghost" onClick={load}>
          Check matching status
        </Button>
      )}
      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}

      <Disclosure icon="verified_user">
        Eligibility is rechecked at request matching and again at contract acceptance. A client-side route transition
        cannot create a contract, deployment, work record or wallet credit.
      </Disclosure>
    </AppShell>
  )
}
