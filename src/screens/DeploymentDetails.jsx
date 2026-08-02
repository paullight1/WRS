import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Disclosure, Icon, SectionTitle, Toast, tone, IconTile } from '../components/ui.jsx'
import { industries, robot, ownerTier, unlocked } from '../data/mock.js'
import StateView from '../components/states/StateView.jsx'

export default function DeploymentDetails() {
  const { name } = useParams()
  const sector = industries.find((i) => i.name === decodeURIComponent(name || ''))
  const [toast, setToast] = useState('')
  if (!sector) return <Navigate to="/deploy" replace />
  const c = tone(sector.tone)
  const open = unlocked(sector.requires)

  /* Locked sectors are still reachable on purpose: being told why, and what
     would change it, is more use than a row that refuses to respond. */
  if (!open) {
    return (
      <AppShell title={sector.name} back avatar={false}>
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
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className="relative flex items-center gap-4">
            <IconTile icon={sector.icon} accent={c.accent} size={64} radius={12} iconSize={30} />
            <div className="min-w-0">
              <h2 className="truncate font-headline-md text-headline-md text-on-surface">{sector.name}</h2>
              <p className="text-label-sm text-outline">{sector.desc}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge t="tertiary">Available</Badge>
                <Badge t="primary">Demand {sector.demand}</Badge>
              </div>
            </div>
          </div>
        </Card>
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
