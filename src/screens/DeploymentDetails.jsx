import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import Worksite3D from '../components/robot3d/Worksite3D.jsx'
import { Badge, Button, Card, Disclosure, Icon, SectionTitle, Toast, tone, IconTile } from '../components/ui.jsx'
import { industries, robot, ownerTier, unlocked } from '../data/mock.js'
import { worksiteFor } from '../data/worksites.js'
import StateView from '../components/states/StateView.jsx'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

export default function DeploymentDetails() {
  const { name } = useParams()
  const sector = industries.find((i) => i.name === decodeURIComponent(name || ''))
  const policy = getSensitiveActionPolicy('deployment.request')
  const [toast, setToast] = useState('')
  if (!sector) return <Navigate to="/deploy" replace />

  if (!runtimeConfig.isDemo && !policy.authoritative) {
    return (
      <AppShell title="Deployment unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live deployment service is not connected"
          desc="Mock contracts, rates and assignment records are hidden outside demo mode. WRS will not create a deployment until eligibility, customer demand, contract and audit services are authoritative."
          action={<Button to="/deploy">Back to deployments</Button>}
        />
      </AppShell>
    )
  }

  const c = tone(sector.tone)
  const site = worksiteFor(sector.name)
  const open = unlocked(sector.requires)
  const fire = (m) => {
    setToast(m)
    setTimeout(() => setToast(''), 2400)
  }

  if (!open) {
    return (
      <AppShell title={`${sector.name} demo`} back avatar={false}>
        <section>
          <Card className="relative overflow-hidden p-0">
            <Worksite3D industry={sector.name} height={196} className="opacity-80" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-black/50 p-4">
              <p className="truncate text-label-sm text-outline">{site.task}</p>
              <Badge t="gold">
                <Icon name="lock" className="text-[14px]" /> {sector.requires}
              </Badge>
            </div>
          </Card>
        </section>
        <StateView
          kind="locked"
          title={`${sector.name} needs the ${sector.requires} package`}
          desc={`Demo eligibility: ${ownerTier} does not meet the ${sector.requires} requirement.`}
          action={<Button to="/packages">Compare packages</Button>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell title={`${sector.name} deployment demo`} back avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-0">
          <Worksite3D industry={sector.name} height={224} />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3.5 bg-black/50 p-4">
            <IconTile icon={sector.icon} accent={c.accent} size={52} radius={12} iconSize={26} />
            <div className="min-w-0 flex-1">
              <p className="text-label-sm text-outline">{site.task}</p>
              <h2 className="truncate font-headline-md text-headline-md text-on-surface">{sector.name}</h2>
            </div>
          </div>
        </Card>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge t="outline">Demo opportunity</Badge>
          <Badge t="primary">Illustrative demand {sector.demand}</Badge>
          <Badge t="outline">{sector.desc}</Badge>
        </div>
      </section>

      <section>
        <SectionTitle>Illustrative assignment</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Robot role', 'Operations Assistant'],
            ['Demo unit', robot.name],
            ['Location', 'Sample worksite'],
            ['Start date', 'Not scheduled — demo'],
            ['Working hours', 'Illustrative 6 hours / day'],
            ['Contract duration', 'Illustrative 90 days'],
            ['Required robot class', sector.requires],
            ['Potential rate', `${sector.rate} illustrative`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="text-right text-label-md text-on-surface">{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Illustrative revenue only</SectionTitle>
        <Card className="p-card-padding">
          <p className="text-body-md text-on-surface-variant">
            No gross revenue, deductions, owner earnings or settlement is created by this preview.
          </p>
        </Card>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          full
          className="sm:col-span-2"
          disabled={!policy.enabled}
          onClick={() => fire('Demo deployment preview — no request or contract was created')}
        >
          Preview deployment
        </Button>
        <Button
          variant="ghost"
          full
          icon="description"
          onClick={() => fire('Demo contract preview — no legal contract exists')}
        >
          Preview contract
        </Button>
        <Button
          variant="ghost"
          full
          icon="swap_horiz"
          onClick={() => fire('Demo reassignment preview — no request was created')}
        >
          Preview reassignment
        </Button>
      </div>
      <Disclosure icon="info">
        Demo only. Live deployment requires authoritative eligibility, contract state, telemetry and settlement.
      </Disclosure>
      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
