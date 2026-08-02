import AppShell from '../components/AppShell.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import { Badge, Button, Card, Icon, SectionTitle } from '../components/ui.jsx'
import { robot, user } from '../data/mock.js'

const rows = [
  ['Robot ID', robot.id],
  ['Robot Name', robot.name],
  ['Owner Name', user.name],
  ['Ownership Package', robot.package],
  ['Activation Date', robot.activationDate],
  ['AI Version', robot.aiVersion],
  ['Performance Score', `${robot.performance}%`],
  ['Data Contribution Score', `${robot.dataQuality}%`],
  ['Robot Reputation', robot.reputation],
  ['Current Career Level', robot.career],
]

const skills = ['Warehouse Ops', 'Customer Support', 'Inventory Scan', 'Route Planning', 'Safety Protocol', 'Report Writing']
const certs = ['Logistics Level 2', 'Workplace Safety', 'Data Handling']
const history = [
  { role: 'Warehouse Assistant', org: 'NorthChain Distribution', period: 'Jul 2025 — present', state: 'Active' },
  { role: 'Retail Support Unit', org: 'Kano Retail Group', period: 'Apr — Jun 2025', state: 'Completed' },
  { role: 'Data Ops Trainee', org: 'WRS Internal', period: 'Mar 2025', state: 'Completed' },
]

export default function RobotPassport() {
  return (
    <AppShell title="Robot Passport" back avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px grad-line" />

          <div className="relative flex items-center gap-4">
            <Robot3D size={84} label={`${robot.name}, ${robot.id}`} />
            <div className="min-w-0">
              <p className="text-label-sm text-outline">
                World Robotic System
              </p>
              <h2 className="font-headline-md text-headline-md text-on-surface">{robot.name}</h2>
              <p className="text-label-sm text-tertiary">{robot.id}</p>
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            <Badge t="tertiary">Verified</Badge>
            <Badge t="primary">{robot.robotClass}</Badge>
            <Badge t="secondary">Level {robot.level}</Badge>
          </div>

          <div className="relative mt-5 rounded-xl border border-white/8 bg-black/25 p-3">
            <p className="break-all font-data text-data-sm leading-relaxed text-outline">
              WRS&lt;&lt;{robot.id.replace(/-/g, '')}&lt;&lt;{user.wrsId}&lt;&lt;PRO&lt;&lt;LVL10&lt;&lt;
              {robot.aiVersion.replace(/[ .]/g, '')}
            </p>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Identity record</SectionTitle>
        <Card className="divide-y divide-white/8">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="text-right text-label-md text-on-surface">{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Skills installed</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-label-sm text-on-surface-variant"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Industry certifications</SectionTitle>
        <div className="space-y-2">
          {certs.map((c) => (
            <div key={c} className="surface flex items-center gap-3 rounded-2xl p-3.5">
              <Icon name="workspace_premium" className="text-tertiary" fill />
              <span className="flex-1 text-body-md text-on-surface">{c}</span>
              <Icon name="verified" className="text-[18px] text-tertiary" fill />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Deployment history</SectionTitle>
        <div className="space-y-2">
          {history.map((h) => (
            <Card key={h.role} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-body-md text-on-surface">{h.role}</p>
                  <p className="text-label-sm text-outline">{h.org}</p>
                </div>
                <Badge t={h.state === 'Active' ? 'tertiary' : 'outline'}>{h.state}</Badge>
              </div>
              <p className="mt-2 text-label-sm text-outline">{h.period}</p>
            </Card>
          ))}
        </div>
      </section>

      <Button variant="ghost" full icon="download">
        Download Passport (PDF)
      </Button>
    </AppShell>
  )
}
