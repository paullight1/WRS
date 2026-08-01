import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Field, Icon, SectionTitle, tone } from '../components/ui.jsx'
import { industries, robot, activeDeployment } from '../data/mock.js'

export default function Deploy() {
  const [q, setQ] = useState('')
  const list = industries.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <AppShell title="Robot Deployment">
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Icon name="rocket_launch" className="text-tertiary text-[20px]" />
          <span className="text-label-sm font-label-sm uppercase tracking-wider text-tertiary">Deployment Console</span>
        </div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          Choose where your robot can work
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Select an industry sector to assign your {robot.name} unit for active operation.
        </p>
      </section>

      {/* --------------------------------------------------- active summary */}
      <Link to="/deploy/active" className="block">
        <Card className="flex items-center gap-4 p-4 transition-all hover:border-tertiary/40">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-tertiary/20 bg-tertiary/10">
            <Icon name="monitoring" className="text-tertiary" fill />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-md text-on-surface">Active: {activeDeployment.industry}</p>
            <p className="text-label-sm font-label-sm text-outline">
              {activeDeployment.role} · {activeDeployment.status}
            </p>
          </div>
          <Icon name="chevron_right" className="text-outline" />
        </Card>
      </Link>

      <Field
        placeholder="Search industries…"
        icon="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <section>
        <SectionTitle action={`${list.length} sectors`}>Available sectors</SectionTitle>
        <div className="space-y-2">
          {list.map((s) => {
            const c = tone(s.tone)
            return (
              <Link
                key={s.name}
                to={`/deploy/${encodeURIComponent(s.name)}`}
                className="glass group flex items-center justify-between gap-4 rounded-2xl p-4 transition-all hover:border-tertiary/40 active:scale-[.99]"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border ${c.bg} ${c.border}`}>
                    <Icon name={s.icon} className={`${c.text} text-[26px]`} fill />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-headline-md text-[16px] text-on-surface group-hover:text-tertiary">
                      {s.name}
                    </h3>
                    <p className="truncate text-label-sm font-label-sm text-outline">{s.desc}</p>
                    <p className="text-label-sm font-label-sm text-on-surface-variant">
                      Demand: {s.demand} · {s.rate}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge t="tertiary">
                    <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-tertiary" /> Available
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
        <p className="mt-3 text-center text-label-sm font-label-sm text-outline">
          Average estimated earnings: $15.50 / hour — estimate only, not a guarantee.
        </p>
      </div>
    </AppShell>
  )
}
