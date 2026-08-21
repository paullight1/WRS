import { useParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import Worksite3D from '../components/robot3d/Worksite3D.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Progress, SectionTitle, Stat, StatusDot } from '../components/ui.jsx'
import { activeDeployment as legacy, activeDeployments, deploymentHistory, robot } from '../data/mock.js'
import { worksiteFor } from '../data/worksites.js'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

export default function ActiveDeployment() {
  const { id } = useParams()
  const pausePolicy = getSensitiveActionPolicy('deployment.pause')
  const past = id ? deploymentHistory.find((x) => x.id === id) : null
  const live = id ? activeDeployments.find((x) => x.id === id) : activeDeployments[0]
  const d = live || past

  if (!d) {
    return (
      <AppShell title="Deployment not found" back avatar={false}>
        <StateView
          kind="noResults"
          title="This deployment record is unavailable"
          desc="WRS does not substitute another deployment when an ID is unknown or unauthorized."
          action={<Button to="/deploy">Back to deployments</Button>}
        />
      </AppShell>
    )
  }

  const isHistory = !live && !!past
  const site = worksiteFor(d.industry)

  if (!runtimeConfig.isDemo && !pausePolicy.authoritative) {
    return <AppShell title="Deployment monitoring unavailable" back avatar={false}><StateView kind="locked" title="Live deployment telemetry is not connected" desc="WRS hides mock hours, performance, client ratings and earnings outside demo mode until the deployment service is authoritative." action={<Button to="/deploy">Back to deployments</Button>} /></AppShell>
  }

  return (
    <AppShell title={isHistory ? 'Deployment record demo' : 'Active deployment demo'} back avatar={false}>
      <section><Card className="relative overflow-hidden p-0"><Worksite3D industry={d.industry} height={200} label={`${robot.name} demo in ${site.name} — ${site.task}`} /><div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-black/50 p-4"><p className="truncate text-label-sm text-on-surface-variant">{site.task}</p><Badge t="outline">Demo telemetry</Badge></div></Card></section>
      <section><Card className="p-card-padding"><div className="flex items-center gap-4"><RobotFace tier={d.tier || 'professional'} size={80} animate={!isHistory} className="shrink-0" /><div className="min-w-0 flex-1"><h2 className="truncate font-headline-md text-headline-md text-on-surface">{d.title}</h2><p className="text-label-sm text-outline">{d.industry} · illustrative record</p><div className="mt-2"><StatusDot t="outline" label={`${robot.name} — demo ${d.status}`} /></div></div></div></Card></section>

      <section><SectionTitle action="Illustrative">Performance metrics</SectionTitle><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Stat label="Demo hours" value={d.hours} icon="schedule" t="primary" /><Stat label="Demo tasks" value={d.tasks.toLocaleString()} icon="task_alt" t="tertiary" /><Stat label="Demo performance" value={`${d.performance}%`} icon="check_circle" t="success" /><Stat label="Demo productivity" value={legacy.productivity} icon="speed" t="primary" /><Stat label="Demo rating" value={legacy.rating} icon="star" t="secondary" /><Stat label="Demo safety" value={legacy.safety} icon="health_and_safety" t="success" /></div></section>

      <section><SectionTitle>Illustrative contract progress</SectionTitle><Card className="p-card-padding"><Progress value={isHistory ? 100 : d.progress} /><p className="mt-3 text-label-sm text-outline">No live contract state is connected.</p></Card></section>
      <section><SectionTitle>Illustrative revenue</SectionTitle><Card className="p-card-padding"><p className="text-body-md text-on-surface-variant">Displayed revenue and deductions are demo values only and are not confirmed, payable or settled.</p></Card></section>

      <div className="grid gap-2 sm:grid-cols-2"><Button to="/wallet" variant="ghost" full>Open demo wallet</Button><Button variant="ghost" full icon="pause" disabled={!pausePolicy.enabled}>Pause unavailable in demo</Button></div>
    </AppShell>
  )
}
