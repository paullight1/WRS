import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import Worksite3D from '../components/robot3d/Worksite3D.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Field, Icon, SectionTitle } from '../components/ui.jsx'
import { browserDeploymentClient } from '../infrastructure/deployment/browserDeploymentClient.ts'

function money(minor, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(minor || 0) / 100)
}

function statusTone(status) {
  if (status === 'active') return 'success'
  if (status === 'completed') return 'tertiary'
  if (status === 'paused') return 'gold'
  return 'outline'
}

export default function DeployProduction() {
  const [tab, setTab] = useState('Available')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [catalog, owned] = await Promise.all([browserDeploymentClient.catalog(), browserDeploymentClient.active()])
      setItems(catalog)
      setDeployments(owned)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Deployment service could not be reached.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const available = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return items
    return items.filter(({ opportunity }) =>
      [opportunity.title, opportunity.industryName, opportunity.clientName, opportunity.description]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    )
  }, [items, query])
  const live = deployments.filter((deployment) => ['scheduled', 'active', 'paused'].includes(deployment.status))
  const history = deployments.filter((deployment) => ['completed', 'cancelled', 'failed'].includes(deployment.status))

  return (
    <AppShell title="Deployments" subtitle="Authoritative opportunity and contract state">
      <div className="surface sticky top-[68px] z-30 flex gap-1 rounded-2xl p-1">
        {['Available', 'Active', 'History'].map((name) => (
          <button
            type="button"
            key={name}
            onClick={() => setTab(name)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-label-md ${
              tab === name ? 'border border-primary/60 bg-primary-container/25 text-primary' : 'text-on-surface-variant'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {loading && (
        <StateView
          kind="loading"
          title="Loading deployments"
          desc="Reading server-owned opportunities and contracts."
        />
      )}
      {!loading && error && (
        <StateView
          kind="error"
          title="Deployment service unavailable"
          desc={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      )}

      {!loading && !error && tab === 'Available' && (
        <>
          <Field
            placeholder="Search opportunities…"
            icon="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <section>
            <SectionTitle action={`${available.length} open`}>Verified opportunities</SectionTitle>
            <div className="space-y-3">
              {available.map(({ opportunity, eligibility }) => (
                <Card key={opportunity.id} className="overflow-hidden p-0">
                  <Worksite3D industry={opportunity.industryName} height={160} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-label-sm text-outline">
                          {opportunity.industryName} · {opportunity.clientName}
                        </p>
                        <h2 className="mt-1 text-title font-semibold text-on-surface">{opportunity.title}</h2>
                        <p className="mt-1 text-body-sm text-on-surface-variant">{opportunity.description}</p>
                      </div>
                      <Badge t={eligibility.eligible ? 'tertiary' : 'gold'}>
                        {eligibility.eligible ? 'Eligible' : 'Requirements unmet'}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-label-sm text-outline">
                      <span>
                        {money(opportunity.rateMinor, opportunity.currency)} / {opportunity.rateUnit}
                      </span>
                      <span>· {opportunity.minPackageSlug}+</span>
                      {opportunity.regulated && <span>· Regulated</span>}
                    </div>
                    {!eligibility.eligible && eligibility.reasons?.length > 0 && (
                      <p className="mt-2 text-label-sm text-outline">
                        Server eligibility: {eligibility.reasons.join(', ')}
                      </p>
                    )}
                    <Button to={`/deploy/${opportunity.id}`} full className="mt-4">
                      Review opportunity
                    </Button>
                  </div>
                </Card>
              ))}
              {!available.length && (
                <StateView
                  kind="noResults"
                  title="No open opportunities"
                  desc="No server-owned deployment currently matches this search."
                />
              )}
            </div>
          </section>
          <Card className="p-4">
            <div className="flex gap-3">
              <Icon name="verified_user" className="text-tertiary" />
              <p className="text-body-sm text-on-surface-variant">
                Rates shown here are contract rates for available work, not guaranteed earnings. Wallet value is created
                only after verified completed work is settled through the financial ledger.
              </p>
            </div>
          </Card>
        </>
      )}

      {!loading && !error && tab === 'Active' && (
        <section>
          <SectionTitle action={`${live.length} current`}>Current deployments</SectionTitle>
          <div className="space-y-3">
            {live.map((deployment) => (
              <Card key={deployment.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-data text-data-sm text-outline">{deployment.id}</p>
                    <h2 className="mt-1 text-title text-on-surface">Deployment {deployment.status}</h2>
                    <p className="mt-1 text-label-sm text-outline">
                      Version {deployment.version}
                      {deployment.scheduledStart
                        ? ` · starts ${new Date(deployment.scheduledStart).toLocaleString()}`
                        : ''}
                    </p>
                  </div>
                  <Badge t={statusTone(deployment.status)}>{deployment.status}</Badge>
                </div>
                <Button to={`/deploy/active/${deployment.id}`} full className="mt-4">
                  Open deployment
                </Button>
              </Card>
            ))}
            {!live.length && (
              <StateView kind="noResults" title="No active deployments" desc="Accepted contracts will appear here." />
            )}
          </div>
        </section>
      )}

      {!loading && !error && tab === 'History' && (
        <section>
          <SectionTitle action={`${history.length} records`}>Deployment history</SectionTitle>
          <div className="space-y-3">
            {history.map((deployment) => (
              <Card key={deployment.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-data text-data-sm text-outline">{deployment.id}</p>
                    <p className="mt-1 text-body-md text-on-surface">{deployment.status}</p>
                  </div>
                  <Badge t={statusTone(deployment.status)}>{deployment.status}</Badge>
                </div>
                <Button to={`/deploy/active/${deployment.id}`} variant="ghost" full className="mt-3">
                  View audit record
                </Button>
              </Card>
            ))}
            {!history.length && (
              <StateView
                kind="noResults"
                title="No deployment history"
                desc="Completed, cancelled or failed deployments will be retained here."
              />
            )}
          </div>
        </section>
      )}
    </AppShell>
  )
}
