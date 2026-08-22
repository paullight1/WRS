import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import Worksite3D from '../components/robot3d/Worksite3D.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Disclosure, Field, SectionTitle } from '../components/ui.jsx'
import { browserDeploymentClient } from '../infrastructure/deployment/browserDeploymentClient.ts'

function idempotency(prefix) {
  return `${prefix}:${crypto.randomUUID()}`
}

function money(minor, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(minor || 0) / 100)
}

export default function ActiveDeploymentProduction() {
  const { id } = useParams()
  const [deployment, setDeployment] = useState(null)
  const [opportunity, setOpportunity] = useState(null)
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [taskReference, setTaskReference] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [units, setUnits] = useState('0')

  const load = async () => {
    if (!id) {
      setError('Deployment ID is required.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const record = await browserDeploymentClient.deployment(id)
      if (!record) throw new Error('Deployment not found or not owned by this account.')
      setDeployment(record)
      const detail = await browserDeploymentClient.detail(record.opportunityId)
      setOpportunity(detail?.opportunity || null)
      setContract(await browserDeploymentClient.contract(record.contractId))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Deployment could not be verified.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const transition = async (state, reason) => {
    if (!deployment) return
    setBusy(true)
    setMessage('')
    try {
      const next = await browserDeploymentClient.transition(deployment.id, state, reason, idempotency(`deployment-${state}`))
      setDeployment(next)
      setMessage(`Deployment state confirmed as ${next.status}.`)
    } catch (reasonValue) {
      setMessage(reasonValue instanceof Error ? reasonValue.message : 'Deployment state change failed.')
    } finally {
      setBusy(false)
    }
  }

  const recordWork = async () => {
    if (!deployment) return
    setBusy(true)
    setMessage('')
    try {
      const duration = Number(durationMinutes || 0)
      const unitCount = Number(units || 0)
      const result = await browserDeploymentClient.recordWork(deployment.id, {
        taskReference: taskReference.trim(),
        durationMinutes: duration,
        units: unitCount,
        idempotencyKey: idempotency('work-evidence'),
        metadata: { source: 'owner-workspace' },
      })
      setMessage(`Work evidence ${result.workLogId} recorded as ${result.verificationStatus}. It has not created earnings yet.`)
      setTaskReference('')
      setDurationMinutes('')
      setUnits('0')
    } catch (reasonValue) {
      setMessage(reasonValue instanceof Error ? reasonValue.message : 'Work evidence could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <AppShell title="Deployment" back avatar={false}>
        <StateView kind="loading" title="Loading deployment" desc="Reading server-owned state and contract terms." />
      </AppShell>
    )
  }
  if (error || !deployment) {
    return (
      <AppShell title="Deployment unavailable" back avatar={false}>
        <StateView
          kind="noResults"
          title="Deployment unavailable"
          desc={error || 'This deployment is unavailable.'}
          action={<Button to="/deploy">Back to deployments</Button>}
        />
      </AppShell>
    )
  }

  const terminal = ['completed', 'cancelled', 'failed'].includes(deployment.status)

  return (
    <AppShell title="Deployment workspace" subtitle={`State v${deployment.version}`} back avatar={false}>
      <Card className="overflow-hidden p-0">
        <Worksite3D industry={opportunity?.industryName || 'Deployment'} height={190} />
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-label-sm text-outline">{opportunity?.industryName || 'Verified deployment'}</p>
            <h1 className="mt-1 text-title font-semibold text-on-surface">{opportunity?.title || deployment.id}</h1>
            <p className="mt-1 font-data text-data-sm text-outline">{deployment.id}</p>
          </div>
          <Badge t={deployment.status === 'active' ? 'success' : deployment.status === 'paused' ? 'gold' : 'outline'}>
            {deployment.status}
          </Badge>
        </div>
      </Card>

      <section>
        <SectionTitle>Authoritative contract</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Contract ID', deployment.contractId],
            ['Contract status', contract?.status || 'unavailable'],
            ['Rate', contract ? `${money(contract.rateMinor, contract.currency)} / ${contract.rateUnit}` : 'Unavailable'],
            ['Scheduled start', deployment.scheduledStart ? new Date(deployment.scheduledStart).toLocaleString() : 'Not specified'],
            ['Scheduled end', deployment.scheduledEnd ? new Date(deployment.scheduledEnd).toLocaleString() : 'Not specified'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{label}</span>
              <span className="max-w-[62%] break-all text-right text-label-md text-on-surface">{value}</span>
            </div>
          ))}
        </Card>
        <p className="mt-2 text-label-sm text-outline">Contract rate is not a wallet balance. Only internally verified completed work can be settled.</p>
      </section>

      {!terminal && (
        <section>
          <SectionTitle>Deployment controls</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {deployment.status === 'scheduled' && (
              <Button loading={busy} onClick={() => transition('active', 'Owner started scheduled work')}>Start deployment</Button>
            )}
            {deployment.status === 'active' && (
              <Button variant="ghost" loading={busy} onClick={() => transition('paused', 'Owner paused deployment')}>Pause</Button>
            )}
            {deployment.status === 'paused' && (
              <Button loading={busy} onClick={() => transition('active', 'Owner resumed deployment')}>Resume</Button>
            )}
            {['scheduled', 'paused'].includes(deployment.status) && (
              <Button variant="danger" loading={busy} onClick={() => transition('cancelled', 'Owner cancelled deployment')}>Cancel deployment</Button>
            )}
          </div>
        </section>
      )}

      {deployment.status === 'active' && (
        <section>
          <SectionTitle>Submit work evidence</SectionTitle>
          <Card className="space-y-3 p-card-padding">
            <Field label="Task reference" value={taskReference} onChange={(event) => setTaskReference(event.target.value)} placeholder="e.g. pick-batch-0042" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Duration (minutes)" inputMode="numeric" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} placeholder="30" />
              <Field label="Units completed" inputMode="decimal" value={units} onChange={(event) => setUnits(event.target.value)} placeholder="0" />
            </div>
            <Button full loading={busy} disabled={!taskReference.trim()} onClick={recordWork}>Record work evidence</Button>
            <p className="text-label-sm text-outline">Submission creates append-only work evidence with pending verification. The browser cannot mark it verified or set earnings.</p>
          </Card>
        </section>
      )}

      {terminal && (
        <StateView
          kind={deployment.status === 'completed' ? 'success' : 'empty'}
          title={`Deployment ${deployment.status}`}
          desc="This is an immutable operational outcome. Any financial settlement is derived separately from verified work evidence in the ledger."
          action={<Button to="/wallet">Open wallet ledger</Button>}
        />
      )}

      {message && <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">{message}</p>}
      <Disclosure icon="shield">
        Owners can start, pause, resume or cancel permitted states. Completion/failure, work verification and settlement are separate internal operations and cannot be asserted from this browser.
      </Disclosure>
    </AppShell>
  )
}
