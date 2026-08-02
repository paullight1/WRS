import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import Worksite3D from '../components/robot3d/Worksite3D.jsx'
import { Badge, Button, Card, Disclosure, Icon, SectionTitle, Toast, tone, IconTile } from '../components/ui.jsx'
import { industries, robot, ownerTier, unlocked } from '../data/mock.js'
import { worksiteFor } from '../data/worksites.js'
import StateView from '../components/states/StateView.jsx'

export default function DeploymentDetails() {
  const { name } = useParams()
  const sector = industries.find((i) => i.name === decodeURIComponent(name || ''))
  const [toast, setToast] = useState('')
  if (!sector) return <Navigate to="/deploy" replace />
  const c = tone(sector.tone)
  const site = worksiteFor(sector.name)
  const open = unlocked(sector.requires)

  /* Locked sectors are still reachable on purpose: being told why, and what
     would change it, is more use than a row that refuses to respond. */
  if (!open) {
    return (
      <AppShell title={sector.name} back avatar={false}>
        {/* Locked still shows the worksite. Being told what the sector *is* is
            the whole argument for upgrading into it — a padlock alone is not. */}
        <section>
          <Card className="relative overflow-hidden p-0">
            <Worksite3D industry={sector.name} height={196} className="opacity-80" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface via-surface/75 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
              <p className="truncate text-label-sm text-outline">{site.task}</p>
              <Badge t="gold">
                <Icon name="lock" className="text-[14px]" />
                {sector.requires}
              </Badge>
            </div>
          </Card>
        </section>

        <StateView
          kind="locked"
          title={`${sector.name} needs the ${sector.requires} package`}
          desc={`Your robot is on ${ownerTier}. This sector requires ${sector.requires} or higher — it covers regulated and higher-risk work, so the robot class has to match.`}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button to="/packages">Compare packages</Button>
              <Button variant="ghost" to="/deploy">
                Other sectors
              </Button>
            </div>
          }
        />
      </AppShell>
    )
  }

  const fire = (m) => {
    setToast(m)
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <AppShell title={sector.name} back avatar={false}>
      {/* The sector, shown rather than described: the robot doing this sector's
          work, in this sector's setting. */}
      <section>
        <Card className="relative overflow-hidden p-0">
          <Worksite3D industry={sector.name} height={224} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3.5 p-4">
            <IconTile icon={sector.icon} accent={c.accent} size={52} radius={12} iconSize={26} />
            <div className="min-w-0 flex-1">
              <p className="text-label-sm text-outline">{site.task}</p>
              <h2 className="truncate font-headline-md text-headline-md text-on-surface">{sector.name}</h2>
            </div>
          </div>
        </Card>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge t="tertiary">Available</Badge>
          <Badge t="primary">Demand {sector.demand}</Badge>
          <Badge t="outline">{sector.desc}</Badge>
        </div>
      </section>

      <section>
        <SectionTitle>Assignment details</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Robot role', 'Operations Assistant'],
            ['Assigned unit', robot.name],
            ['Location', 'Lagos Hub 4'],
            ['Start date', '05 Aug 2025'],
            ['Working hours', '6 hours / day'],
            ['Contract duration', '90 days'],
            ['Required robot class', 'Professional or higher'],
            ['Required skills', 'Inventory scan, safety protocol'],
            ['Performance requirement', 'Success rate ≥ 90%'],
            ['Operating conditions', 'Indoor, climate controlled'],
            ['Potential revenue category', sector.rate],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="text-right text-label-md text-on-surface">{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Revenue breakdown (estimate)</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Gross revenue', '$412.60', 'text-on-surface'],
            ['Operating deductions', '-$92.40', 'text-error'],
            ['Net to owner', '$320.20', 'text-tertiary'],
          ].map(([k, v, cls]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className={`text-label-md ${cls}`}>{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button full className="sm:col-span-2" onClick={() => fire('Deployment request submitted')}>
          Confirm Deployment
        </Button>
        <Button variant="ghost" full icon="description" onClick={() => fire('Contract opened')}>
          View Contract
        </Button>
        <Button variant="ghost" full icon="swap_horiz" onClick={() => fire('Reassignment requested')}>
          Request Reassignment
        </Button>
      </div>

      <Disclosure icon="info">
        Deployment availability depends on customer demand, operational capacity and your robot's verified capabilities.
        All revenue figures shown are estimates until confirmed.
      </Disclosure>

      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
