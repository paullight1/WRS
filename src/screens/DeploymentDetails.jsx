import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Disclosure, Icon, SectionTitle, Toast, tone } from '../components/ui.jsx'
import { industries, robot } from '../data/mock.js'

export default function DeploymentDetails() {
  const { name } = useParams()
  const sector = industries.find((i) => i.name === decodeURIComponent(name || ''))
  const [toast, setToast] = useState('')
  if (!sector) return <Navigate to="/deploy" replace />
  const c = tone(sector.tone)

  const fire = (m) => {
    setToast(m)
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <AppShell title={sector.name} back avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className={`pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full blur-[70px] ${c.bg}`} />
          <div className="relative flex items-center gap-4">
            <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl border ${c.bg} ${c.border}`}>
              <Icon name={sector.icon} className={`${c.text} text-[30px]`} fill />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-headline-md text-[20px] text-on-surface">{sector.name}</h2>
              <p className="text-label-sm font-label-sm text-outline">{sector.desc}</p>
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
        <Card className="divide-y divide-white/5">
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
              <span className="text-right text-label-md font-label-md text-on-surface">{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Revenue breakdown (estimate)</SectionTitle>
        <Card className="divide-y divide-white/5">
          {[
            ['Gross revenue', '$412.60', 'text-on-surface'],
            ['Operating deductions', '-$92.40', 'text-error'],
            ['Net to owner', '$320.20', 'text-tertiary'],
          ].map(([k, v, cls]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className={`font-label-md text-label-md ${cls}`}>{v}</span>
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
