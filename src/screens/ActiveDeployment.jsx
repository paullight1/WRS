import { useParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import { Badge, Button, Card, Progress, SectionTitle, Stat, StatusDot } from '../components/ui.jsx'
import { activeDeployment as legacy, activeDeployments, deploymentHistory, robot } from '../data/mock.js'

const statuses = ['Online', 'Working', 'Charging', 'Paused', 'Maintenance', 'Offline']

export default function ActiveDeployment() {
  const { id } = useParams()
  const past = deploymentHistory.find((x) => x.id === id)
  const live = activeDeployments.find((x) => x.id === id)
  const d = live || past || activeDeployments[0]
  const isHistory = !live && !!past

  return (
    <AppShell title={isHistory ? 'Deployment Record' : 'Active Deployment'} back avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className="relative flex items-center gap-4">
            <RobotFace tier={d.tier || 'professional'} size={80} animate={!isHistory} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-headline-md text-headline-md text-on-surface">{d.title}</h2>
              <p className="text-label-sm text-outline">
                {d.industry}
                {d.client ? ` · ${d.client}` : ''}
              </p>
              <div className="mt-2">
                <StatusDot t={isHistory ? 'outline' : 'success'} label={`${robot.name} — ${d.status}`} />
              </div>
            </div>
          </div>

          {!isHistory && (
            <div className="relative mt-5 flex flex-wrap gap-2">
              {statuses.map((s) => (
                <Badge key={s} t={s === (d.status === 'Active' ? 'Working' : d.status) ? 'tertiary' : 'outline'}>
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle action="This contract">Performance metrics</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Hours Worked" value={d.hours} icon="schedule" t="primary" />
          <Stat label="Tasks Completed" value={d.tasks.toLocaleString()} icon="task_alt" t="tertiary" />
          <Stat label="Performance" value={`${d.performance}%`} icon="check_circle" t="success" />
          <Stat label="Productivity" value={legacy.productivity} icon="speed" t="primary" />
          <Stat label="Client Rating" value={legacy.rating} icon="star" t="secondary" />
          <Stat label="Safety Score" value={legacy.safety} icon="health_and_safety" t="success" />
        </div>
      </section>

      <section>
        <SectionTitle>{isHistory ? 'Contract window' : 'Contract progress'}</SectionTitle>
        <Card className="p-card-padding">
          <div className="mb-2 flex justify-between text-label-sm text-outline">
            <span>{isHistory ? d.period : `Started ${d.since}`}</span>
            <span>{d.location || d.industry}</span>
          </div>
          <Progress value={isHistory ? 100 : d.progress} />
          <p className="mt-3 text-label-sm text-outline">
            {isHistory ? 'Contract closed and settled.' : `${d.progress}% complete · rate ${d.rate}`}
          </p>
        </Card>
      </section>

      <section>
        <SectionTitle>Revenue this contract</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Revenue generated', d.earned, 'text-on-surface'],
            ['Operating deductions', `-${legacy.deductions}`, 'text-error'],
            ['Net earnings', legacy.net, 'text-tertiary'],
          ].map(([k, v, cls]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className={`text-label-md ${cls}`}>{v}</span>
            </div>
          ))}
        </Card>
        <p className="mt-3 text-label-sm text-outline">
          Confirmed figures only. Pending amounts appear in the wallet until settlement.
        </p>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button to="/wallet" variant="ghost" full icon="account_balance_wallet">
          Open Wallet
        </Button>
        {isHistory ? (
          <Button to="/deploy" variant="ghost" full icon="replay">
            Deploy Again
          </Button>
        ) : (
          <Button variant="ghost" full icon="pause">
            Pause Deployment
          </Button>
        )}
      </div>
    </AppShell>
  )
}
