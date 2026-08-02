import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import { Badge, Button, Card, Field, Icon, Progress, SectionTitle, tone, IconTile } from '../components/ui.jsx'
import { industries, robot, activeDeployments, deploymentHistory, deploymentSummary } from '../data/mock.js'

const STATUS_TONE = {
  Active: 'success',
  Paused: 'gold',
  Completed: 'tertiary',
  'Ended early': 'outline',
}

/* Metric strip shared by active + history cards. */
function Metrics({ items }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/8 py-3.5">
      {items.map(([k, v, cls = 'text-on-surface']) => (
        <div key={k} className="text-center">
          <p className="text-[11px] text-outline">{k}</p>
          <p className={`text-title font-bold ${cls}`}>{v}</p>
        </div>
      ))}
    </div>
  )
}

function DeploymentCard({ d, history = false }) {
  const t = tone(STATUS_TONE[d.status] || 'tertiary')
  return (
    <Card
      className={`relative overflow-hidden p-4 ${
        d.status === 'Active' ? 'border-success/25 bg-success/[.04]' : ''
      }`}
    >
      <div className="relative flex items-start gap-3.5">
        <RobotFace tier={d.tier} size={56} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-title font-semibold text-on-surface">{d.title}</h3>
            <Badge t={STATUS_TONE[d.status] || 'tertiary'}>
              {d.status === 'Active' && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              {d.status}
            </Badge>
          </div>
          <p className="truncate text-label-sm text-outline">{d.industry}</p>
          <p className="mt-1.5 text-label-sm text-on-surface-variant">
            {history ? d.period : `Since: ${d.since}`}
          </p>
        </div>
      </div>

      <Metrics
        items={[
          ['Hours Worked', d.hours],
          ['Tasks Completed', d.tasks],
          ['Performance', `${d.performance}%`, 'text-success'],
        ]}
      />

      {!history && (
        <div className="mb-4 mt-3">
          <div className="mb-1.5 flex justify-between text-label-sm text-outline">
            <span>Contract progress</span>
            <span>{d.progress}%</span>
          </div>
          <Progress value={d.progress} height="h-1.5" showShimmer={false} />
        </div>
      )}

      <Button
        to={`/deploy/active/${d.id}`}
        full
        variant={history ? 'ghost' : 'primary'}
        className={history ? 'mt-3' : ''}
      >
        View Details
      </Button>
    </Card>
  )
}

export default function Deploy() {
  const [tab, setTab] = useState('Active')
  const [q, setQ] = useState('')
  const list = industries.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <AppShell title="Deployments" subtitle={`${robot.name} · ${robot.robotClass}`}>
      {/* ------------------------------------------------------- area tabs */}
      <div className="surface sticky top-[68px] z-30 flex gap-1 rounded-2xl p-1">
        {['Available', 'Active', 'History'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-label-md transition-all ${
              tab === t
                ? 'border border-primary/60 bg-primary-container/25 text-primary shadow-[0_0_18px_rgba(45,91,255,.25)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* --------------------------------------------------------- available */}
      {tab === 'Available' && (
        <>
          <section>
            <div className="mb-2 flex items-center gap-2">
              <Icon name="rocket_launch" className="text-[20px] text-tertiary" />
              <span className="text-label-sm text-tertiary">
                Deployment Console
              </span>
            </div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              Choose where your robot can work
            </h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Select an industry sector to assign your {robot.name} unit for active operation.
            </p>
          </section>

          <Field placeholder="Search industries…" icon="search" value={q} onChange={(e) => setQ(e.target.value)} />

          <section>
            <SectionTitle action={`${list.length} sectors`}>Available sectors</SectionTitle>
            <div className="space-y-2">
              {list.map((s) => {
                const c = tone(s.tone)
                return (
                  <Link
                    key={s.name}
                    to={`/deploy/${encodeURIComponent(s.name)}`}
                    className="surface group flex items-center justify-between gap-4 rounded-2xl p-4 transition-all hover:border-tertiary/40 active:scale-[.99]"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <IconTile icon={s.icon} accent={c.accent} size={56} radius={12} iconSize={26} />
                      <div className="min-w-0">
                        <h3 className="truncate text-title text-on-surface group-hover:text-tertiary">
                          {s.name}
                        </h3>
                        <p className="truncate text-label-sm text-outline">{s.desc}</p>
                        <p className="text-label-sm text-on-surface-variant">
                          Demand: {s.demand} · {s.rate}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge t="tertiary">
                        <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> Available
                      </Badge>
                      <Icon name="chevron_right" className="text-outline transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                )
              })}
              {!list.length && (
                <Card className="p-8 text-center">
                  <Icon name="search_off" className="text-[30px] text-outline" />
                  <p className="mt-2 text-body-md text-outline">No sector matches "{q}".</p>
                </Card>
              )}
            </div>
          </section>

          <div>
            <Button full size="lg" trailingIcon="send">
              Request Deployment
            </Button>
            <p className="mt-3 text-center text-label-sm text-outline">
              Average estimated earnings: $15.50 / hour — estimate only, not a guarantee.
            </p>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------ active */}
      {tab === 'Active' && (
        <>
          <section className="grid grid-cols-3 gap-3">
            {deploymentSummary.map((s) => {
              const c = tone(s.tone)
              return (
                <Card key={s.label} className="p-3.5 text-center">
                  <Icon name={s.icon} className={`${c.text} text-[20px]`} fill />
                  <p className="mt-1 font-headline-md text-headline-md text-on-surface">{s.value}</p>
                  <p className="text-[11px] leading-tight text-outline">{s.label}</p>
                </Card>
              )
            })}
          </section>

          <section className="space-y-3">
            {activeDeployments.map((d) => (
              <DeploymentCard key={d.id} d={d} />
            ))}
          </section>

          <Button variant="ghost" full size="lg" icon="add" onClick={() => setTab('Available')}>
            Deploy Another Robot
          </Button>
        </>
      )}

      {/* ----------------------------------------------------------- history */}
      {tab === 'History' && (
        <>
          <section>
            <SectionTitle action={`${deploymentHistory.length} records`}>Past deployments</SectionTitle>
            <div className="space-y-3">
              {deploymentHistory.map((d) => (
                <DeploymentCard key={d.id} d={d} history />
              ))}
            </div>
          </section>

          <Card className="p-card-padding">
            <p className="text-label-sm text-outline">Lifetime totals</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                ['Contracts', '5'],
                ['Hours', '444.4'],
                ['Earned', '$6,420.43'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="font-headline-md text-headline-md text-tertiary">{v}</p>
                  <p className="text-label-sm text-outline">{k}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </AppShell>
  )
}
