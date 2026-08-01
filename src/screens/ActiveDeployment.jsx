import AppShell from '../components/AppShell.jsx'
import RobotAvatar from '../components/RobotAvatar.jsx'
import { Badge, Button, Card, Icon, Progress, SectionTitle, Stat, StatusDot } from '../components/ui.jsx'
import { activeDeployment as d, robot } from '../data/mock.js'

const statuses = ['Online', 'Working', 'Charging', 'Paused', 'Maintenance', 'Offline']

export default function ActiveDeployment() {
  return (
    <AppShell title="Active Deployment" back avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-tertiary/15 blur-[70px]" />
          <div className="relative flex items-center gap-4">
            <RobotAvatar size={80} className="animate-float" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-headline-md text-[20px] text-on-surface">{d.industry}</h2>
              <p className="text-label-sm font-label-sm text-outline">
                {d.role} · {d.client}
              </p>
              <div className="mt-2">
                <StatusDot label={`${robot.name} — ${d.status}`} />
              </div>
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            {statuses.map((s) => (
              <Badge key={s} t={s === d.status ? 'tertiary' : 'outline'}>
                {s}
              </Badge>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle action="This contract">Performance metrics</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Hours Worked" value={d.hours} icon="schedule" t="primary" />
          <Stat label="Tasks Completed" value={d.tasks.toLocaleString()} icon="task_alt" t="tertiary" />
          <Stat label="Success Rate" value={`${d.success}%`} icon="check_circle" t="success" />
          <Stat label="Productivity" value={d.productivity} icon="speed" t="primary" />
          <Stat label="Client Rating" value={d.rating} icon="star" t="secondary" />
          <Stat label="Safety Score" value={d.safety} icon="health_and_safety" t="success" />
        </div>
      </section>

      <section>
        <SectionTitle>Contract progress</SectionTitle>
        <Card className="p-card-padding">
          <div className="mb-2 flex justify-between text-label-sm font-label-sm text-outline">
            <span>Started {d.started}</span>
            <span>{d.duration}</span>
          </div>
          <Progress value={34} />
          <p className="mt-3 text-label-sm font-label-sm text-outline">Day 31 of 90 · {d.location}</p>
        </Card>
      </section>

      <section>
        <SectionTitle>Revenue this contract</SectionTitle>
        <Card className="divide-y divide-white/5">
          {[
            ['Revenue generated', d.revenue, 'text-on-surface'],
            ['Operating deductions', `-${d.deductions.replace('$', '$')}`, 'text-error'],
            ['Net earnings', d.net, 'text-tertiary'],
          ].map(([k, v, cls]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className={`font-label-md text-label-md ${cls}`}>{v}</span>
            </div>
          ))}
        </Card>
        <p className="mt-3 text-label-sm font-label-sm text-outline">
          Confirmed figures only. Pending amounts appear in the wallet until settlement.
        </p>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button to="/wallet" variant="ghost" full icon="account_balance_wallet">
          Open Wallet
        </Button>
        <Button variant="ghost" full icon="pause">
          Pause Deployment
        </Button>
      </div>
    </AppShell>
  )
}
