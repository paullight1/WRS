import { useParams, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import { Badge, Button, Card, Disclosure, Icon, SectionTitle, tone } from '../components/ui.jsx'
import { packages } from '../data/mock.js'

function List({ title, items, icon, t }) {
  const c = tone(t)
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <Card className="divide-y divide-white/5">
        {items.map((f) => (
          <div key={f} className="flex items-center gap-3 px-5 py-3.5">
            <Icon name={icon} className={`${c.text} text-[20px]`} fill />
            <span className="text-body-md text-on-surface-variant">{f}</span>
          </div>
        ))}
      </Card>
    </section>
  )
}

export default function PackageDetail() {
  const { slug } = useParams()
  const p = packages.find((x) => x.slug === slug)
  if (!p) return <Navigate to="/packages" replace />
  const c = tone(p.tone)

  return (
    <AppShell title={`${p.name} Package`} back avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className={`pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full blur-[70px] ${c.bg}`} />
          {p.badge && (
            <Badge t={p.tone} className="relative mb-3">
              {p.badge}
            </Badge>
          )}
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="font-headline-lg text-[38px] font-bold text-on-surface">${p.price.toLocaleString()}</p>
              <p className="text-body-md text-on-surface-variant">{p.robotClass}</p>
              <p className="mt-3 max-w-xs text-body-md leading-relaxed text-outline">{p.bestFor}</p>
            </div>
            <RobotFace tier={p.slug} size={116} animate className="shrink-0" />
          </div>
        </Card>
      </section>

      <List title="What You Get" items={p.features} icon="check_circle" t={p.tone} />
      <List title="Deployment Access" items={p.deployment} icon="rocket_launch" t={p.tone} />
      <List title="Data Contribution Access" items={p.data} icon="dataset" t={p.tone} />

      <section>
        <SectionTitle>Estimated Benefits</SectionTitle>
        <Card className="divide-y divide-white/5">
          {[
            ['Deployment Opportunities', p.benefits.deployment],
            ['Platform Rewards', p.benefits.rewards],
            ['Data Revenue Share', p.benefits.revenue],
            ['Robot Performance', p.benefits.performance],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-body-md text-on-surface">{k}</span>
              <span className={`text-label-md font-label-md ${c.text}`}>{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <div className="space-y-3">
        <Button full size="lg">
          Get Started with ${p.price.toLocaleString()}
        </Button>
        <Button to="/packages" variant="ghost" full size="lg">
          View All Packages
        </Button>
        <Disclosure icon="gavel">
          A package is a platform access tier. It does not guarantee profit, fixed returns, or universal income.
          Earnings depend on verified activity, approved data and real service revenue.
        </Disclosure>
      </div>
    </AppShell>
  )
}
